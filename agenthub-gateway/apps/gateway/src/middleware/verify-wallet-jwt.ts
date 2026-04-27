import type { FastifyReply, FastifyRequest } from "fastify";

import { verifyJwt } from "../../../../packages/auth/src/jwt";

declare module "fastify" {
  interface FastifyRequest {
    walletAuth?: {
      walletPubkey: string;
    };
  }
}

export async function verifyWalletJwt(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return reply.code(401).send({ error: "Missing bearer token" });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return reply.code(500).send({ error: "JWT_SECRET is required" });
  }

  try {
    const payload = verifyJwt(authHeader.slice("Bearer ".length), jwtSecret);
    request.walletAuth = {
      walletPubkey: payload.wallet_pubkey,
    };
  } catch (error) {
    return reply.code(401).send({
      error: error instanceof Error ? error.message : "Invalid wallet token",
    });
  }
}
