import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_AGENTHUB_GATEWAY_URL,
  DEFAULT_SOLANA_DEVNET_RPC_URL,
  getAgentHubGatewayUrl,
  getSolanaDevnetRpcUrl,
} from "./config";

test("AgentHub gateway defaults to local dev gateway on port 8080", () => {
  const previous = process.env.AGENTHUB_GATEWAY_URL;
  delete process.env.AGENTHUB_GATEWAY_URL;

  try {
    assert.equal(DEFAULT_AGENTHUB_GATEWAY_URL, "http://127.0.0.1:8080");
    assert.equal(getAgentHubGatewayUrl(), "http://127.0.0.1:8080");
  } finally {
    if (typeof previous === "undefined") {
      delete process.env.AGENTHUB_GATEWAY_URL;
    } else {
      process.env.AGENTHUB_GATEWAY_URL = previous;
    }
  }
});

test("AgentHub gateway still allows explicit env override", () => {
  const previous = process.env.AGENTHUB_GATEWAY_URL;
  process.env.AGENTHUB_GATEWAY_URL = "https://gateway.example.com";

  try {
    assert.equal(getAgentHubGatewayUrl(), "https://gateway.example.com");
  } finally {
    if (typeof previous === "undefined") {
      delete process.env.AGENTHUB_GATEWAY_URL;
    } else {
      process.env.AGENTHUB_GATEWAY_URL = previous;
    }
  }
});

test("Solana RPC defaults to Helius devnet RPC and still allows env override", () => {
  const previous = process.env.AGENTHUB_SOLANA_RPC_URL;
  delete process.env.AGENTHUB_SOLANA_RPC_URL;

  try {
    assert.equal(DEFAULT_SOLANA_DEVNET_RPC_URL, "https://devnet.helius-rpc.com/?api-key=ea3297f1-582d-4b7d-b287-ecd5c8b05ecb");
    assert.equal(getSolanaDevnetRpcUrl(), "https://devnet.helius-rpc.com/?api-key=ea3297f1-582d-4b7d-b287-ecd5c8b05ecb");
  } finally {
    if (typeof previous === "undefined") {
      delete process.env.AGENTHUB_SOLANA_RPC_URL;
    } else {
      process.env.AGENTHUB_SOLANA_RPC_URL = previous;
    }
  }

  process.env.AGENTHUB_SOLANA_RPC_URL = "https://rpc.example.com";
  try {
    assert.equal(getSolanaDevnetRpcUrl(), "https://rpc.example.com");
  } finally {
    if (typeof previous === "undefined") {
      delete process.env.AGENTHUB_SOLANA_RPC_URL;
    } else {
      process.env.AGENTHUB_SOLANA_RPC_URL = previous;
    }
  }
});
