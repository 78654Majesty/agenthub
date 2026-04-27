import test from "node:test";
import assert from "node:assert/strict";

import Fastify from "fastify";

import { registerConsumerRoutes } from "./index";

test("consumer match route returns a match result for authenticated requests", async () => {
  const app = Fastify();

  await registerConsumerRoutes(app, {
    verifyWalletJwt: async (request) => {
      request.walletAuth = {
        walletPubkey: "wallet-123",
      };
    },
    matchService: {
      async matchAgent(input) {
        assert.deepEqual(input, {
          task: "reply to my customer",
          maxPriceUsdc: 3,
          tags: ["email"],
        });

        return {
          top: {
            agentId: "agent-1",
            name: "Email Agent",
            description: "Drafts replies",
            endpointUrl: "https://agent-1.example.com",
            priceUsdcMicro: 1_500_000,
            ratingAvg: 4.9,
            capabilityTags: ["email"],
          },
          alternatives: [],
          reason: "Fallback ranking selected the best matching agent.",
        };
      },
    },
  });

  const response = await app.inject({
    method: "POST",
    url: "/match",
    headers: {
      authorization: "Bearer jwt-token",
    },
    payload: {
      task: "reply to my customer",
      maxPriceUsdc: 3,
      tags: ["email"],
    },
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    top: {
      agent_id: "agent-1",
      name: "Email Agent",
      description: "Drafts replies",
      endpoint_url: "https://agent-1.example.com",
      price_usdc_micro: 1_500_000,
      rating_avg: 4.9,
      capability_tags: ["email"],
    },
    alternatives: [],
    reason: "Fallback ranking selected the best matching agent.",
  });
});

test("consumer receipts route reports a receipt for authenticated requests", async () => {
  const app = Fastify();

  await registerConsumerRoutes(app, {
    verifyWalletJwt: async (request) => {
      request.walletAuth = {
        walletPubkey: "wallet-123",
      };
    },
    consumerService: {
      async createReceipt(walletPubkey, input) {
        assert.equal(walletPubkey, "wallet-123");
        assert.deepEqual(input, {
          agentId: "agent-1",
          taskText: "reply to my customer",
          txSignature: "tx-123",
          payer: "wallet-123",
          amount: 1_500_000,
          network: "solana:devnet",
          resultHash: "hash-123",
        });

        return {
          receiptId: "receipt-1",
          orderId: "order-1",
          paymentVerified: false,
          explorerLink: "https://explorer.example.com/tx-123",
        };
      },
    },
  });

  const response = await app.inject({
    method: "POST",
    url: "/receipts",
    headers: {
      authorization: "Bearer jwt-token",
    },
    payload: {
      agentId: "agent-1",
      taskText: "reply to my customer",
      txSignature: "tx-123",
      payer: "wallet-123",
      amount: 1_500_000,
      network: "solana:devnet",
      resultHash: "hash-123",
    },
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    receipt_id: "receipt-1",
    order_id: "order-1",
    payment_verified: false,
    explorer_link: "https://explorer.example.com/tx-123",
  });
});

test("consumer faucet route requests server-side devnet funds for authenticated wallet", async () => {
  const app = Fastify();

  await registerConsumerRoutes(app, {
    verifyWalletJwt: async (request) => {
      request.walletAuth = {
        walletPubkey: "wallet-123",
      };
    },
    faucetService: {
      async requestFunds(walletPubkey) {
        assert.equal(walletPubkey, "wallet-123");

        return {
          walletPubkey,
          network: "solana:devnet",
          sol: {
            requested: true,
            amount: 1,
            signature: "sol-airdrop-signature",
            balanceLamports: 1_000_000_000,
          },
          usdc: {
            requested: true,
            signature: "usdc-transfer-signature",
            amount: "10",
          },
          warnings: [],
        };
      },
    },
  });

  const response = await app.inject({
    method: "POST",
    url: "/faucet",
    headers: {
      authorization: "Bearer jwt-token",
    },
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    wallet_pubkey: "wallet-123",
    network: "solana:devnet",
    sol: {
      requested: true,
      amount: 1,
      signature: "sol-airdrop-signature",
      balance_lamports: 1_000_000_000,
    },
    usdc: {
      requested: true,
      signature: "usdc-transfer-signature",
      amount: "10",
    },
    warnings: [],
  });
});
