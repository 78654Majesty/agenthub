/**
 * @file  src/routes/admin/index.ts
 * @owner Dev B
 * @module admin
 *
 * Admin routes (admin session JWT required).
 *
 * Routes:
 *   POST /auth/login          — Admin login
 *   GET  /stats               — Platform-wide statistics
 *   GET  /agents              — List all agents (with moderation status)
 *   POST /agents/:id/approve  — Approve an agent listing
 *   POST /agents/:id/reject   — Reject an agent listing
 *   POST /agents/:id/suspend  — Suspend an agent listing
 *   GET  /receipts/failed     — List failed receipts
 *   POST /receipts/:id/retry  — Retry a failed receipt
 *   GET  /users               — List platform users
 *
 * Type hints:
 *   - fastify (FastifyInstance)
 *   - ../../middleware/verify-admin-session (verifyAdminSession)
 *   - ../../services/admin (adminLogin, approveAgent, rejectAgent, suspendAgent, getFailedReceipts, retryReceipt, listUsers, getAdminStats)
 *
 * Exports:
 *   - default function(app: FastifyInstance)
 */

import type { FastifyInstance } from "fastify";

import { config } from "../../config";
import { ADMIN_ERRORS } from "../../lib/errors/admin";
import verifyAdminSession from "../../middleware/verify-admin-session";
import {
  adminLogin,
  approveAgent,
  getAdminStats,
  getFailedReceipts,
  getUsersStats,
  listAgents,
  listUsers,
  rejectAgent,
  retryAgent,
  retryReceipt,
  suspendAgent,
} from "../../services/admin";

function parseInteger(value: unknown): number | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return parsed;
}

function parseServiceError(error: unknown): { code: string; message: string } {
  if (!(error instanceof Error)) {
    return {
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal error",
    };
  }

  const separator = error.message.indexOf(":");
  if (separator === -1) {
    return {
      code: error.message,
      message: error.message,
    };
  }

  return {
    code: error.message.slice(0, separator),
    message: error.message.slice(separator + 1),
  };
}

