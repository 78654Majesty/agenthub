/**
 * @file  src/lib/errors/index.ts
 * @owner 基建
 *
 * Re-exports all domain-specific error constants into a single ERRORS object.
 *
 * Type hints:
 *   - ./auth   (AUTH_ERRORS)
 *   - ./market (MARKET_ERRORS)
 *   - ./consumer (CONSUMER_ERRORS)
 *   - ./provider (PROVIDER_ERRORS)
 *   - ./admin  (ADMIN_ERRORS)
 *
 * Exports:
 *   - ERRORS  (aggregated error constants)
 */

import { ADMIN_ERRORS } from "./admin";
import { AUTH_ERRORS } from "./auth";
import { CONSUMER_ERRORS } from "./consumer";
import { MARKET_ERRORS } from "./market";
import { PROVIDER_ERRORS } from "./provider";

export const ERRORS = {
  auth: AUTH_ERRORS,
  market: MARKET_ERRORS,
  consumer: CONSUMER_ERRORS,
  provider: PROVIDER_ERRORS,
  admin: ADMIN_ERRORS,
} as const;
