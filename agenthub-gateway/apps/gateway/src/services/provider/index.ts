import type { Prisma } from "@prisma/client";

import { PROVIDER_ERRORS } from "../../lib/errors/provider";
import { prisma } from "../../lib/prisma";

const USDC_DIVISOR = 1_000_000;

type AgentEditableInput = {
  name?: string;
  description?: string;
  capabilityTags?: string[];
  endpointUrl?: string;
  priceUsdcMicro?: number;
  skills?: string[];
  domains?: string[];
  inputSchema?: string | null;
  outputFormat?: string | null;
  resubmit?: boolean;
};

type ListMyAgentsParams = {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
};

type ListMyRatingsParams = {
  agentId?: string;
  page?: number;
  limit?: number;
};

type ListProviderOrdersParams = {
  status?: string;
  agentId?: string;
  page?: number;
  limit?: number;
};

function parsePage(page?: number) {
  if (!page || Number.isNaN(page) || page < 1) {
    return 1;
  }
  return Math.floor(page);
}

function parseLimit(limit: number | undefined, fallback: number) {
  if (!limit || Number.isNaN(limit) || limit < 1) {
    return fallback;
  }
  return Math.min(100, Math.floor(limit));
}

function toUsdc(micro: number | null | undefined) {
  if (!micro) {
    return 0;
  }
  return Number((micro / USDC_DIVISOR).toFixed(2));
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

function normalizeStringArray(values?: string[]) {
  return JSON.stringify(
    (values ?? [])
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function shortenWallet(pubkey: string) {
  if (pubkey.length <= 10) {
    return pubkey;
  }
  return `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}`;
}

async function getWalletByPubkey(walletPubkey: string, options?: { createIfMissing?: boolean }) {
  if (!walletPubkey) {
    return null;
  }

  if (options?.createIfMissing) {
    return prisma.wallet.upsert({
      where: { pubkey: walletPubkey },
      update: { lastLoginAt: new Date() },
      create: {
        pubkey: walletPubkey,
        source: "web",
        lastLoginAt: new Date(),
      },
    });
  }

  return prisma.wallet.findUnique({
    where: { pubkey: walletPubkey },
  });
}

async function requireOwnedAgent(providerWalletId: string, agentId: string) {
  const ownedAgent = await prisma.agent.findFirst({
    where: {
      id: agentId,
      providerWalletId,
    },
    include: {
      providerWallet: {
        select: { pubkey: true },
      },
    },
  });

  if (ownedAgent) {
    return ownedAgent;
  }

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { id: true },
  });

  if (!agent) {
    throw new Error(PROVIDER_ERRORS.AGENT_NOT_FOUND);
  }

  throw new Error(PROVIDER_ERRORS.FORBIDDEN_AGENT_ACCESS);
}

function mapAgentSummary(
  agent: Prisma.AgentGetPayload<{
    include: { providerWallet: { select: { pubkey: true } } };
  }>,
) {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    capability_tags: parseJsonArray(agent.capabilityTags),
    tags: parseJsonArray(agent.capabilityTags),
    price_usdc: toUsdc(agent.priceUsdcMicro),
    price_usdc_micro: agent.priceUsdcMicro,
    status: agent.status,
    review_note: agent.reviewNote,
    chain_status: agent.chainStatus,
    provider_wallet: agent.providerWallet.pubkey,
    provider_name: shortenWallet(agent.providerWallet.pubkey),
    avg_rating: Number((agent.ratingAvg ?? 0).toFixed(2)),
    rating_count: agent.ratingCount,
    total_orders: agent.totalOrders,
    endpoint_url: agent.endpointUrl,
    created_at: agent.createdAt.toISOString(),
    updated_at: agent.updatedAt.toISOString(),
  };
}

function mapAgentDetail(
  agent: Prisma.AgentGetPayload<{
    include: { providerWallet: { select: { pubkey: true } } };
  }>,
) {
  return {
    ...mapAgentSummary(agent),
    skills: parseJsonArray(agent.skills),
    domains: parseJsonArray(agent.domains),
    input_schema: agent.inputSchema,
    output_format: agent.outputFormat,
    sol_asset_address: agent.solAssetAddress,
    ipfs_cid: agent.ipfsCid,
    ipfs_uri: agent.ipfsUri,
    register_tx: agent.solPublishTx,
    registered_at: agent.registeredAt?.toISOString() ?? null,
    avg_response_seconds: Number((agent.avgResponseTimeMs / 1000).toFixed(1)),
  };
}

function buildAgentWhere(providerWalletId: string, params: ListMyAgentsParams): Prisma.AgentWhereInput {
  const andFilters: Prisma.AgentWhereInput[] = [{ providerWalletId }];

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

  return { AND: andFilters };
}

