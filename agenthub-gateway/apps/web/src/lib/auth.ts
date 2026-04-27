/**
 * @file auth.ts
 * @owner 基建
 * @module lib/auth
 *
 * Auth state management and wallet login API helpers.
 *
 * Exports:
 *   - login()
 *   - logout()
 *   - getToken()
 *   - isAuthenticated()
 *   - createWalletChallenge()
 *   - verifyWalletLogin()
 */

const DEFAULT_BASE_URL = "http://localhost:8080";
function resolveGatewayBaseUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_GATEWAY_URL ?? "").trim();

  if (!configured) {
    return DEFAULT_BASE_URL;
  }

  try {
    return new URL(configured).toString();
  } catch {
    try {
      return new URL(`http://${configured}`).toString();
    } catch {
      return DEFAULT_BASE_URL;
    }
  }
}

const GATEWAY_BASE_URL = resolveGatewayBaseUrl();

const TOKEN_STORAGE_KEY = "agenthub.auth.token";
const WALLET_STORAGE_KEY = "agenthub.auth.wallet";
const TOKEN_COOKIE_KEY = "agenthub_token";
const COOKIE_MAX_AGE = 60 * 60;

export type WalletChallengeResponse = {
  challenge: string;
  nonce: string;
  expires_in: number;
};

export type WalletVerifyResponse = {
  token: string;
  wallet_pubkey: string;
  expires_in: number;
};

function buildUrl(path: string, query?: Record<string, string | number | undefined>) {
  const url = new URL(path, GATEWAY_BASE_URL);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Auth API request failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

function setTokenCookie(token: string) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${TOKEN_COOKIE_KEY}=${encodeURIComponent(token)}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
}

function clearTokenCookie() {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${TOKEN_COOKIE_KEY}=; Max-Age=0; Path=/; SameSite=Lax`;
}

export function login(token: string, walletPubkey?: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  if (walletPubkey) {
    window.localStorage.setItem(WALLET_STORAGE_KEY, walletPubkey);
  }
  setTokenCookie(token);
}

export function logout() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(WALLET_STORAGE_KEY);
  }

  clearTokenCookie();
}

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getWalletPubkey(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(WALLET_STORAGE_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

export async function createWalletChallenge(wallet: string): Promise<WalletChallengeResponse> {
  return requestJson<WalletChallengeResponse>(buildUrl("/v1/public/auth/challenge", { wallet }), {
    method: "GET",
  });
}

export async function verifyWalletLogin(
  wallet: string,
  signature: string,
): Promise<WalletVerifyResponse> {
  return requestJson<WalletVerifyResponse>(buildUrl("/v1/public/auth/verify"), {
    method: "POST",
    body: JSON.stringify({ wallet, signature }),
  });
}
