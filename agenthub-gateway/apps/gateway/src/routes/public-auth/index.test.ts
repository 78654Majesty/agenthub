import test from "node:test";
import assert from "node:assert/strict";

import Fastify from "fastify";

import { registerPublicAuthRoutes } from "./index";

test("public auth routes expose snake_case response fields", async () => {
  const app = Fastify();

  await registerPublicAuthRoutes(app, {
    createChallenge: async () => ({
      challenge: "agenthub:login:test",
      nonce: "nonce-1",
      expiresIn: 300,
    }),
    verifyWalletLogin: async () => ({
      token: "jwt-token",
      walletPubkey: "wallet-123",
      expiresIn: 3600,
    }),
  });

  const challengeResponse = await app.inject({
    method: "GET",
    url: "/challenge?wallet=wallet-123",
  });

  assert.equal(challengeResponse.statusCode, 200);
  assert.deepEqual(challengeResponse.json(), {
    challenge: "agenthub:login:test",
    nonce: "nonce-1",
    expires_in: 300,
  });

  const verifyResponse = await app.inject({
    method: "POST",
    url: "/verify",
    payload: {
      wallet: "wallet-123",
      signature: "signed-message",
    },
  });

  assert.equal(verifyResponse.statusCode, 200);
  assert.deepEqual(verifyResponse.json(), {
    token: "jwt-token",
    wallet_pubkey: "wallet-123",
    expires_in: 3600,
  });

  await app.close();
});

test("public auth routes support Fastify register options with injected auth service", async () => {
  const app = Fastify();

  await app.register(registerPublicAuthRoutes, {
    prefix: "/v1/public/auth",
    authService: {
      createChallenge: async () => ({
        challenge: "agenthub:login:test",
        nonce: "nonce-1",
        expiresIn: 300,
      }),
      verifyWalletLogin: async () => ({
        token: "jwt-token",
        walletPubkey: "wallet-123",
        expiresIn: 3600,
      }),
    },
  });

  const response = await app.inject({
    method: "GET",
    url: "/v1/public/auth/challenge?wallet=wallet-123",
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().challenge, "agenthub:login:test");

  await app.close();
});