export async function createAgent(walletPubkey: string, input: Required<Omit<AgentEditableInput, "resubmit">>) {
  const wallet = await getWalletByPubkey(walletPubkey, { createIfMissing: true });
  if (!wallet) {
    throw new Error(PROVIDER_ERRORS.FORBIDDEN_AGENT_ACCESS);
  }

  const agent = await prisma.agent.create({
    data: {
      providerWalletId: wallet.id,
      name: input.name,
      description: input.description,
      capabilityTags: normalizeStringArray(input.capabilityTags),
      endpointUrl: input.endpointUrl,
      priceUsdcMicro: input.priceUsdcMicro,
      skills: normalizeStringArray(input.skills),
      domains: normalizeStringArray(input.domains),
      inputSchema: input.inputSchema ?? null,
      outputFormat: input.outputFormat ?? null,
      status: "pending_review",
      chainStatus: "none",
    },
    include: {
      providerWallet: {
        select: { pubkey: true },
      },
    },
  });

  return mapAgentDetail(agent);
}

export async function listMyAgents(walletPubkey: string, params: ListMyAgentsParams = {}) {
  const wallet = await getWalletByPubkey(walletPubkey);
  const page = parsePage(params.page);
  const limit = parseLimit(params.limit, 20);

  if (!wallet) {
    return {
      agents: [],
      total: 0,
      page,
      limit,
      total_pages: 1,
      status_counts: {
        all: 0,
        active: 0,
        pending_review: 0,
        rejected: 0,
        suspended: 0,
      },
    };
  }

  const where = buildAgentWhere(wallet.id, params);
  const allWhere = buildAgentWhere(wallet.id, {});

  const [agents, total, grouped] = await Promise.all([
    prisma.agent.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        providerWallet: {
          select: { pubkey: true },
        },
      },
    }),
    prisma.agent.count({ where }),
    prisma.agent.groupBy({
      by: ["status"],
      where: allWhere,
      _count: { _all: true },
    }),
  ]);

  const statusCounts = {
    all: grouped.reduce((sum, item) => sum + item._count._all, 0),
    active: 0,
    pending_review: 0,
    rejected: 0,
    suspended: 0,
  };

  for (const item of grouped) {
    if (item.status in statusCounts) {
      statusCounts[item.status as keyof typeof statusCounts] = item._count._all;
    }
  }

  return {
    agents: agents.map(mapAgentSummary),
    total,
    page,
    limit,
    total_pages: Math.max(1, Math.ceil(total / limit)),
    status_counts: statusCounts,
  };
}

export async function getMyAgent(walletPubkey: string, agentId: string) {
  const wallet = await getWalletByPubkey(walletPubkey);
  if (!wallet) {
    throw new Error(PROVIDER_ERRORS.FORBIDDEN_AGENT_ACCESS);
  }

  const agent = await requireOwnedAgent(wallet.id, agentId);
  return mapAgentDetail(agent);
}

export async function updateAgent(walletPubkey: string, agentId: string, input: AgentEditableInput) {
  const wallet = await getWalletByPubkey(walletPubkey);
  if (!wallet) {
    throw new Error(PROVIDER_ERRORS.FORBIDDEN_AGENT_ACCESS);
  }

  const currentAgent = await requireOwnedAgent(wallet.id, agentId);
  if (currentAgent.status === "suspended") {
    throw new Error(PROVIDER_ERRORS.INVALID_AGENT_STATUS);
  }

  const data: Prisma.AgentUpdateInput = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.capabilityTags !== undefined) data.capabilityTags = normalizeStringArray(input.capabilityTags);
  if (input.endpointUrl !== undefined) data.endpointUrl = input.endpointUrl;
  if (input.priceUsdcMicro !== undefined) data.priceUsdcMicro = input.priceUsdcMicro;
  if (input.skills !== undefined) data.skills = normalizeStringArray(input.skills);
  if (input.domains !== undefined) data.domains = normalizeStringArray(input.domains);
  if (input.inputSchema !== undefined) data.inputSchema = input.inputSchema;
  if (input.outputFormat !== undefined) data.outputFormat = input.outputFormat;

  if (input.resubmit && currentAgent.status === "rejected") {
    data.status = "pending_review";
    data.reviewNote = null;
    data.reviewedAt = null;
  }

  const agent = await prisma.agent.update({
    where: { id: agentId },
    data,
    include: {
      providerWallet: {
        select: { pubkey: true },
      },
    },
  });

  return mapAgentDetail(agent);
}

