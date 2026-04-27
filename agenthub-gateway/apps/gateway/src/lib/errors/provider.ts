/**
 * @file  src/lib/errors/provider.ts
 * @owner Dev A
 * @module provider
 *
 * Provider domain error constants.
 *
 * Exports:
 *   - PROVIDER_ERRORS
 */

export const PROVIDER_ERRORS = {
  AGENT_NOT_FOUND: "AGENT_NOT_FOUND",
  INVALID_AGENT_STATUS: "INVALID_AGENT_STATUS",
  FORBIDDEN_AGENT_ACCESS: "FORBIDDEN_AGENT_ACCESS",
} as const;
