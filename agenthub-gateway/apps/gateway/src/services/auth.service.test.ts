import test from "node:test";
import assert from "node:assert/strict";
import { Keypair } from "@solana/web3.js";

import { createAuthService } from "./auth.service";
import { signMessage } from "../../../../packages/auth/src/wallet-sign";

test("createChallenge and verifyWalletLogin issue a JWT and persist the wallet", async () => {
  const challenges = new Map<string, { wallet: string; nonce: string; challenge: string; expiresAt: Date; used: boolean }>();
  const wallets = new Map<string, { pubkey: string; source: string; lastLoginAt: Date | null }>();

  const authService = createAuthService({
    challengeStore: {
      async save(record) {
        challenges.set(record.nonce, record);
      },
      async findLatestActive(wallet, currentTime) {
        const matches = [...challenges.values()]
          .filter((record) => record.wallet === wallet && !record.used && record.expiresAt > currentTime)
          .sort((left, right) => right.expiresAt.getTime() - left.expiresAt.getTime());

        return matches[0] ?? null;
      },
      async markUsed(nonce) {
        const record = challenges.get(nonce);
        if (record) {
          record.used = true;
        }
      },
    },
    walletStore: {
      async upsertWallet(pubkey, source, lastLoginAt) {
        wallets.set(pubkey, { pubkey, source, lastLoginAt });
      },
    },
    jwtSecret: "test-secret",
    now: () => new Date("2026-04-20T00:00:00.000Z"),
  });

  const keypair = Keypair.generate();
  const wallet = keypair.publicKey.toBase58();

  const challenge = await authService.createChallenge(wallet);
  const signature = signMessage(keypair, challenge.challenge);

  const result = await authService.verifyWalletLogin({
    wallet,
    signature,
  });

  assert.ok(result.token);
  assert.equal(result.walletPubkey, wallet);
  assert.equal(challenges.get(challenge.nonce)?.used, true);
  assert.deepEqual(wallets.get(wallet)?.source, "local-keypair");
});