export async function listMyRatings(walletPubkey: string, params: ListMyRatingsParams = {}) {
  const wallet = await getWalletByPubkey(walletPubkey);
  const page = parsePage(params.page);
  const limit = parseLimit(params.limit, 20);

  if (!wallet) {
    return {
      ratings: [],
      total: 0,
      page,
      limit,
    };
  }

  const where: Prisma.RatingWhereInput = {
    agent: {
      providerWalletId: wallet.id,
    },
    ...(params.agentId ? { agentId: params.agentId } : {}),
  };

  const [ratings, total] = await Promise.all([
    prisma.rating.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
        consumerWallet: {
          select: { pubkey: true },
        },
        receipt: {
          select: {
            feedbackTx: true,
          },
        },
      },
    }),
    prisma.rating.count({ where }),
  ]);

  return {
    ratings: ratings.map((rating) => ({
      id: rating.id,
      agent_id: rating.agent.id,
      agent_name: rating.agent.name,
      consumer_wallet: shortenWallet(rating.consumerWallet.pubkey),
      score: rating.score,
      comment: rating.comment,
      feedback_tx: rating.feedbackTx ?? rating.receipt.feedbackTx ?? null,
      created_at: rating.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
  };
}

export async function getRatingDistribution(walletPubkey: string) {
  const wallet = await getWalletByPubkey(walletPubkey);

  if (!wallet) {
    return {
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      total: 0,
      average: 0,
    };
  }

  const [grouped, avg] = await Promise.all([
    prisma.rating.groupBy({
      by: ["score"],
      where: {
        agent: {
          providerWalletId: wallet.id,
        },
      },
      _count: { _all: true },
    }),
    prisma.rating.aggregate({
      where: {
        agent: {
          providerWalletId: wallet.id,
        },
      },
      _avg: { score: true },
      _count: { _all: true },
    }),
  ]);

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const item of grouped) {
    if (item.score >= 1 && item.score <= 5) {
      distribution[item.score as keyof typeof distribution] = item._count._all;
    }
  }

  return {
    distribution,
    total: avg._count._all,
    average: Number((avg._avg.score ?? 0).toFixed(2)),
  };
}

export async function listProviderOrders(walletPubkey: string, params: ListProviderOrdersParams = {}) {
  const wallet = await getWalletByPubkey(walletPubkey);
  const page = parsePage(params.page);
  const limit = parseLimit(params.limit, 20);

  if (!wallet) {
    return {
      orders: [],
      total: 0,
      page,
      limit,
      total_pages: 1,
    };
  }

  const where: Prisma.OrderWhereInput = {
    agent: {
      providerWalletId: wallet.id,
    },
    ...(params.status ? { status: params.status } : {}),
    ...(params.agentId ? { agentId: params.agentId } : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
        consumerWallet: {
          select: { pubkey: true },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders: orders.map((order) => ({
      id: order.id,
      agent_id: order.agent.id,
      agent_name: order.agent.name,
      consumer_wallet: shortenWallet(order.consumerWallet.pubkey),
      status: order.status,
      payment_verified: order.paymentVerified,
      payment_amount_usdc: toUsdc(order.paymentAmount),
      payment_tx: order.paymentTx,
      response_time_ms: order.responseTimeMs,
      created_at: order.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
    total_pages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getProviderDashboard(walletPubkey: string) {
  const wallet = await getWalletByPubkey(walletPubkey);

  if (!wallet) {
    return {
      total_revenue_usdc: 0,
      total_orders: 0,
      total_agents: 0,
      active_agents: 0,
      pending_agents: 0,
      avg_rating: 0,
    };
  }

  const [ordersAgg, agentsGrouped, ratingAgg] = await Promise.all([
    prisma.order.aggregate({
      where: {
        agent: {
          providerWalletId: wallet.id,
        },
        paymentVerified: true,
      },
      _count: { _all: true },
      _sum: { paymentAmount: true },
    }),
    prisma.agent.groupBy({
      by: ["status"],
      where: { providerWalletId: wallet.id },
      _count: { _all: true },
    }),
    prisma.agent.aggregate({
      where: { providerWalletId: wallet.id },
      _avg: { ratingAvg: true },
    }),
  ]);

  const counts = {
    total: 0,
    active: 0,
    pending_review: 0,
  };

  for (const item of agentsGrouped) {
    counts.total += item._count._all;
    if (item.status === "active") {
      counts.active = item._count._all;
    }
    if (item.status === "pending_review") {
      counts.pending_review = item._count._all;
    }
  }

  return {
    total_revenue_usdc: toUsdc(ordersAgg._sum.paymentAmount),
    total_orders: ordersAgg._count._all,
    total_agents: counts.total,
    active_agents: counts.active,
    pending_agents: counts.pending_review,
    avg_rating: Number((ratingAgg._avg.ratingAvg ?? 0).toFixed(2)),
  };
}
