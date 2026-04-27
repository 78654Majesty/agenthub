/**
 * @file  src/lib/errors/consumer.ts
 * @owner Dev C
 * @module consumer
 *
 * Consumer domain error constants.
 *
 * Exports:
 *   - CONSUMER_ERRORS
 */

export const CONSUMER_ERRORS = {
  RECEIPT_NOT_FOUND: "RECEIPT_NOT_FOUND",
  ORDER_NOT_FOUND: "ORDER_NOT_FOUND",
  RATING_NOT_ALLOWED: "RATING_NOT_ALLOWED",
} as const;
