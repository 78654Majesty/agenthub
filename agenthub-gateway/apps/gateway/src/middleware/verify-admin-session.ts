/**
 * @file  src/middleware/verify-admin-session.ts
 * @owner 基建
 * @module auth
 *
 * Admin session JWT verification middleware.
 * Validates admin session tokens and attaches admin identity to request.
 *
 * Type hints:
 *   - fastify (FastifyRequest, FastifyReply)
 *
 * Exports:
 *   - verifyAdminSession  (Fastify preHandler hook)
 */

import type { FastifyReply, FastifyRequest } from "fastify";

import { verifyJwt } from "../../../../packages/auth/src/jwt";
import { config } from "../config";

export type AdminIdentity = {
  adminId: string;
  username: string;
};

declare module "fastify" {
  interface FastifyRequest {
    admin?: AdminIdentity;
  }
}

function parseAdminTokenPayload(payload: string): AdminIdentity {
  if (!payload.startsWith("admin:")) {
    throw new Error("INVALID_ADMIN_TOKEN");
  }

  const parts = payload.split(":");
  if (parts.length < 3) {
    throw new Error("INVALID_ADMIN_TOKEN");
  }

  const [, adminId, ...usernameParts] = parts;
  const username = usernameParts.join(":");

  if (!adminId || !username) {
    throw new Error("INVALID_ADMIN_TOKEN");
  }

  return {
    adminId,
    username,
  };
}

export async function verifyAdminSession(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.code(401).send({
      error: "UNAUTHORIZED",
      message: "Admin session is required.",
    });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return reply.code(401).send({
      error: "UNAUTHORIZED",
      message: "Admin session is required.",
    });
  }

  try {
    const decoded = verifyJwt(token, config.jwtSecret);
    request.admin = parseAdminTokenPayload(decoded.wallet_pubkey);
  } catch {
    return reply.code(401).send({
      error: "UNAUTHORIZED",
      message: "Invalid or expired admin session.",
    });
  }
}

export default verifyAdminSession;
