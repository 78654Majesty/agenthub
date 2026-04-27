"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHALLENGE_TTL_SECONDS = void 0;
exports.createNonce = createNonce;
exports.buildChallengeMessage = buildChallengeMessage;
exports.getChallengeExpiry = getChallengeExpiry;
const node_crypto_1 = require("node:crypto");
exports.CHALLENGE_TTL_SECONDS = 300;
function createNonce() {
    return (0, node_crypto_1.randomUUID)().replace(/-/g, "");
}
function buildChallengeMessage(nonce, issuedAt = new Date()) {
    return `agenthub:login:${nonce}:${issuedAt.toISOString()}`;
}
function getChallengeExpiry(issuedAt, ttlSeconds = exports.CHALLENGE_TTL_SECONDS) {
    return new Date(issuedAt.getTime() + ttlSeconds * 1000);
}
//# sourceMappingURL=challenge.js.map