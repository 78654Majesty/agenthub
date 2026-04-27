"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.comparePassword = comparePassword;
const node_crypto_1 = require("node:crypto");
const node_util_1 = require("node:util");
const scrypt = (0, node_util_1.promisify)(node_crypto_1.scrypt);
const KEY_LENGTH = 64;
function parseScryptHash(input) {
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
async function hashPassword(password) {
    const salt = (0, node_crypto_1.randomBytes)(16).toString("hex");
    const derived = (await scrypt(password, salt, KEY_LENGTH));
    return `scrypt$${salt}$${derived.toString("hex")}`;
}
async function comparePassword(password, hash) {
    const parsed = parseScryptHash(hash);
    if (parsed) {
        const derived = (await scrypt(password, parsed.salt, KEY_LENGTH));
        const hashBuffer = Buffer.from(parsed.hash, "hex");
        if (derived.length !== hashBuffer.length) {
            return false;
        }
        return (0, node_crypto_1.timingSafeEqual)(derived, hashBuffer);
    }
    // Dev seed compatibility: existing seed uses a placeholder bcrypt string for "admin123".
    if (hash.startsWith("$") && hash.includes("dummyhashfordevonly")) {
        return password === "admin123";
    }
    // Fallback for plain-text/local legacy values.
    return password === hash;
}
//# sourceMappingURL=admin-auth.js.map