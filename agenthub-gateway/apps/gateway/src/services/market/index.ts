import type { Prisma } from "@prisma/client";

import { MARKET_ERRORS } from "../../lib/errors/market";
import { prisma } from "../../lib/prisma";
import type { MatchableAgent } from "../match.service";

const USDC_DIVISOR = 1_000_000;

type ListAgentsParams = {
  search?: string;
  tags?: string;
  sort?: "rating" | "price" | "newest" | "calls";
  order?: "asc" | "desc";
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
  status?: string;
};

type ListFeedbacksParams = {
  page?: number;
  limit?: number;
};

function parsePage(page?: number): number {
  if (!page || Number.isNaN(page) || page < 1) {
    return 1;
  }
  return Math.floor(page);
}

function parseLimit(limit: number | undefined, fallback: number): number {
  if (!limit || Number.isNaN(limit) || limit < 1) {
    return fallback;
  }
  return Math.min(100, Math.floor(limit));
}

function toUsdc(micro: number | null | undefined): number {
  if (!micro) {
    return 0;
  }
  return Number((micro / USDC_DIVISOR).toFixed(2));
}

function toMicro(usdc?: number): number | undefined {
  if (typeof usdc !== "number" || Number.isNaN(usdc)) {
    return undefined;
  }
  return Math.round(usdc * USDC_DIVISOR);
}

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function shortenWallet(pubkey: string): string {
  if (pubkey.length <= 10) {
    return pubkey;
  }
  return `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}`;
}

function toLiveness(status: string, chainStatus: string): "live" | "partial" | "not_live" {
  if (status !== "active") {
    return "not_live";
  }
  if (chainStatus === "registered") {
    return "live";
  }
  return "partial";
}

function buildWhere(params: ListAgentsParams): Prisma.AgentWhereInput {
  const andFilters: Prisma.AgentWhereInput[] = [];

  if (params.status) {
    andFilters.push({ status: params.status });
  }

  if (params.search) {
    andFilters.push({
      OR: [
        { name: { contains: params.search } },
        { description: { contains: params.search } },
      ],
    });
  }

  const tags = (params.tags ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  if (tags.length > 0) {
    andFilters.push(
      ...tags.map((tag) => ({
        capabilityTags: {
          contains: tag,
        },
      })),
    );
  }

  const minMicro = toMicro(params.minPrice);
  const maxMicro = toMicro(params.maxPrice);
  if (minMicro !== undefined || maxMicro !== undefined) {
    andFilters.push({
      priceUsdcMicro: {
        ...(minMicro !== undefined ? { gte: minMicro } : {}),
        ...(maxMicro !== undefined ? { lte: maxMicro } : {}),
      },
    });
  }

  if (andFilters.length === 0) {
    return {};
  }
  return { AND: andFilters };
}

function buildOrderBy(params: ListAgentsParams): Prisma.AgentOrderByWithRelationInput[] {
  const direction = params.order === "asc" ? "asc" : "desc";
  if (params.sort === "price") {
    return [{ priceUsdcMicro: direction }];
  }
  if (params.sort === "newest") {
    return [{ createdAt: direction }];
  }
  if (params.sort === "calls") {
    return [{ totalOrders: direction }];
  }
  return [{ ratingAvg: direction }];
}

export async function getMarketStats() {
  const [totalAgents, providersGrouped, totalOrders, ratingAgg, spendingAgg] = await Promise.all([
    prisma.agent.count({ where: { status: "active" } }),
    prisma.agent.groupBy({
      by: ["providerWalletId"],
      where: { status: "active" },
    }),
    prisma.order.count(),
    prisma.agent.aggregate({
      where: { status: "active" },
      _avg: { ratingAvg: true },
    }),
    prisma.order.aggregate({
      where: { paymentVerified: true },
      _sum: { paymentAmount: true },
    }),
  ]);

  return {
    total_agents: totalAgents,
    total_providers: providersGrouped.length,
    total_orders: totalOrders,
    avg_rating: Number((ratingAgg._avg.ratingAvg ?? 0).toFixed(2)),
    total_spending_usdc: toUsdc(spendingAgg._sum.paymentAmount),
  };
}

export async function listAgents(params: ListAgentsParams = {}) {
  const page = parsePage(params.page);
  const limit = parseLimit(params.limit, 9);
  const skip = (page - 1) * limit;
  const where = buildWhere({
    ...params,
    status: params.status ?? "active",
  });
  const orderBy = buildOrderBy(params);

  const [agents, total] = await Promise.all([
    prisma.agent.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        providerWallet: {
          select: { pubkey: true },
        },
      },
    }),
    prisma.agent.count({ where }),
  ]);

  return {
    agents: agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      endpoint: agent.endpointUrl,
      price_usdc: toUsdc(agent.priceUsdcMicro),
      tags: parseJsonArray(agent.capabilityTags),
      provider_wallet: agent.providerWallet.pubkey,
      provider_name: shortenWallet(agent.providerWallet.pubkey),
      avg_rating: Number((agent.ratingAvg ?? 0).toFixed(2)),
      rating_count: agent.ratingCount,
      total_calls: agent.totalOrders,
      status: agent.status,
      chain_status: agent.chainStatus,
      sol_asset_address: agent.solAssetAddress ?? undefined,
      ipfs_cid: agent.ipfsCid ?? undefined,
      liveness: toLiveness(agent.status, agent.chainStatus),
      created_at: agent.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
    total_pages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getAgent(id: string) {
  const agent = await prisma.agent.findFirst({
    where: {
      id,
      status: "active",
    },
    include: {
      providerWallet: {
        select: { pubkey: true },
      },
    },
  });

  if (!agent) {
    throw new Error(MARKET_ERRORS.AGENT_NOT_FOUND);
  }

  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    endpoint: agent.endpointUrl,
    price_usdc: toUsdc(agent.priceUsdcMicro),
    tags: parseJsonArray(agent.capabilityTags),
    provider_wallet: agent.providerWallet.pubkey,
    provider_name: shortenWallet(agent.providerWallet.pubkey),
    avg_rating: Number((agent.ratingAvg ?? 0).toFixed(2)),
    rating_count: agent.ratingCount,
    total_calls: agent.totalOrders,
    status: agent.status,
    chain_status: agent.chainStatus,
    sol_asset_address: agent.solAssetAddress ?? undefined,
    ipfs_cid: agent.ipfsCid ?? undefined,
    created_at: agent.createdAt.toISOString(),
  };
}

