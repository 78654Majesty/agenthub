"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signJwt = signJwt;
exports.verifyJwt = verifyJwt;
const node_crypto_1 = require("node:crypto");
function base64UrlEncode(input) {
    return Buffer.from(input)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}
function base64UrlDecode(input) {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
    return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}
function signSegments(header, payload, secret) {
    return base64UrlEncode((0, node_crypto_1.createHmac)("sha256", secret).update(`${header}.${payload}`).digest());
}
function signJwt(payload, secret, expiresInSeconds = 3600, now = new Date()) {
    const headerSegment = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const issuedAt = Math.floor(now.getTime() / 1000);
    const payloadSegment = base64UrlEncode(JSON.stringify({
        ...payload,
        iat: issuedAt,
        exp: issuedAt + expiresInSeconds,
    }));
    const signatureSegment = signSegments(headerSegment, payloadSegment, secret);
    return `${headerSegment}.${payloadSegment}.${signatureSegment}`;
}
function verifyJwt(token, secret, now = new Date()) {
    const [headerSegment, payloadSegment, signatureSegment] = token.split(".");
    if (!headerSegment || !payloadSegment || !signatureSegment) {
        throw new Error("Invalid JWT format");
    }
    const expectedSignature = signSegments(headerSegment, payloadSegment, secret);
    const valid = (0, node_crypto_1.timingSafeEqual)(Buffer.from(signatureSegment), Buffer.from(expectedSignature));
    if (!valid) {
        throw new Error("Invalid JWT signature");
    }
    const payload = JSON.parse(base64UrlDecode(payloadSegment));
    const currentUnix = Math.floor(now.getTime() / 1000);
    if (payload.exp <= currentUnix) {
        throw new Error("JWT expired");
    }
    return payload;
}
//# sourceMappingURL=jwt.js.map