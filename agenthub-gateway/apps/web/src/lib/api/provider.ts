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
    method?: "GET" | "POST" | "PATCH";
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
        : `Provider API request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return payload as T;
}

export type ProviderAgentStatus = "active" | "pending_review" | "rejected" | "suspended";

export type ProviderAgentSummary = {
  id: string;
  name: string;
  description: string;
  capability_tags: string[];
  tags: string[];
  price_usdc: number;
  price_usdc_micro: number;
  status: ProviderAgentStatus;
  review_note: string | null;
  chain_status: string;
  provider_wallet: string;
  provider_name: string;
  avg_rating: number;
  rating_count: number;
  total_orders: number;
  endpoint_url: string;
  created_at: string;
  updated_at: string;
};

export type ProviderAgentDetail = ProviderAgentSummary & {
  skills: string[];
  domains: string[];
  input_schema: string | null;
  output_format: string | null;
  sol_asset_address: string | null;
  ipfs_cid: string | null;
  ipfs_uri: string | null;
  register_tx: string | null;
  registered_at: string | null;
  avg_response_seconds: number;
};

export type MyAgentsResponse = {
  agents: ProviderAgentSummary[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  status_counts: {
    all: number;
    active: number;
    pending_review: number;
    rejected: number;
    suspended: number;
  };
};

export type ProviderRatingItem = {
  id: string;
  agent_id: string;
  agent_name: string;
  consumer_wallet: string;
  score: number;
  comment: string | null;
  feedback_tx: string | null;
  created_at: string;
};

export type ProviderRatingsResponse = {
  ratings: ProviderRatingItem[];
  total: number;
  page: number;
  limit: number;
};

export type ProviderRatingDistribution = {
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  total: number;
  average: number;
};

export type ProviderOrderItem = {
  id: string;
  agent_id: string;
  agent_name: string;
  consumer_wallet: string;
  status: string;
  payment_verified: boolean;
  payment_amount_usdc: number;
  payment_tx: string | null;
  response_time_ms: number | null;
  created_at: string;
};

export type ProviderOrdersResponse = {
  orders: ProviderOrderItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};

export type ProviderDashboard = {
  total_revenue_usdc: number;
  total_orders: number;
  total_agents: number;
  active_agents: number;
  pending_agents: number;
  avg_rating: number;
};

export type UpsertProviderAgentPayload = {
  name: string;
  description: string;
  capability_tags: string[];
  endpoint_url: string;
  price_usdc_micro: number;
  skills: string[];
  domains: string[];
  input_schema?: string | null;
  output_format?: string | null;
  resubmit?: boolean;
};

export async function fetchMyAgents(
  params?: {
    search?: string;
    status?: ProviderAgentStatus;
    page?: number;
    limit?: number;
  },
  options?: { token?: string; revalidate?: number },
): Promise<MyAgentsResponse> {
  return requestJson<MyAgentsResponse>("/v1/provider/agents", {
    query: params,
    token: options?.token,
    next: options?.revalidate ? { revalidate: options.revalidate } : undefined,
  });
}

export async function fetchMyAgent(
  id: string,
  options?: { token?: string; revalidate?: number },
): Promise<ProviderAgentDetail> {
  return requestJson<ProviderAgentDetail>(`/v1/provider/agents/${id}`, {
    token: options?.token,
    next: options?.revalidate ? { revalidate: options.revalidate } : undefined,
  });
}

export async function createAgent(payload: UpsertProviderAgentPayload, options?: { token?: string }) {
  return requestJson<ProviderAgentDetail>("/v1/provider/agents", {
    method: "POST",
    body: payload,
    token: options?.token,
  });
}

export async function updateAgent(
  id: string,
  payload: Partial<UpsertProviderAgentPayload>,
  options?: { token?: string },
) {
  return requestJson<ProviderAgentDetail>(`/v1/provider/agents/${id}`, {
    method: "PATCH",
    body: payload,
    token: options?.token,
  });
}

export async function fetchMyRatings(
  params?: {
    agent_id?: string;
    page?: number;
    limit?: number;
  },
  options?: { token?: string; revalidate?: number },
): Promise<ProviderRatingsResponse> {
  return requestJson<ProviderRatingsResponse>("/v1/provider/ratings", {
    query: params,
    token: options?.token,
    next: options?.revalidate ? { revalidate: options.revalidate } : undefined,
  });
}

export async function fetchRatingDistribution(options?: {
  token?: string;
  revalidate?: number;
}): Promise<ProviderRatingDistribution> {
  return requestJson<ProviderRatingDistribution>("/v1/provider/ratings/distribution", {
    token: options?.token,
    next: options?.revalidate ? { revalidate: options.revalidate } : undefined,
  });
}

export async function fetchProviderOrders(
  params?: {
    status?: string;
    agent_id?: string;
    page?: number;
    limit?: number;
  },
  options?: { token?: string; revalidate?: number },
): Promise<ProviderOrdersResponse> {
  return requestJson<ProviderOrdersResponse>("/v1/provider/orders", {
    query: params,
    token: options?.token,
    next: options?.revalidate ? { revalidate: options.revalidate } : undefined,
  });
}

export async function fetchProviderDashboard(options?: {
  token?: string;
  revalidate?: number;
}): Promise<ProviderDashboard> {
  return requestJson<ProviderDashboard>("/v1/provider/dashboard", {
    token: options?.token,
    next: options?.revalidate ? { revalidate: options.revalidate } : undefined,
  });
}
