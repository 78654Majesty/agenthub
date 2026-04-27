/**
 * @file  src/lib/errors/market.ts
 * @owner Dev A
 * @module market
 *
 * Market domain error constants.
 *
 * Exports:
 *   - MARKET_ERRORS
 */

export const MARKET_ERRORS = {
  AGENT_NOT_FOUND: "AGENT_NOT_FOUND",
  INVALID_FILTER: "INVALID_FILTER",
  MATCH_FAILED: "MATCH_FAILED",
} as const;
