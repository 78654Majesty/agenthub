import { getToken } from "@/lib/auth";

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

type QueryValue = string | number | undefined;

function buildUrl(path: string, query?: Record<string, QueryValue>) {
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

function resolveAuthToken(explicitToken?: string) {
  if (explicitToken) {
    return explicitToken;
  }

  return getToken();
}

async function requestJson<T>(
  path: string,
  options?: {
    method?: "GET" | "POST";
    query?: Record<string, QueryValue>;
    body?: unknown;
    token?: string;
    next?: { revalidate?: number };
  },
): Promise<T> {
  const token = resolveAuthToken(options?.token);
  if (!token) {
    throw new Error("Missing wallet token");
  }

  const response = await fetch(buildUrl(path, options?.query), {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
    next: options?.next,
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string"
        ? payload.message
        : `User API request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return payload as T;
}

export type UserDashboardResponse = {
  spending: {
    total_usdc_micro: number;
    total_calls: number;
    this_month_usdc_micro: number;
    this_month_calls: number;
  };
  revenue: {
    total_usdc_micro: number;
    total_orders: number;
    this_month_usdc_micro: number;
    this_month_orders: number;
    growth_pct: number;
  };
  agents: {
    total: number;
    active: number;
    pending: number;
    rejected: number;
  };
  rating: {
    average: number;
    total_reviews: number;
  };
};

export type UserOrderItem = {
  id: string;
  type: "initiated" | "received";
  agent_id: string;
  agent_name: string;
  counterparty_wallet: string;
  amount_usdc_micro: number;
  status: string;
  payment_verified: boolean;
  payment_tx: string | null;
  payment_network: string | null;
  response_time_ms: number | null;
  error_code: string | null;
  created_at: string;
};

export type UserOrdersResponse = {
  orders: UserOrderItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  agents: Array<{
    id: string;
    name: string;
  }>;
};

export async function fetchDashboard(options?: {
  token?: string;
  revalidate?: number;
}): Promise<UserDashboardResponse> {
  return requestJson<UserDashboardResponse>("/v1/user/dashboard", {
    token: options?.token,
    next: options?.revalidate ? { revalidate: options.revalidate } : undefined,
  });
}

export async function fetchOrders(
  params?: {
    search?: string;
    type?: "initiated" | "received";
    status?: string;
    agent_id?: string;
    sort?: "created_at" | "amount";
    order?: "asc" | "desc";
    page?: number;
    limit?: number;
    format?: string;
  },
  options?: {
    token?: string;
    revalidate?: number;
  },
): Promise<UserOrdersResponse> {
  return requestJson<UserOrdersResponse>("/v1/user/orders", {
    query: params,
    token: options?.token,
    next: options?.revalidate ? { revalidate: options.revalidate } : undefined,
  });
}
