import { randomUUID } from "node:crypto";

export const CHALLENGE_TTL_SECONDS = 300;

export function createNonce(): string {
  return randomUUID().replace(/-/g, "");
}

export function buildChallengeMessage(nonce: string, issuedAt: Date = new Date()): string {
  return `agenthub:login:${nonce}:${issuedAt.toISOString()}`;
}

export function getChallengeExpiry(issuedAt: Date, ttlSeconds: number = CHALLENGE_TTL_SECONDS): Date {
  return new Date(issuedAt.getTime() + ttlSeconds * 1000);
}
