/**
 * @file admin-auth.ts
 * @owner 基建
 * @module auth
 *
 * Admin password hashing and comparison.
 *
 * Exports:
 *   - hashPassword(password)
 *   - comparePassword(password, hash)
 */

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

type ParsedScryptHash = {
  salt: string;
  hash: string;
};

function parseScryptHash(input: string): ParsedScryptHash | null {
  if (!input.startsWith("scrypt$")) {
    return null;
  }

  const parts = input.split("$");
  if (parts.length !== 3) {
    return null;
  }

  const [, salt, hash] = parts;
  if (!salt || !hash) {
    return null;
  }

  return { salt, hash };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  const parsed = parseScryptHash(hash);
  if (!parsed) {
    return false;
  }

  const derived = (await scrypt(password, parsed.salt, KEY_LENGTH)) as Buffer;
  const hashBuffer = Buffer.from(parsed.hash, "hex");

  if (derived.length !== hashBuffer.length) {
    return false;
  }

  return timingSafeEqual(derived, hashBuffer);
}
