/**
 * @file  src/middleware/mock-auth.ts
 * @owner 基建
 * @module auth
 *
 * Development-only mock authentication bypass.
 * Injects a fake wallet/admin identity without requiring a real JWT.
 *
 * Type hints:
 *   - fastify (FastifyRequest, FastifyReply)
 *
 * Exports:
 *   - mockAuth  (Fastify preHandler hook)
 */
