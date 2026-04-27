import test from "node:test";
import assert from "node:assert/strict";

import {
  createDefaultX402Client,
  createMatchCapabilityHandler,
  createRunAgentTaskHandler,
  createWalletFaucetHandler,
  createWalletConnectHandler,
  createWalletStatusHandler,
} from "./tools";
import type { ClientSvmSigner } from "@x402/svm";

function createMockSvmSigner(address: string): ClientSvmSigner {
  return {
    address,
    async signTransactions() {
      return [];
    },
  } as unknown as ClientSvmSigner;
}

test("wallet_connect creates a local wallet, authenticates, and caches the JWT", async () => {
  let cachedToken: string | null = null;
  let createdWallets = 0;

  const wallet = {
    publicKey: "test-wallet-pubkey",
    signMessage: async (message: string) => `signed:${message}`,
    getSvmSigner: async () => createMockSvmSigner("test-wallet-pubkey"),
  };

  const handler = createWalletConnectHandler({
    walletBridge: {
      async connectWallet() {
        createdWallets += 1;
        return {
          wallet,
          isNew: true,
        };
      },
      async getStatus() {
        return {
          connected: true,
          walletPubkey: wallet.publicKey,
          network: "solana:devnet" as const,
        };
      },
      async signMessage(message: string) {
        return wallet.signMessage(message);
      },
      async getSvmSigner() {
        return wallet.getSvmSigner();
      },
    },
    gatewayClient: {
      async getChallenge(pubkey) {
        assert.equal(pubkey, wallet.publicKey);
        return { challenge: "agenthub:login:test", nonce: "nonce-1", expiresIn: 300 };
      },
      async verifyChallenge(payload) {
        assert.deepEqual(payload, {
          wallet: wallet.publicKey,
          signature: "signed:agenthub:login:test",
        });

        return {
          token: "jwt-token",
          walletPubkey: wallet.publicKey,
          expiresIn: 3600,
        };
      },
    },
    sessionStore: {
      setToken(token) {
        cachedToken = token;
      },
      getToken() {
        return cachedToken;
      },
    },
  });

  const result = await handler();

  assert.equal(createdWallets, 1);
  assert.equal(cachedToken, "jwt-token");
  assert.deepEqual(result, {
    walletPubkey: wallet.publicKey,
    tokenCached: true,
    network: "solana:devnet",
    isNew: true,
  });
});

test("wallet_status returns the current wallet connection state", async () => {
  const handler = createWalletStatusHandler({
    walletBridge: {
      async getStatus() {
        return {
          connected: true,
          walletPubkey: "test-wallet-pubkey",
          network: "solana:devnet",
        };
      },
    },
    sessionStore: {
      setToken() {},
      getToken() {
        return "jwt-token";
      },
    },
  });

  const result = await handler();

  assert.deepEqual(result, {
    connected: true,
    walletPubkey: "test-wallet-pubkey",
    network: "solana:devnet",
    tokenCached: true,
  });
});

test("match_capability returns a protected agent match result", async () => {
  const handler = createMatchCapabilityHandler({
    sessionStore: {
      setToken() {},
      getToken() {
        return "jwt-token";
      },
    },
    gatewayClient: {
      async matchAgent(input, token) {
        assert.equal(token, "jwt-token");
        assert.deepEqual(input, {
          task: "summarize invoices",
          maxPriceUsdc: 2,
          tags: ["finance", "summary"],
        });

        return {
          top: {
            agentId: "agent-1",
            name: "Invoice Summarizer",
            description: "Summarizes invoice batches",
            endpointUrl: "https://agent-1.example.com",
            priceUsdcMicro: 1_500_000,
            ratingAvg: 4.8,
            capabilityTags: ["finance", "summary"],
          },
          alternatives: [
            {
              agentId: "agent-2",
              name: "Backup Summarizer",
              description: "Backup invoice summarizer",
              endpointUrl: "https://agent-2.example.com",
              priceUsdcMicro: 1_900_000,
              ratingAvg: 4.4,
              capabilityTags: ["finance"],
            },
          ],
          reason: "Matched by tags and price ceiling.",
        };
      },
    },
  });

  const result = await handler({
    task: "summarize invoices",
    maxPriceUsdc: 2,
    tags: ["finance", "summary"],
  });

  assert.equal(result.top.agentId, "agent-1");
  assert.equal(result.alternatives.length, 1);
  assert.equal(result.reason, "Matched by tags and price ceiling.");
});

