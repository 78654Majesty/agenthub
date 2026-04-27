import test from "node:test";
import assert from "node:assert/strict";

import { runWalletConnectSmoke } from "./wallet-connect-smoke";

test("wallet connect smoke script returns tool output and cached token state", async () => {
  const result = await runWalletConnectSmoke({
    walletBridge: {
      async connectWallet() {
        return {
          isNew: false,
          wallet: {
            publicKey: "wallet-123",
            async signMessage(message: string) {
              return `signed:${message}`;
            },
            async getSvmSigner() {
              return {
                address: "wallet-123",
                async signTransactions() {
                  return [];
                },
              } as never;
            },
          },
        };
      },
      async getStatus() {
        return {
          connected: true,
          walletPubkey: "wallet-123",
          network: "solana:devnet" as const,
        };
      },
      async signMessage(message: string) {
        return `signed:${message}`;
      },
      async getSvmSigner() {
        return {
          address: "wallet-123",
          async signTransactions() {
            return [];
          },
        } as never;
      },
    },
    gatewayClient: {
      async getChallenge(pubkey: string) {
        assert.equal(pubkey, "wallet-123");
        return {
          challenge: "agenthub:login:test",
          nonce: "nonce-1",
          expiresIn: 300,
        };
      },
      async verifyChallenge(payload: { wallet: string; signature: string }) {
        assert.deepEqual(payload, {
          wallet: "wallet-123",
          signature: "signed:agenthub:login:test",
        });

        return {
          token: "jwt-token",
          walletPubkey: "wallet-123",
          expiresIn: 3600,
        };
      },
    },
  });

  assert.deepEqual(result, {
    result: {
      walletPubkey: "wallet-123",
      tokenCached: true,
      network: "solana:devnet",
      isNew: false,
    },
    token: "jwt-token",
  });
});
