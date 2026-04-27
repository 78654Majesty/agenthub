import test from "node:test";
import assert from "node:assert/strict";

import { MockX402Client, RealX402Client, WalletBackedX402Client, createRealSvmX402Client } from "./x402-client";
import type { ClientSvmSigner } from "@x402/svm";

function createMockSvmSigner(address: string): ClientSvmSigner {
  return {
    address,
    async signTransactions() {
      return [];
    },
  } as unknown as ClientSvmSigner;
}

test("mock x402 client returns a deterministic paid execution result", async () => {
  const client = new MockX402Client();

  const result = await client.executeWithPayment("https://agent-1.example.com", {
    task: "reply to my customer",
  });

  assert.deepEqual(result, {
    result: "MOCK_AGENT_RESULT: reply to my customer",
    txSignature: "mock-tx-signature",
    payer: "mock-wallet-payer",
    amount: 1_000_000,
    network: "solana:devnet",
  });
});

test("real x402 client posts task payload and maps payment response header", async () => {
  const client = new RealX402Client({
    async paidFetch(input, init) {
      assert.equal(input, "https://agent.example.com/run");
      assert.equal(init?.method, "POST");
      assert.equal((init?.headers as Record<string, string>)["content-type"], "application/json");
      assert.deepEqual(JSON.parse(String(init?.body)), {
        task: "reply to my customer",
      });

      return new Response(
        JSON.stringify({
          result: "Drafted response",
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
            "payment-response": "encoded-payment-response",
          },
        },
      );
    },
    decodePaymentResponseHeader(header) {
      assert.equal(header, "encoded-payment-response");
      return {
        success: true,
        payer: "wallet-123",
        transaction: "tx-123",
        network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
        amount: "1500000",
      };
    },
  });

  const result = await client.executeWithPayment("https://agent.example.com/run", {
    task: "reply to my customer",
  });

  assert.deepEqual(result, {
    result: "Drafted response",
    txSignature: "tx-123",
    payer: "wallet-123",
    amount: 1_500_000,
    network: "solana:devnet",
  });
});

test("real x402 client fails when payment response header is missing", async () => {
  const client = new RealX402Client({
    async paidFetch() {
      return new Response(
        JSON.stringify({
          result: "Drafted response",
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    },
  });

  await assert.rejects(
    () => client.executeWithPayment("https://agent.example.com/run", { task: "reply" }),
    /Missing PAYMENT-RESPONSE header/,
  );
});

test("real x402 client rejects non-devnet x402 networks", async () => {
  const client = new RealX402Client({
    async paidFetch() {
      return new Response(JSON.stringify({ result: "ok" }), {
        status: 200,
        headers: {
          "payment-response": "encoded-payment-response",
        },
      });
    },
    decodePaymentResponseHeader() {
      return {
        success: true,
        payer: "wallet-123",
        transaction: "tx-123",
        network: "solana:mainnet",
      };
    },
  });

  await assert.rejects(
    () => client.executeWithPayment("https://agent.example.com/run", { task: "hello" }),
    /Unsupported x402 network solana:mainnet/,
  );
});

test("real x402 client includes endpoint and response body when the paid request returns 500", async () => {
  const client = new RealX402Client({
    async paidFetch() {
      return new Response(JSON.stringify({ detail: "facilitator init failed" }), {
        status: 500,
        headers: {
          "content-type": "application/json",
        },
      });
    },
  });

  await assert.rejects(
    () => client.executeWithPayment("http://127.0.0.1:9000/v1/execute", { task: "hello" }),
    /x402 paid request failed with 500 from http:\/\/127\.0\.0\.1:9000\/v1\/execute: {"detail":"facilitator init failed"}/,
  );
});

test("createRealSvmX402Client builds a paid fetch with the SVM signer", async () => {
  const signer = createMockSvmSigner("wallet-123");
  let capturedNetwork = "";
  let capturedRpcUrl = "";

  const client = createRealSvmX402Client({
    signer,
    rpcUrl: "https://rpc.example.com",
    baseFetch: async () => new Response(JSON.stringify({ result: "ok" })),
    createSvmScheme(receivedSigner, config) {
      assert.equal(receivedSigner, signer);
      capturedRpcUrl = config?.rpcUrl ?? "";
      return { scheme: "exact" };
    },
    wrapFetchWithPaymentFromConfig(_fetchImpl, config) {
      capturedNetwork = String(config.schemes[0]?.network ?? "");
      return async () =>
        new Response(JSON.stringify({ result: "ok" }), {
          headers: {
            "payment-response": "encoded",
          },
        });
    },
    decodePaymentResponseHeader() {
      return {
        success: true,
        payer: "wallet-123",
        transaction: "tx-123",
        network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
      };
    },
  });

  const result = await client.executeWithPayment("https://agent.example.com/run", { task: "hello" });

  assert.equal(capturedNetwork, "solana:*");
  assert.equal(capturedRpcUrl, "https://rpc.example.com");
  assert.equal(result.txSignature, "tx-123");
});

test("wallet backed x402 client creates the real client lazily from the wallet signer", async () => {
  let signerRequests = 0;
  const client = new WalletBackedX402Client({
    walletBridge: {
      async getSvmSigner() {
        signerRequests += 1;
        return createMockSvmSigner("wallet-123");
      },
    },
    createClient(signer) {
      assert.equal(String(signer.address), "wallet-123");
      return {
        async executeWithPayment(endpointUrl, payload) {
          assert.equal(endpointUrl, "https://agent.example.com/run");
          assert.deepEqual(payload, { task: "hello" });
          return {
            result: "ok",
            txSignature: "tx-123",
            payer: "wallet-123",
            amount: 1,
            network: "solana:devnet",
          };
        },
      };
    },
  });

  const result = await client.executeWithPayment("https://agent.example.com/run", { task: "hello" });

  assert.equal(signerRequests, 1);
  assert.equal(result.txSignature, "tx-123");
});

test("wallet backed x402 client preserves the underlying payment payload failure reason", async () => {
  const client = new WalletBackedX402Client({
    walletBridge: {
      async getSvmSigner() {
        return createMockSvmSigner("wallet-123");
      },
    },
    createClient() {
      return {
        async executeWithPayment() {
          throw new Error(
            "Failed to create payment payload: RPC timeout while simulating payment transaction",
          );
        },
      };
    },
  });

  await assert.rejects(
    () => client.executeWithPayment("https://agent.example.com/run", { task: "hello" }),
    /Failed to create payment payload: RPC timeout while simulating payment transaction/,
  );
});

test("wallet backed x402 client annotates payment payload failures with endpoint and rpc", async () => {
  const client = new WalletBackedX402Client({
    walletBridge: {
      async getSvmSigner() {
        return createMockSvmSigner("wallet-123");
      },
    },
    rpcUrl: "https://devnet.helius-rpc.com/?api-key=ea3297f1-582d-4b7d-b287-ecd5c8b05ecb",
    createClient() {
      return {
        async executeWithPayment() {
          throw new Error("Failed to create payment payload: facilitator handshake failed");
        },
      };
    },
  });

  await assert.rejects(
    () => client.executeWithPayment("http://127.0.0.1:9000/v1/execute", { task: "hello" }),
    /x402 execution failed for http:\/\/127\.0\.0\.1:9000\/v1\/execute via rpc https:\/\/devnet\.helius-rpc\.com\/\?api-key=ea3297f1-582d-4b7d-b287-ecd5c8b05ecb: Failed to create payment payload: facilitator handshake failed/,
  );
});
