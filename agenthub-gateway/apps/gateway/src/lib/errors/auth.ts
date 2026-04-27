/**
 * @file  src/lib/errors/auth.ts
 * @owner Dev C
 * @module auth
 *
 * Authentication error constants.
 *
 * Exports:
 *   - AUTH_ERRORS
 */

export const AUTH_ERRORS = {
  INVALID_SIGNATURE: "INVALID_SIGNATURE",
  CHALLENGE_NOT_FOUND: "CHALLENGE_NOT_FOUND",
  CHALLENGE_EXPIRED: "CHALLENGE_EXPIRED",
  INVALID_TOKEN: "INVALID_TOKEN",
} as const;