test("match_capability requires wallet_connect first", async () => {
  const handler = createMatchCapabilityHandler({
    sessionStore: {
      setToken() {},
      getToken() {
        return null;
      },
    },
    gatewayClient: {
      async matchAgent() {
        throw new Error("matchAgent should not be called without a token");
      },
    },
  });

  await assert.rejects(
    () => handler({ task: "summarize invoices" }),
    /wallet_connect must be completed before match_capability/,
  );
});

test("wallet_faucet requests devnet funds via Gateway for the connected wallet", async () => {
  const handler = createWalletFaucetHandler({
    sessionStore: {
      setToken() {},
      getToken() {
        return "jwt-token";
      },
    },
    gatewayClient: {
      async requestFaucet(token) {
        assert.equal(token, "jwt-token");
        return {
          walletPubkey: "wallet-123",
          network: "solana:devnet",
          sol: {
            requested: true,
            amount: 1,
            signature: "sol-tx-123",
            balanceLamports: 1_000_000_000,
          },
          usdc: {
            requested: true,
            signature: "usdc-tx-123",
            amount: "10",
          },
          warnings: [],
        };
      },
    },
  });

  const result = await handler();

  assert.equal(result.walletPubkey, "wallet-123");
  assert.equal(result.sol.signature, "sol-tx-123");
  assert.equal(result.usdc.requested, true);
  assert.equal((result.usdc as { signature: string }).signature, "usdc-tx-123");
});

test("wallet_faucet requires wallet_connect first", async () => {
  const handler = createWalletFaucetHandler({
    sessionStore: {
      setToken() {},
      getToken() {
        return null;
      },
    },
    gatewayClient: {
      async requestFaucet() {
        throw new Error("requestFaucet should not be called without a token");
      },
    },
  });

  await assert.rejects(() => handler(), /wallet_connect must be completed before wallet_faucet/);
});

test("default x402 client uses real mode unless mock is explicitly requested", async () => {
  let signerRequested = false;
  const client = createDefaultX402Client({
    walletBridge: {
      async getSvmSigner() {
        signerRequested = true;
        return createMockSvmSigner("wallet-123");
      },
    },
    createRealClient(signer) {
      assert.equal(String(signer.address), "wallet-123");
      return {
        async executeWithPayment() {
          return {
            result: "real-ok",
            txSignature: "real-tx-123",
            payer: "wallet-123",
            amount: 10_000,
            network: "solana:devnet",
          };
        },
      };
    },
  });

  const result = await client.executeWithPayment("https://agent.example.com/run", { task: "hello" });

  assert.equal(signerRequested, true);
  assert.equal(result.txSignature, "real-tx-123");
});

test("default x402 client supports explicit mock mode for local development", async () => {
  const client = createDefaultX402Client({
    walletBridge: {
      async getSvmSigner() {
        throw new Error("real signer should not be requested in explicit mock mode");
      },
    },
    mode: "mock",
  });

  const result = await client.executeWithPayment("https://agent.example.com/run", { task: "hello" });

  assert.equal(result.txSignature, "mock-tx-signature");
});