export default async function registerAdminRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (request, reply) => {
    const body = (request.body ?? {}) as {
      username?: string;
      password?: string;
    };

    if (!body.username || !body.password) {
      return reply.code(400).send({
        error: "BAD_REQUEST",
        message: "username and password are required",
      });
    }

    try {
      const result = await adminLogin({
        username: body.username,
        password: body.password,
        jwtSecret: config.jwtSecret,
      });
      return reply.send(result);
    } catch (error) {
      if (error instanceof Error && error.message === ADMIN_ERRORS.INVALID_CREDENTIALS) {
        return reply.code(401).send({
          error: ADMIN_ERRORS.INVALID_CREDENTIALS,
          message: "Invalid username or password",
        });
      }

      request.log.error(error, "admin login failed");
      return reply.code(500).send({
        error: "INTERNAL_SERVER_ERROR",
        message: "Admin login failed",
      });
    }
  });

  app.register(async (protectedApp) => {
    protectedApp.addHook("preHandler", verifyAdminSession);

    protectedApp.get("/auth/me", async (request, reply) => {
      if (!request.admin) {
        return reply.code(401).send({
          error: "UNAUTHORIZED",
          message: "Invalid or expired admin session.",
        });
      }

      return reply.send({
        admin_id: request.admin.adminId,
        username: request.admin.username,
      });
    });

    protectedApp.get("/stats", async (_, reply) => {
      const stats = await getAdminStats();
      return reply.send(stats);
    });

    protectedApp.get("/agents", async (request, reply) => {
      const query = request.query as {
        status?: "pending_review" | "active" | "rejected" | "suspended";
        sort?: "newest" | "name" | "price";
        page?: string;
        limit?: string;
      };

      const result = await listAgents({
        status: query.status,
        sort: query.sort,
        page: parseInteger(query.page),
        limit: parseInteger(query.limit),
      });

      return reply.send(result);
    });

    protectedApp.post("/agents/:id/approve", async (request, reply) => {
      const params = request.params as { id?: string };
      const body = (request.body ?? {}) as { note?: string };

      if (!params.id) {
        return reply.code(400).send({
          error: "BAD_REQUEST",
          message: "agent id is required",
        });
      }

      try {
        const result = await approveAgent({
          id: params.id,
          note: body.note ?? "",
        });
        return reply.send(result);
      } catch (error) {
        const parsed = parseServiceError(error);

        if (parsed.code === ADMIN_ERRORS.AGENT_NOT_FOUND) {
          return reply.code(404).send({
            error: ADMIN_ERRORS.AGENT_NOT_FOUND,
            message: "Agent not found",
          });
        }
        if (parsed.code === ADMIN_ERRORS.AGENT_ALREADY_ACTIVE) {
          return reply.code(400).send({
            error: ADMIN_ERRORS.AGENT_ALREADY_ACTIVE,
            message: "Agent is already active",
          });
        }
        if (parsed.code === ADMIN_ERRORS.AGENT_ALREADY_REJECTED) {
          return reply.code(400).send({
            error: ADMIN_ERRORS.AGENT_ALREADY_REJECTED,
            message: "Rejected agent cannot be approved",
          });
        }
        if (parsed.code === ADMIN_ERRORS.PLATFORM_WALLET_INSUFFICIENT_BALANCE) {
          return reply.code(400).send({
            error: ADMIN_ERRORS.PLATFORM_WALLET_INSUFFICIENT_BALANCE,
            message: "Platform wallet does not have enough SOL for gas",
          });
        }
        if (parsed.code === ADMIN_ERRORS.COLLECTION_POINTER_NOT_CONFIGURED) {
          return reply.code(500).send({
            error: ADMIN_ERRORS.COLLECTION_POINTER_NOT_CONFIGURED,
            message: "Collection pointer is not configured",
          });
        }
        if (
          parsed.code === ADMIN_ERRORS.IPFS_UPLOAD_FAILED ||
          parsed.code === ADMIN_ERRORS.ERC8004_REGISTER_FAILED
        ) {
          return reply.code(500).send({
            error: parsed.code,
            message: parsed.message || "Chain registration failed",
          });
        }

        request.log.error(error, "approve agent failed");
        return reply.code(500).send({
          error: "INTERNAL_SERVER_ERROR",
          message: "Approve failed",
        });
      }
    });

    protectedApp.post("/agents/:id/reject", async (request, reply) => {
      const params = request.params as { id?: string };
      const body = (request.body ?? {}) as { note?: string };

      if (!params.id) {
        return reply.code(400).send({
          error: "BAD_REQUEST",
          message: "agent id is required",
        });
      }

      try {
        const result = await rejectAgent({
          id: params.id,
          note: body.note ?? "",
        });
        return reply.send(result);
      } catch (error) {
        const parsed = parseServiceError(error);

        if (parsed.code === ADMIN_ERRORS.AGENT_NOT_FOUND) {
          return reply.code(404).send({
            error: ADMIN_ERRORS.AGENT_NOT_FOUND,
            message: "Agent not found",
          });
        }
        if (parsed.code === ADMIN_ERRORS.REJECT_NOTE_REQUIRED) {
          return reply.code(400).send({
            error: ADMIN_ERRORS.REJECT_NOTE_REQUIRED,
            message: "Reject note is required",
          });
        }

        request.log.error(error, "reject agent failed");
        return reply.code(500).send({
          error: "INTERNAL_SERVER_ERROR",
          message: "Reject failed",
        });
      }
    });

    protectedApp.post("/agents/:id/retry", async (request, reply) => {
      const params = request.params as { id?: string };

      if (!params.id) {
        return reply.code(400).send({
          error: "BAD_REQUEST",
          message: "agent id is required",
        });
      }

      try {
        const result = await retryAgent({ id: params.id });
        return reply.send(result);
      } catch (error) {
        const parsed = parseServiceError(error);

        if (parsed.code === ADMIN_ERRORS.AGENT_NOT_FOUND) {
          return reply.code(404).send({
            error: ADMIN_ERRORS.AGENT_NOT_FOUND,
            message: "Agent not found",
          });
        }
        if (parsed.code === ADMIN_ERRORS.RETRY_NOT_ALLOWED) {
          return reply.code(400).send({
            error: ADMIN_ERRORS.RETRY_NOT_ALLOWED,
            message: "Retry is only allowed for failed pending agents",
          });
        }
        if (parsed.code === ADMIN_ERRORS.PLATFORM_WALLET_INSUFFICIENT_BALANCE) {
          return reply.code(400).send({
            error: ADMIN_ERRORS.PLATFORM_WALLET_INSUFFICIENT_BALANCE,
            message: "Platform wallet does not have enough SOL for gas",
          });
        }
        if (parsed.code === ADMIN_ERRORS.COLLECTION_POINTER_NOT_CONFIGURED) {
          return reply.code(500).send({
            error: ADMIN_ERRORS.COLLECTION_POINTER_NOT_CONFIGURED,
            message: "Collection pointer is not configured",
          });
        }
        if (
          parsed.code === ADMIN_ERRORS.IPFS_UPLOAD_FAILED ||
          parsed.code === ADMIN_ERRORS.ERC8004_REGISTER_FAILED
        ) {
          return reply.code(500).send({
            error: parsed.code,
            message: parsed.message || "Chain registration failed",
          });
        }

        request.log.error(error, "retry agent failed");
        return reply.code(500).send({
          error: "INTERNAL_SERVER_ERROR",
          message: "Retry failed",
        });
      }
    });

    protectedApp.post("/agents/:id/suspend", async (request, reply) => {
      const params = request.params as { id?: string };
      const body = (request.body ?? {}) as { note?: string };

      if (!params.id) {
        return reply.code(400).send({
          error: "BAD_REQUEST",
          message: "agent id is required",
        });
      }

      try {
        const result = await suspendAgent({
          id: params.id,
          note: body.note ?? "",
        });
        return reply.send(result);
      } catch (error) {
        if (error instanceof Error && error.message === ADMIN_ERRORS.AGENT_NOT_FOUND) {
          return reply.code(404).send({
            error: ADMIN_ERRORS.AGENT_NOT_FOUND,
            message: "Agent not found",
          });
        }

        request.log.error(error, "suspend agent failed");
        return reply.code(500).send({
          error: "INTERNAL_SERVER_ERROR",
          message: "Suspend failed",
        });
      }
    });

    protectedApp.get("/receipts/failed", async (request, reply) => {
      const query = request.query as { page?: string; limit?: string };
      const result = await getFailedReceipts({
        page: parseInteger(query.page),
        limit: parseInteger(query.limit),
      });

      return reply.send(result);
    });

    protectedApp.post("/receipts/:id/retry", async (request, reply) => {
      const params = request.params as { id?: string };
      if (!params.id) {
        return reply.code(400).send({
          error: "BAD_REQUEST",
          message: "receipt id is required",
        });
      }

      try {
        const result = await retryReceipt({ id: params.id });
        return reply.send(result);
      } catch (error) {
        if (error instanceof Error && error.message === ADMIN_ERRORS.RECEIPT_NOT_FOUND) {
          return reply.code(404).send({
            error: ADMIN_ERRORS.RECEIPT_NOT_FOUND,
            message: "Receipt not found",
          });
        }
        if (error instanceof Error && error.message === ADMIN_ERRORS.ALREADY_SUBMITTED) {
          return reply.code(400).send({
            error: ADMIN_ERRORS.ALREADY_SUBMITTED,
            message: "Receipt feedback already submitted on-chain",
          });
        }

        request.log.error(error, "retry receipt failed");
        return reply.code(500).send({
          error: "INTERNAL_SERVER_ERROR",
          message: "Retry failed",
        });
      }
    });

    protectedApp.get("/users", async (request, reply) => {
      const query = request.query as {
        search?: string;
        sort?: "last_active" | "spending" | "revenue" | "agents" | "orders";
        page?: string;
        limit?: string;
      };

      const result = await listUsers({
        search: query.search,
        sort: query.sort,
        page: parseInteger(query.page),
        limit: parseInteger(query.limit),
      });

      return reply.send(result);
    });

    protectedApp.get("/users/stats", async (_, reply) => {
      const result = await getUsersStats();
      return reply.send(result);
    });
  });
}
