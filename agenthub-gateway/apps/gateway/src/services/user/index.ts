import type { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";

const USDC_DIVISOR = 1_000_000;

type ListUserOrdersParams = {
  search?: string;
  type?: "initiated" | "received";
  status?: string;
  agentId?: string;
  sort?: "created_at" | "amount";
  order?: "asc" | "desc";
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

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfPreviousMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

function toUsdcMicroCsv(value: number | null | undefined) {
  return value ?? 0;
}

function shortenWallet(pubkey: string) {
  if (pubkey.length <= 10) {
    return pubkey;
  }
  return `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}`;
}

async function getWalletByPubkey(walletPubkey: string) {
  if (!walletPubkey) {
    return null;
  }

  return prisma.wallet.findUnique({
    where: { pubkey: walletPubkey },
  });
}

function computeGrowthPct(current: number, previous: number) {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
}

type LoadedOrder = Prisma.OrderGetPayload<{
  include: {
    agent: {
      include: {
        providerWallet: {
          select: { pubkey: true };
        };
      };
    };
    consumerWallet: {
      select: { pubkey: true };
    };
  };
}>;

function mapOrderForUser(order: LoadedOrder, currentWalletId: string) {
  const type = order.consumerWalletId === currentWalletId ? "initiated" : "received";
  const counterpartyWallet =
    type === "initiated" ? order.agent.providerWallet.pubkey : order.consumerWallet.pubkey;

  return {
    id: order.id,
    type,
    agent_id: order.agent.id,
    agent_name: order.agent.name,
    counterparty_wallet: shortenWallet(counterpartyWallet),
    amount_usdc_micro: toUsdcMicroCsv(order.paymentAmount),
    status: order.status,
    payment_verified: order.paymentVerified,
    payment_tx: order.paymentTx,
    payment_network: order.paymentNetwork,
    response_time_ms: order.responseTimeMs,
    error_code: order.errorCode,
    created_at: order.createdAt.toISOString(),
  };
}

export async function getUserDashboard(walletPubkey: string) {
  const wallet = await getWalletByPubkey(walletPubkey);

  if (!wallet) {
    return {
      spending: {
        total_usdc_micro: 0,
        total_calls: 0,
        this_month_usdc_micro: 0,
        this_month_calls: 0,
      },
      revenue: {
        total_usdc_micro: 0,
        total_orders: 0,
        this_month_usdc_micro: 0,
        this_month_orders: 0,
        growth_pct: 0,
      },
      agents: {
        total: 0,
        active: 0,
        pending: 0,
        rejected: 0,
      },
      rating: {
        average: 0,
        total_reviews: 0,
      },
    };
  }

  const monthStart = startOfMonth();
  const previousMonthStart = startOfPreviousMonth();

  const [
    spendingAll,
    spendingMonth,
    revenueAll,
    revenueMonth,
    revenuePrevMonth,
    agentCounts,
    ratingAgg,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: {
        consumerWalletId: wallet.id,
        paymentVerified: true,
      },
      _sum: { paymentAmount: true },
      _count: { _all: true },
    }),
    prisma.order.aggregate({
      where: {
        consumerWalletId: wallet.id,
        paymentVerified: true,
        createdAt: { gte: monthStart },
      },
      _sum: { paymentAmount: true },
      _count: { _all: true },
    }),
    prisma.order.aggregate({
      where: {
        agent: { providerWalletId: wallet.id },
        paymentVerified: true,
      },
      _sum: { paymentAmount: true },
      _count: { _all: true },
    }),
    prisma.order.aggregate({
      where: {
        agent: { providerWalletId: wallet.id },
        paymentVerified: true,
        createdAt: { gte: monthStart },
      },
      _sum: { paymentAmount: true },
      _count: { _all: true },
    }),
    prisma.order.aggregate({
      where: {
        agent: { providerWalletId: wallet.id },
        paymentVerified: true,
        createdAt: {
          gte: previousMonthStart,
          lt: monthStart,
        },
      },
      _sum: { paymentAmount: true },
    }),
    prisma.agent.groupBy({
      by: ["status"],
      where: { providerWalletId: wallet.id },
      _count: { _all: true },
    }),
    prisma.rating.aggregate({
      where: {
        agent: { providerWalletId: wallet.id },
      },
      _avg: { score: true },
      _count: { _all: true },
    }),
  ]);

  const agents = {
    total: 0,
    active: 0,
    pending: 0,
    rejected: 0,
  };

  for (const item of agentCounts) {
    agents.total += item._count._all;
    if (item.status === "active") {
      agents.active = item._count._all;
    }
    if (item.status === "pending_review") {
      agents.pending = item._count._all;
    }
    if (item.status === "rejected") {
      agents.rejected = item._count._all;
    }
  }

  return {
    spending: {
      total_usdc_micro: toUsdcMicroCsv(spendingAll._sum.paymentAmount),
      total_calls: spendingAll._count._all,
      this_month_usdc_micro: toUsdcMicroCsv(spendingMonth._sum.paymentAmount),
      this_month_calls: spendingMonth._count._all,
    },
    revenue: {
      total_usdc_micro: toUsdcMicroCsv(revenueAll._sum.paymentAmount),
      total_orders: revenueAll._count._all,
      this_month_usdc_micro: toUsdcMicroCsv(revenueMonth._sum.paymentAmount),
      this_month_orders: revenueMonth._count._all,
      growth_pct: computeGrowthPct(
        toUsdcMicroCsv(revenueMonth._sum.paymentAmount),
        toUsdcMicroCsv(revenuePrevMonth._sum.paymentAmount),
      ),
    },
    agents,
    rating: {
      average: Number((ratingAgg._avg.score ?? 0).toFixed(2)),
      total_reviews: ratingAgg._count._all,
    },
  };
}