test("default x402 client uses wallet backed real client in real mode", async () => {
  const client = createDefaultX402Client({
    walletBridge: {
      async getSvmSigner() {
        return createMockSvmSigner("wallet-123");
      },
    },
    mode: "real",
    createRealClient(signer) {
      assert.equal(String(signer.address), "wallet-123");
      return {
        async executeWithPayment() {
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

  assert.equal(result.txSignature, "tx-123");
});

test("run_agent_task executes the agent call and reports a receipt", async () => {
  const handler = createRunAgentTaskHandler({
    sessionStore: {
      setToken() {},
      getToken() {
        return "jwt-token";
      },
    },
    x402Client: {
      async executeWithPayment(endpointUrl, payload) {
        assert.equal(endpointUrl, "https://agent-1.example.com");
        assert.deepEqual(payload, {
          task: "reply to my customer",
        });

        return {
          result: "Drafted response",
          txSignature: "tx-123",
          payer: "wallet-123",
          amount: 1_500_000,
          network: "solana:devnet",
        };
      },
    },
    gatewayClient: {
      async submitReceipt(payload, token) {
        assert.equal(token, "jwt-token");
        assert.deepEqual(payload, {
          agentId: "agent-1",
          taskText: "reply to my customer",
          txSignature: "tx-123",
          payer: "wallet-123",
          amount: 1_500_000,
          network: "solana:devnet",
          resultHash: "9ba39f1fd53644e5461c37d7d98771e3887c05562208fbff2ebf3d522a63b843",
        });

        return {
          receiptId: "receipt-1",
          orderId: "order-1",
          paymentVerified: true,
          explorerLink: "https://explorer.example.com/tx-123",
        };
      },
    },
  });

  const result = await handler({
    agentId: "agent-1",
    endpointUrl: "https://agent-1.example.com",
    task: "reply to my customer",
  });

  assert.deepEqual(result, {
    result: "Drafted response",
    receiptId: "receipt-1",
    txSignature: "tx-123",
    explorerLink: "https://explorer.example.com/tx-123",
  });
});

test("run_agent_task sends city payload to weather agents and hashes object results", async () => {
  const handler = createRunAgentTaskHandler({
    sessionStore: {
      setToken() {},
      getToken() {
        return "jwt-token";
      },
    },
    x402Client: {
      async executeWithPayment(endpointUrl, payload) {
        assert.equal(endpointUrl, "http://127.0.0.1:9000/v1/execute");
        assert.deepEqual(payload, {
          city: "Shanghai",
        });

        return {
          result: {
            city: "Shanghai",
            current: {
              temperature_c: 22.8,
            },
            source: "open-meteo",
          },
          txSignature: "weather-tx-123",
          payer: "wallet-123",
          amount: 10_000,
          network: "solana:devnet",
        };
      },
    },
    gatewayClient: {
      async submitReceipt(payload, token) {
        assert.equal(token, "jwt-token");
        assert.deepEqual(payload, {
          agentId: "seed-agent-weather",
          taskText: "weather in Shanghai",
          txSignature: "weather-tx-123",
          payer: "wallet-123",
          amount: 10_000,
          network: "solana:devnet",
          resultHash: "fcce26b6735dce3ce5cb7b953c25c0985612f9e8140a24e861877243b97d7b64",
        });

        return {
          receiptId: "receipt-weather",
          orderId: "order-weather",
          paymentVerified: true,
          explorerLink: "https://explorer.example.com/weather-tx-123",
        };
      },
    },
  });

  const result = await handler({
    agentId: "seed-agent-weather",
    endpointUrl: "http://127.0.0.1:9000/v1/execute",
    task: "weather in Shanghai",
  });

  assert.deepEqual(result, {
    result: {
      city: "Shanghai",
      current: {
        temperature_c: 22.8,
      },
      source: "open-meteo",
    },
    receiptId: "receipt-weather",
    txSignature: "weather-tx-123",
    explorerLink: "https://explorer.example.com/weather-tx-123",
  });
});

test("run_agent_task still returns execution result when receipt reporting fails", async () => {
  const handler = createRunAgentTaskHandler({
    sessionStore: {
      setToken() {},
      getToken() {
        return "jwt-token";
      },
    },
    x402Client: {
      async executeWithPayment(endpointUrl, payload) {
        assert.equal(endpointUrl, "http://127.0.0.1:9000/v1/execute");
        assert.deepEqual(payload, {
          city: "Shanghai",
        });

        return {
          result: {
            city: "Shanghai",
            current: {
              temperature_c: 22.8,
            },
          },
          txSignature: "weather-tx-456",
          payer: "wallet-123",
          amount: 10_000,
          network: "solana:devnet",
        };
      },
    },
    gatewayClient: {
      async submitReceipt(payload, token) {
        assert.equal(token, "jwt-token");
        assert.equal(payload.txSignature, "weather-tx-456");
        throw new Error("Receipt request failed with 400: Agent not found");
      },
    },
  });

  const result = await handler({
    agentId: "seed-agent-weather",
    endpointUrl: "http://127.0.0.1:9000/v1/execute",
    task: "weather in Shanghai",
  });

  assert.deepEqual(result, {
    result: {
      city: "Shanghai",
      current: {
        temperature_c: 22.8,
      },
    },
    receiptId: undefined,
    txSignature: "weather-tx-456",
    explorerLink: undefined,
    receiptError: "Receipt request failed with 400: Agent not found",
  });
});
