import { createHmac, timingSafeEqual } from "node:crypto";

export interface WalletJwtPayload {
  wallet_pubkey: string;
  iat: number;
  exp: number;
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

function signSegments(header: string, payload: string, secret: string): string {
  return base64UrlEncode(createHmac("sha256", secret).update(`${header}.${payload}`).digest());
}

export function signJwt(
  payload: Omit<WalletJwtPayload, "iat" | "exp">,
  secret: string,
  expiresInSeconds = 3600,
  now: Date = new Date(),
): string {
  const headerSegment = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const issuedAt = Math.floor(now.getTime() / 1000);
  const payloadSegment = base64UrlEncode(
    JSON.stringify({
      ...payload,
      iat: issuedAt,
      exp: issuedAt + expiresInSeconds,
    } satisfies WalletJwtPayload),
  );
  const signatureSegment = signSegments(headerSegment, payloadSegment, secret);

  return `${headerSegment}.${payloadSegment}.${signatureSegment}`;
}

export function verifyJwt(token: string, secret: string, now: Date = new Date()): WalletJwtPayload {
  const [headerSegment, payloadSegment, signatureSegment] = token.split(".");
  if (!headerSegment || !payloadSegment || !signatureSegment) {
    throw new Error("Invalid JWT format");
  }

  const expectedSignature = signSegments(headerSegment, payloadSegment, secret);
  const valid = timingSafeEqual(Buffer.from(signatureSegment), Buffer.from(expectedSignature));
  if (!valid) {
    throw new Error("Invalid JWT signature");
  }

  const payload = JSON.parse(base64UrlDecode(payloadSegment)) as WalletJwtPayload;
  const currentUnix = Math.floor(now.getTime() / 1000);
  if (payload.exp <= currentUnix) {
    throw new Error("JWT expired");
  }

  return payload;
}