export async function listUserOrders(walletPubkey: string, params: ListUserOrdersParams = {}) {
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
      agents: [],
    };
  }

  const where: Prisma.OrderWhereInput = {
    OR: [
      { consumerWalletId: wallet.id },
      { agent: { providerWalletId: wallet.id } },
    ],
    ...(params.status ? { status: params.status } : {}),
    ...(params.agentId ? { agentId: params.agentId } : {}),
  };

  if (params.type === "initiated") {
    where.OR = [{ consumerWalletId: wallet.id }];
  }
  if (params.type === "received") {
    where.OR = [{ agent: { providerWalletId: wallet.id } }];
  }

  if (params.search) {
    const term = params.search;
    const searchFilter: Prisma.OrderWhereInput = {
      OR: [
        { id: { contains: term } },
        { agent: { name: { contains: term } } },
        { consumerWallet: { pubkey: { contains: term } } },
        { agent: { providerWallet: { pubkey: { contains: term } } } },
      ],
    };

    Object.assign(where, { AND: [searchFilter] });
  }

  const orderBy: Prisma.OrderOrderByWithRelationInput[] =
    params.sort === "amount"
      ? [{ paymentAmount: params.order === "asc" ? "asc" : "desc" }]
      : [{ createdAt: params.order === "asc" ? "asc" : "desc" }];

  const [orders, total, agentOptions] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        agent: {
          include: {
            providerWallet: {
              select: { pubkey: true },
            },
          },
        },
        consumerWallet: {
          select: { pubkey: true },
        },
      },
    }),
    prisma.order.count({ where }),
    prisma.agent.findMany({
      where: {
        OR: [
          { providerWalletId: wallet.id },
          { orders: { some: { consumerWalletId: wallet.id } } },
        ],
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: [{ name: "asc" }],
    }),
  ]);

  return {
    orders: orders.map((order) => mapOrderForUser(order, wallet.id)),
    total,
    page,
    limit,
    total_pages: Math.max(1, Math.ceil(total / limit)),
    agents: agentOptions,
  };
}
