export type MarketStats = {
  total_agents: number;
  total_providers: number;
  total_orders: number;
  avg_rating: number;
  total_spending_usdc: number;
};

export type MarketAgent = {
  id: string;
  name: string;
  description: string;
  endpoint?: string;
  price_usdc: number;
  tags: string[];
  provider_wallet?: string;
  provider_name?: string;
  avg_rating: number;
  rating_count: number;
  total_calls: number;
  status?: string;
  chain_status?: string;
  sol_asset_address?: string;
  ipfs_cid?: string;
  liveness?: "live" | "partial" | "not_live";
  created_at?: string;
};

export type AgentListResponse = {
  agents: MarketAgent[];
  total: number;
  page: number;
  limit: number;
  total_pages?: number;
};

export type AgentOnChainResponse = {
  agent_id: string;
  sol_asset_address: string;
  ipfs_metadata_uri: string;
  chain_status: string;
  creator: string;
  owner: string;
  reputation: {
    total_feedbacks: number;
    avg_score: number;
    transaction_count: number;
    rating_count: number;
  };
  liveness: "live" | "partial" | "not_live";
};

export type AgentFeedback = {
  id: string;
  tag1: string;
  tag2: string;
  value: number;
  ipfs_cid: string;
  tx_signature: string;
  created_at: string;
  comment?: string;
};

export type AgentFeedbacksResponse = {
  feedbacks: AgentFeedback[];
  total: number;
  page: number;
  limit: number;
};

export type MatchTop = {
  agent_id: string;
  name: string;
  score: number;
  price_usdc: number;
  reason: string;
};

export type MatchResponse = {
  top: MatchTop;
  alternatives: MatchTop[];
  reason: string;
};

export type FetchAgentsParams = {
  search?: string;
  tags?: string;
  sort?: "rating" | "price" | "newest" | "calls";
  order?: "asc" | "desc";
  min_price?: number;
  max_price?: number;
  page?: number;
  limit?: number;
  status?: string;
};

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

async function requestJson<T>(
  url: string,
  init?: RequestInit & { next?: { revalidate?: number } },
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Market API ${response.status}: ${body}`);
  }

  return (await response.json()) as T;
}

export async function fetchMarketStats(): Promise<MarketStats> {
  return requestJson<MarketStats>(buildUrl("/v1/public/market/stats"), {
    method: "GET",
    next: { revalidate: 300 },
  });
}

export async function fetchAgents(params: FetchAgentsParams = {}): Promise<AgentListResponse> {
  return requestJson<AgentListResponse>(buildUrl("/v1/public/market/agents", params), {
    method: "GET",
    next: { revalidate: 300 },
  });
}

export async function fetchAgentDetail(id: string): Promise<MarketAgent> {
  return requestJson<MarketAgent>(buildUrl(`/v1/public/market/agents/${id}`), {
    method: "GET",
    next: { revalidate: 300 },
  });
}

export async function fetchAgentOnChain(id: string): Promise<AgentOnChainResponse> {
  return requestJson<AgentOnChainResponse>(buildUrl(`/v1/public/market/agents/${id}/on-chain`), {
    method: "GET",
    next: { revalidate: 300 },
  });
}

export async function fetchAgentFeedbacks(
  id: string,
  page = 1,
  limit = 10,
): Promise<AgentFeedbacksResponse> {
  return requestJson<AgentFeedbacksResponse>(
    buildUrl(`/v1/public/market/agents/${id}/feedbacks`, { page, limit }),
    {
      method: "GET",
      next: { revalidate: 300 },
    },
  );
}

export async function matchAgent(
  task: string,
  options?: { max_price_usdc?: number; tags?: string[] },
): Promise<MatchResponse> {
  return requestJson<MatchResponse>(buildUrl("/v1/public/match"), {
    method: "POST",
    body: JSON.stringify({
      task,
      ...(options?.max_price_usdc !== undefined
        ? { max_price_usdc: options.max_price_usdc }
        : {}),
      ...(options?.tags?.length ? { tags: options.tags } : {}),
    }),
  });
}