export async function getAgentOnChain(id: string) {
  const agent = await prisma.agent.findFirst({
    where: {
      id,
      status: "active",
    },
    include: {
      providerWallet: {
        select: { pubkey: true },
      },
    },
  });

  if (!agent) {
    throw new Error(MARKET_ERRORS.AGENT_NOT_FOUND);
  }

  const [ratingAgg, totalFeedbacks, transactionCount] = await Promise.all([
    prisma.rating.aggregate({
      where: { agentId: id },
      _avg: { score: true },
      _count: { id: true },
    }),
    prisma.receipt.count({ where: { agentId: id } }),
    prisma.order.count({
      where: {
        agentId: id,
        paymentVerified: true,
      },
    }),
  ]);

  return {
    agent_id: agent.id,
    sol_asset_address: agent.solAssetAddress ?? "",
    ipfs_metadata_uri: agent.ipfsUri ?? (agent.ipfsCid ? `ipfs://${agent.ipfsCid}` : ""),
    chain_status: agent.chainStatus,
    creator: "platform",
    owner: agent.providerWallet.pubkey,
    reputation: {
      total_feedbacks: totalFeedbacks,
      avg_score: Math.round((ratingAgg._avg.score ?? 0) * 20),
      transaction_count: transactionCount,
      rating_count: ratingAgg._count.id,
    },
    liveness: toLiveness(agent.status, agent.chainStatus),
  };
}

export async function getAgentFeedbacks(id: string, params: ListFeedbacksParams = {}) {
  const exists = await prisma.agent.findFirst({
    where: { id, status: "active" },
    select: { id: true },
  });
  if (!exists) {
    throw new Error(MARKET_ERRORS.AGENT_NOT_FOUND);
  }

  const page = parsePage(params.page);
  const limit = parseLimit(params.limit, 10);
  const skip = (page - 1) * limit;

  const [ratings, total] = await Promise.all([
    prisma.rating.findMany({
      where: { agentId: id },
      orderBy: [{ createdAt: "desc" }],
      skip,
      take: limit,
    }),
    prisma.rating.count({ where: { agentId: id } }),
  ]);

  return {
    feedbacks: ratings.map((rating) => ({
      id: rating.id,
      tag1: "starred",
      tag2: "user_rating",
      value: rating.score * 20,
      ipfs_cid: rating.feedbackIpfsCid ?? "",
      tx_signature: rating.feedbackTx ?? "",
      created_at: rating.createdAt.toISOString(),
      comment: rating.comment ?? "",
    })),
    total,
    page,
    limit,
  };
}

export async function listMatchableAgents(): Promise<MatchableAgent[]> {
  const agents = await prisma.agent.findMany({
    where: { status: "active" },
    orderBy: [{ ratingAvg: "desc" }],
  });

  return agents.map((agent) => ({
    agentId: agent.id,
    name: agent.name,
    description: agent.description,
    endpointUrl: agent.endpointUrl,
    priceUsdcMicro: agent.priceUsdcMicro,
    ratingAvg: agent.ratingAvg,
    capabilityTags: parseJsonArray(agent.capabilityTags),
  }));
}
