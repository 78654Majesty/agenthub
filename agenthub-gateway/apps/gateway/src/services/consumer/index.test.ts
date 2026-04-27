import test from "node:test";
import assert from "node:assert/strict";
import { Keypair } from "@solana/web3.js";

import { createConsumerService, getSolanaDevnetRpcUrl, parseSecretKey } from "./index";

test("createReceipt stores a receipt without performing chain verification", async () => {
  const createdReceipts: unknown[] = [];
  const service = createConsumerService({
    verifyTransaction: async () => {
      throw new Error("verifyTransaction should not be called");
    },
    receiptStore: {
      async findWalletByPubkey(pubkey) {
        assert.equal(pubkey, "wallet-123");
        return { id: "wallet-id-1", pubkey };
      },
      async findAgentById(agentId) {
        assert.equal(agentId, "agent-1");
        return { id: agentId, priceUsdcMicro: 1_500_000 };
      },
      async createPaidReceipt(input) {
        createdReceipts.push(input);
        return {
          receiptId: "receipt-1",
          orderId: "order-1",
        };
      },
    },
  });

  const result = await service.createReceipt("wallet-123", {
    agentId: "agent-1",
    taskText: "reply to my customer",
    txSignature: "tx-123",
    payer: "wallet-123",
    amount: 1_500_000,
    network: "solana:devnet",
    resultHash: "hash-123",
  });

  assert.deepEqual(result, {
    receiptId: "receipt-1",
    orderId: "order-1",
    paymentVerified: false,
    explorerLink: "https://explorer.solana.com/tx/tx-123?cluster=devnet",
  });
  assert.deepEqual(createdReceipts, [
    {
      walletId: "wallet-id-1",
      agentId: "agent-1",
      taskText: "reply to my customer",
      amountUsdcMicro: 1_500_000,
      txSignature: "tx-123",
      payer: "wallet-123",
      network: "solana:devnet",
      resultHash: "hash-123",
    },
  ]);
});

test("createReceipt still rejects when authenticated wallet cannot be found", async () => {
  const service = createConsumerService({
    verifyTransaction: async () => {
      throw new Error("verifyTransaction should not be called");
    },
    receiptStore: {
      async findWalletByPubkey(pubkey) {
        assert.equal(pubkey, "wallet-123");
        return null;
      },
      async findAgentById() {
        throw new Error("findAgentById should not be called when wallet is missing");
      },
      async createPaidReceipt() {
        throw new Error("createPaidReceipt should not be called when wallet is missing");
      },
    },
  });

  await assert.rejects(
    () =>
      service.createReceipt("wallet-123", {
        agentId: "agent-1",
        taskText: "reply to my customer",
        txSignature: "tx-123",
        payer: "wallet-123",
        amount: 1_500_001,
        network: "solana:devnet",
        resultHash: "hash-123",
      }),
    {
      message: "Authenticated wallet not found",
    },
  );
});

test("createReceipt still rejects when agent cannot be found", async () => {
  const service = createConsumerService({
    verifyTransaction: async () => {
      throw new Error("verifyTransaction should not be called");
    },
    receiptStore: {
      async findWalletByPubkey(pubkey) {
        assert.equal(pubkey, "wallet-123");
        return { id: "wallet-id-1", pubkey };
      },
      async findAgentById(agentId) {
        assert.equal(agentId, "agent-1");
        return null;
      },
      async createPaidReceipt() {
        throw new Error("createPaidReceipt should not be called when agent is missing");
      },
    },
  });

  await assert.rejects(
    () =>
      service.createReceipt("wallet-123", {
        agentId: "agent-1",
        taskText: "reply to my customer",
        txSignature: "tx-123",
        payer: "wallet-123",
        amount: 1_500_000,
        network: "solana:devnet",
        resultHash: "hash-123",
      }),
    {
      message: "Agent not found",
    },
  );
});

test("parseSecretKey accepts Phantom-style base58 secret key strings", () => {
  const secretKey = "2BQ48fqGksW5FxMH7Et5wsqAuSpKgfVt6UHFSPwjF5guTXrRQDSnp5h1tUTvuCamMatVriu9Nf38jwfYUWu3uk9j";

  const parsed = parseSecretKey(secretKey);
  const keypair = Keypair.fromSecretKey(parsed);

  assert.equal(parsed.length, 64);
  assert.equal(keypair.publicKey.toBase58(), "Au7qqFXDtHHsXyg9pEXqa8aB1twPkHsTGttJ7mwrvd73");
});

test("getSolanaDevnetRpcUrl prefers AGENTHUB_SOLANA_RPC_URL and falls back to SOLANA_RPC_URL", () => {
  const previousAgenthub = process.env.AGENTHUB_SOLANA_RPC_URL;
  const previousLegacy = process.env.SOLANA_RPC_URL;

  process.env.AGENTHUB_SOLANA_RPC_URL = "";
  process.env.SOLANA_RPC_URL = "https://legacy-rpc.example.com";
  assert.equal(getSolanaDevnetRpcUrl(), "https://legacy-rpc.example.com");

  process.env.AGENTHUB_SOLANA_RPC_URL = "https://agenthub-rpc.example.com";
  assert.equal(getSolanaDevnetRpcUrl(), "https://agenthub-rpc.example.com");

  if (typeof previousAgenthub === "undefined") {
    delete process.env.AGENTHUB_SOLANA_RPC_URL;
  } else {
    process.env.AGENTHUB_SOLANA_RPC_URL = previousAgenthub;
  }

  if (typeof previousLegacy === "undefined") {
    delete process.env.SOLANA_RPC_URL;
  } else {
    process.env.SOLANA_RPC_URL = previousLegacy;
  }
});
