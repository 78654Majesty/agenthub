/**
 * @file api/admin.ts
 * @owner Dev B
 * @module lib/api/admin
 *
 * Admin API client.
 *
 * Exports:
 *   - adminLogin()
 *   - fetchAdminStats()
 *   - fetchAdminAgents()
 *   - approveAgent()
 *   - rejectAgent()
 *   - retryAgent()
 *   - fetchFailedReceipts()
 *   - retryReceipt()
 *   - fetchAdminUsers()
 *   - fetchAdminUsersStats()
 */

const DEFAULT_BASE_URL = "http://localhost:8081";
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

const ADMIN_TOKEN_STORAGE_KEY = "agenthub.admin.token";
const ADMIN_USERNAME_STORAGE_KEY = "agenthub.admin.username";
const ADMIN_TOKEN_COOKIE_KEY = "admin_token";
const COOKIE_MAX_AGE = 60 * 60 * 24;

export type AdminLoginResponse = {
  token: string;
  admin_id: string;
  username: string;
  expires_in: number;
};

export type AdminSession = {
  admin_id: string;
  username: string;
};

export type AdminStats = {
  total_agents: number;
  agents_by_status: {
    active: number;
    pending_review: number;
    rejected: number;
    suspended: number;
  };
  total_orders: number;
  orders_this_week: number;
  total_revenue_usdc: number;
  revenue_this_week_usdc: number;
  active_wallets: number;
  new_wallets_this_month: number;
  failed_receipts_count: number;
};

export type AdminAgentStatus = "pending_review" | "active" | "rejected" | "suspended";

export type AdminAgent = {
  id: string;
  name: string;
  description: string;
  provider_wallet: string;
  price_usdc: number;
  tags: string[];
  skills: string[];
  domains: string[];
  status: AdminAgentStatus;
  review_note: string | null;
  chain_status: string;
  sol_asset_address: string | null;
  ipfs_uri: string | null;
  ipfs_cid: string | null;
  chain_tx: string | null;
  chain_error: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminAgentsResponse = {
  agents: AdminAgent[];
  total: number;
  page: number;
  limit: number;
};

export type FailedReceipt = {
  id: string;
  agent_name: string;
  agent_id: string;
  consumer_wallet: string;
  amount_usdc: number;
  error: string;
  feedback_status: "failed" | "pending" | "submitted";
  retry_count: number;
  max_retries: number;
  created_at: string;
};

export type FailedReceiptsResponse = {
  receipts: FailedReceipt[];
  total: number;
  page: number;
  limit: number;
};

export type RetryReceiptResponse = {
  receipt_id: string;
  feedback_status: "failed" | "pending" | "submitted";
  retry_count: number;
  message: string;
};

export type AdminUser = {
  wallet_id: string;
  pubkey: string;
  agents_count: number;
  orders_count: number;
  spending_usdc: number;
  revenue_usdc: number;
  source: string;
  last_active: string;
  created_at: string;
};

export type AdminUsersResponse = {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
};

export type AdminUsersStats = {
  total_wallets: number;
  active_this_week: number;
  new_this_month: number;
};

type QueryValue = string | number | undefined;

type QueryRecord = Record<string, QueryValue>;

function buildUrl(path: string, query?: QueryRecord): string {
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

function readErrorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === "object") {
    const maybe = payload as { error?: string; message?: string };
    if (maybe.message) {
      return maybe.message;
    }
    if (maybe.error) {
      return maybe.error;
    }
  }

  return `Admin API request failed with status ${status}.`;
}

async function requestJson<T>(
  path: string,
  options?: {
    method?: "GET" | "POST";
    query?: QueryRecord;
    body?: unknown;
    requireAuth?: boolean;
  },
): Promise<T> {
  const token = options?.requireAuth === false ? null : getAdminToken();
  const response = await fetch(buildUrl(path, options?.query), {
    method: options?.method ?? "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    if (response.status === 401 && options?.requireAuth !== false && typeof window !== "undefined") {
      clearAdminSession();
      window.location.assign("/admin/login");
    }
    throw new Error(readErrorMessage(payload, response.status));
  }

  return payload as T;
}

function setAdminCookie(token: string) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${ADMIN_TOKEN_COOKIE_KEY}=${encodeURIComponent(token)}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Strict`;
}

export function saveAdminSession(token: string, username: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
  window.localStorage.setItem(ADMIN_USERNAME_STORAGE_KEY, username);
  setAdminCookie(token);
}

export function clearAdminSession() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(ADMIN_USERNAME_STORAGE_KEY);
  }
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
}

export function getAdminUsername(): string {
  if (typeof window === "undefined") {
    return "admin";
  }

  return window.localStorage.getItem(ADMIN_USERNAME_STORAGE_KEY) ?? "admin";
}

export async function adminLogin(username: string, password: string): Promise<AdminLoginResponse> {
  const data = await requestJson<AdminLoginResponse>("/v1/admin/auth/login", {
    method: "POST",
    body: { username, password },
    requireAuth: false,
  });

  saveAdminSession(data.token, data.username);
  return data;
}

export async function fetchAdminSession(): Promise<AdminSession> {
  return requestJson<AdminSession>("/v1/admin/auth/me");
}

export async function fetchAdminStats(): Promise<AdminStats> {
  return requestJson<AdminStats>("/v1/admin/stats");
}

export async function fetchAdminAgents(params?: {
  status?: AdminAgentStatus;
  sort?: "newest" | "name" | "price";
  page?: number;
  limit?: number;
}): Promise<AdminAgentsResponse> {
  return requestJson<AdminAgentsResponse>("/v1/admin/agents", {
    query: params,
  });
}

export async function approveAgent(id: string, note: string): Promise<{
  agent_id: string;
  status: "active";
  sol_asset_address: string;
  ipfs_uri: string;
  ipfs_cid: string;
  chain_tx: string;
  explorer_link: string;
}> {
  return requestJson(`/v1/admin/agents/${id}/approve`, {
    method: "POST",
    body: { note },
  });
}

export async function rejectAgent(id: string, note: string): Promise<{
  agent_id: string;
  status: "rejected";
  review_note: string;
}> {
  return requestJson(`/v1/admin/agents/${id}/reject`, {
    method: "POST",
    body: { note },
  });
}

export async function retryAgent(id: string): Promise<{
  agent_id: string;
  status: "active";
  sol_asset_address: string;
  ipfs_uri: string;
  ipfs_cid: string;
  chain_tx: string;
  explorer_link: string;
}> {
  return requestJson(`/v1/admin/agents/${id}/retry`, {
    method: "POST",
  });
}

export async function fetchFailedReceipts(params?: {
  page?: number;
  limit?: number;
}): Promise<FailedReceiptsResponse> {
  return requestJson<FailedReceiptsResponse>("/v1/admin/receipts/failed", {
    query: params,
  });
}

export async function retryReceipt(id: string): Promise<RetryReceiptResponse> {
  return requestJson<RetryReceiptResponse>(`/v1/admin/receipts/${id}/retry`, {
    method: "POST",
  });
}

export async function fetchAdminUsers(params?: {
  search?: string;
  sort?: "last_active" | "spending" | "revenue" | "agents" | "orders";
  page?: number;
  limit?: number;
}): Promise<AdminUsersResponse> {
  return requestJson<AdminUsersResponse>("/v1/admin/users", {
    query: params,
  });
}

export async function fetchAdminUsersStats(): Promise<AdminUsersStats> {
  return requestJson<AdminUsersStats>("/v1/admin/users/stats");
}
