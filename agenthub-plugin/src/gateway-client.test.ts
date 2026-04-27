import test from "node:test";
import assert from "node:assert/strict";

import { GatewayClient } from "./gateway-client";

test("verifyChallenge maps wallet_pubkey responses to walletPubkey", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        token: "jwt-token",
        wallet_pubkey: "wallet-123",
        expires_in: 3600,
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    )) as typeof fetch;

  try {
    const client = new GatewayClient("http://127.0.0.1:18080");
    const result = await client.verifyChallenge({
      wallet: "wallet-123",
      signature: "signed-message",
    });

    assert.deepEqual(result, {
      token: "jwt-token",
      walletPubkey: "wallet-123",
      expiresIn: 3600,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("requestFaucet posts to the consumer faucet endpoint and maps snake_case fields", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input, init) => {
    assert.equal(input, "http://127.0.0.1:18080/v1/consumer/faucet");
    assert.equal(init?.method, "POST");
    assert.deepEqual(init?.headers, {
      "content-type": "application/json",
      authorization: "Bearer jwt-token",
    });
    assert.deepEqual(JSON.parse(String(init?.body)), {});

    return new Response(
      JSON.stringify({
        wallet_pubkey: "wallet-123",
        network: "solana:devnet",
        sol: {
          requested: true,
          amount: 1,
          signature: "sol-tx-123",
          balance_lamports: 1_000_000_000,
        },
        usdc: {
          requested: true,
          signature: "usdc-tx-123",
          amount: "10",
        },
        warnings: [],
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    );
  }) as typeof fetch;

  try {
    const client = new GatewayClient("http://127.0.0.1:18080");
    const result = await client.requestFaucet("jwt-token");

    assert.deepEqual(result, {
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
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("matchAgent posts to the consumer match endpoint and maps snake_case fields", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input, init) => {
    assert.equal(input, "http://127.0.0.1:18080/v1/consumer/match");
    assert.equal(init?.method, "POST");
    assert.deepEqual(init?.headers, {
      "content-type": "application/json",
      authorization: "Bearer jwt-token",
    });
    assert.deepEqual(JSON.parse(String(init?.body)), {
      task: "reply to my customer",
      maxPriceUsdc: 3,
      tags: ["email"],
    });

    return new Response(
      JSON.stringify({
        top: {
          agent_id: "agent-1",
          name: "Email Agent",
          description: "Drafts replies",
          endpoint_url: "https://agent-1.example.com",
          price_usdc_micro: 1500000,
          rating_avg: 4.9,
          capability_tags: ["email"],
        },
        alternatives: [],
        reason: "Fallback ranking selected the best matching agent.",
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    );
  }) as typeof fetch;

  try {
    const client = new GatewayClient("http://127.0.0.1:18080");
    const result = await client.matchAgent(
      {
        task: "reply to my customer",
        maxPriceUsdc: 3,
        tags: ["email"],
      },
      "jwt-token",
    );

    assert.deepEqual(result, {
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
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("submitReceipt posts to the consumer receipts endpoint and maps snake_case fields", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input, init) => {
    assert.equal(input, "http://127.0.0.1:18080/v1/consumer/receipts");
    assert.equal(init?.method, "POST");
    assert.deepEqual(init?.headers, {
      "content-type": "application/json",
      authorization: "Bearer jwt-token",
    });
    assert.deepEqual(JSON.parse(String(init?.body)), {
      agentId: "agent-1",
      taskText: "reply to my customer",
      txSignature: "tx-123",
      payer: "wallet-123",
      amount: 1_500_000,
      network: "solana:devnet",
      resultHash: "hash-123",
    });

    return new Response(
      JSON.stringify({
        receipt_id: "receipt-1",
        order_id: "order-1",
        payment_verified: true,
        explorer_link: "https://explorer.example.com/tx-123",
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    );
  }) as typeof fetch;

  try {
    const client = new GatewayClient("http://127.0.0.1:18080");
    const result = await client.submitReceipt(
      {
        agentId: "agent-1",
        taskText: "reply to my customer",
        txSignature: "tx-123",
        payer: "wallet-123",
        amount: 1_500_000,
        network: "solana:devnet",
        resultHash: "hash-123",
      },
      "jwt-token",
    );

    assert.deepEqual(result, {
      receiptId: "receipt-1",
      orderId: "order-1",
      paymentVerified: true,
      explorerLink: "https://explorer.example.com/tx-123",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
