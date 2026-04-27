/**
 * @file  src/services/admin/index.ts
 * @owner Dev B
 * @module admin
 *
 * Admin service functions for platform administration.
 *
 * Type hints:
 *   - ../../lib/prisma (prisma)
 *   - ../../chain/erc8004 (sdk)
 *
 * Exports:
 *   - adminLogin()
 *   - approveAgent()
 *   - rejectAgent()
 *   - suspendAgent()
 *   - getFailedReceipts()
 *   - retryReceipt()
 *   - listUsers()
 *   - getAdminStats()
 */

import { comparePassword } from "../../../../../packages/auth/src/admin-auth";
import { signJwt } from "../../../../../packages/auth/src/jwt";
import { ensurePlatformWalletHasGas, registerAgentOnChain } from "../../chain/erc8004";
import { uploadJson } from "../../chain/ipfs";
import { ADMIN_ERRORS } from "../../lib/errors/admin";
import { prisma } from "../../lib/prisma";

type ListAgentsParams = {
  status?: "pending_review" | "active" | "rejected" | "suspended";
  sort?: "newest" | "name" | "price";
  page?: number;
  limit?: number;
};

type ListFailedReceiptsParams = {
  page?: number;
  limit?: number;
};

type ListUsersParams = {
  search?: string;
  sort?: "last_active" | "spending" | "revenue" | "agents" | "orders";
  page?: number;
  limit?: number;
};

const USDC_DIVISOR = 1_000_000;

function toUsdc(micro: number | null | undefined): number {
  if (!micro) {
    return 0;
  }
  return Number((micro / USDC_DIVISOR).toFixed(2));
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function truncateErrorMessage(message: string, max: number = 500): string {
  if (message.length <= max) {
    return message;
  }
  return `${message.slice(0, max - 3)}...`;
}

function normalizeChainErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Unknown chain registration failure";
  }
  return truncateErrorMessage(error.message);
}

function mapChainErrorCode(errorMessage: string): string {
  if (errorMessage.includes("PLATFORM_WALLET_INSUFFICIENT_BALANCE")) {
    return ADMIN_ERRORS.PLATFORM_WALLET_INSUFFICIENT_BALANCE;
  }
  if (errorMessage.includes("COLLECTION_POINTER_NOT_CONFIGURED")) {
    return ADMIN_ERRORS.COLLECTION_POINTER_NOT_CONFIGURED;
  }
  if (errorMessage.includes("IPFS_UPLOAD_FAILED") || errorMessage.includes("PINATA_JWT_NOT_CONFIGURED")) {
    return ADMIN_ERRORS.IPFS_UPLOAD_FAILED;
  }
  return ADMIN_ERRORS.ERC8004_REGISTER_FAILED;
}

function buildAgentRegistrationFile(agent: {
  id: string;
  name: string;
  description: string;
  capabilityTags: string;
  skills: string;
  domains: string;
  endpointUrl: string;
  priceUsdcMicro: number;
  providerWallet: { pubkey: string };
}) {
  return {
    standard: "erc-8004",
    version: "1.0.0",
    agent: {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      tags: parseJsonArray(agent.capabilityTags),
      skills: parseJsonArray(agent.skills),
      domains: parseJsonArray(agent.domains),
      x402Support: true,
      providerWallet: agent.providerWallet.pubkey,
    },
    services: [
      {
        protocol: "x402",
        endpoint: agent.endpointUrl,
        pricing: {
          amountUsdcMicro: agent.priceUsdcMicro,
          network: "solana:devnet",
        },
      },
    ],
    generatedAt: new Date().toISOString(),
  };
}

function parsePage(page?: number): number {
  if (!page || Number.isNaN(page) || page < 1) {
    return 1;
  }
  return Math.floor(page);
}

function parseLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit) || limit < 1) {
    return 20;
  }
  return Math.min(100, Math.floor(limit));
}

function startOfCurrentMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
}

function sevenDaysAgo(now: Date): Date {
  return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
}

export async function adminLogin(input: {
  username: string;
  password: string;
  jwtSecret: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();

  const admin = await prisma.adminUser.findUnique({
    where: { username: input.username },
  });

  if (!admin) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const valid = await comparePassword(input.password, admin.passwordHash);
  if (!valid) {
    throw new Error("INVALID_CREDENTIALS");
  }

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: now },
  });

  const token = signJwt(
    { wallet_pubkey: `admin:${admin.id}:${admin.username}` },
    input.jwtSecret,
    86400,
    now,
  );

  return {
    token,
    admin_id: admin.id,
    username: admin.username,
    expires_in: 86400,
  };
}

export async function getAdminStats(now: Date = new Date()) {
  const [totalAgents, activeAgents, pendingAgents, rejectedAgents, suspendedAgents] = await Promise.all([
    prisma.agent.count(),
    prisma.agent.count({ where: { status: "active" } }),
    prisma.agent.count({ where: { status: "pending_review" } }),
    prisma.agent.count({ where: { status: "rejected" } }),
    prisma.agent.count({ where: { status: "suspended" } }),
  ]);

  const [totalOrders, ordersThisWeek, revenueAll, revenueThisWeek] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo(now),
        },
      },
    }),
    prisma.order.aggregate({
      where: { paymentVerified: true },
      _sum: { paymentAmount: true },
    }),
    prisma.order.aggregate({
      where: {
        paymentVerified: true,
        createdAt: {
          gte: sevenDaysAgo(now),
        },
      },
      _sum: { paymentAmount: true },
    }),
  ]);

  const [activeWallets, newWalletsThisMonth, failedReceiptsCount] = await Promise.all([
    prisma.wallet.count(),
    prisma.wallet.count({
      where: {
        createdAt: {
          gte: startOfCurrentMonth(now),
        },
      },
    }),
    prisma.receipt.count({ where: { feedbackStatus: "failed" } }),
  ]);

  return {
    total_agents: totalAgents,
    agents_by_status: {
      active: activeAgents,
      pending_review: pendingAgents,
      rejected: rejectedAgents,
      suspended: suspendedAgents,
    },
    total_orders: totalOrders,
    orders_this_week: ordersThisWeek,
    total_revenue_usdc: toUsdc(revenueAll._sum.paymentAmount),
    revenue_this_week_usdc: toUsdc(revenueThisWeek._sum.paymentAmount),
    active_wallets: activeWallets,
    new_wallets_this_month: newWalletsThisMonth,
    failed_receipts_count: failedReceiptsCount,
  };
}

export async function listAgents(params: ListAgentsParams = {}) {
  const page = parsePage(params.page);
  const limit = parseLimit(params.limit);
  const skip = (page - 1) * limit;

  const where = params.status
    ? {
        status: params.status,
      }
    : {};

  const orderBy =
    params.sort === "name"
      ? [{ name: "asc" as const }]
      : params.sort === "price"
        ? [{ priceUsdcMicro: "desc" as const }]
        : [{ createdAt: "desc" as const }];

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
    agents: agents.map((agent: any) => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      provider_wallet: agent.providerWallet.pubkey,
      price_usdc: toUsdc(agent.priceUsdcMicro),
      tags: parseJsonArray(agent.capabilityTags),
      skills: parseJsonArray(agent.skills),
      domains: parseJsonArray(agent.domains),
      status: agent.status,
      review_note: agent.reviewNote,
      chain_status: agent.chainStatus,
      sol_asset_address: agent.solAssetAddress,
      ipfs_uri: agent.ipfsUri,
      ipfs_cid: agent.ipfsCid,
      chain_tx: agent.solPublishTx,
      chain_error: agent.chainStatus === "failed" ? agent.reviewNote : null,
      created_at: agent.createdAt.toISOString(),
      updated_at: agent.updatedAt.toISOString(),
    })),
    total,
    page,
    limit,
  };
}

export async function approveAgent(input: { id: string; note: string }) {
  const existing = await prisma.agent.findUnique({
    where: { id: input.id },
    include: {
      providerWallet: {
        select: { pubkey: true },
      },
    },
  });

  if (!existing) {
    throw new Error(ADMIN_ERRORS.AGENT_NOT_FOUND);
  }
  if (existing.status === "active") {
    throw new Error(ADMIN_ERRORS.AGENT_ALREADY_ACTIVE);
  }
  if (existing.status === "rejected") {
    throw new Error(ADMIN_ERRORS.AGENT_ALREADY_REJECTED);
  }

  await prisma.agent.update({
    where: { id: input.id },
    data: {
      chainStatus: "uploading",
      reviewNote: input.note || null,
      reviewedAt: new Date(),
    },
  });

  try {
    await ensurePlatformWalletHasGas();

    const metadata = buildAgentRegistrationFile(existing);
    const ipfs = await uploadJson(metadata, {
      name: `agenthub-agent-${existing.id}`,
    });
    const chain = await registerAgentOnChain(ipfs.uri);

    const updated = await prisma.agent.update({
      where: { id: input.id },
      data: {
        status: "active",
        reviewNote: input.note || existing.reviewNote,
        reviewedAt: new Date(),
        chainStatus: "registered",
        registeredAt: new Date(),
        solAssetAddress: chain.assetAddress,
        ipfsCid: ipfs.cid,
        ipfsUri: ipfs.uri,
        solPublishTx: chain.txSignature || null,
      },
    });

    return {
      agent_id: updated.id,
      status: updated.status,
      sol_asset_address: updated.solAssetAddress ?? "",
      ipfs_uri: updated.ipfsUri ?? "",
      ipfs_cid: updated.ipfsCid ?? "",
      chain_tx: updated.solPublishTx ?? "",
      explorer_link: updated.solAssetAddress
        ? `https://explorer.solana.com/address/${updated.solAssetAddress}?cluster=devnet`
        : "",
    };
  } catch (error) {
    const normalized = normalizeChainErrorMessage(error);
    const errorCode = mapChainErrorCode(normalized);

    await prisma.agent.update({
      where: { id: input.id },
      data: {
        status: "pending_review",
        chainStatus: "failed",
        reviewNote: normalized,
      },
    });

    throw new Error(`${errorCode}:${normalized}`);
  }
}

export async function rejectAgent(input: { id: string; note: string }) {
  const existing = await prisma.agent.findUnique({ where: { id: input.id } });
  if (!existing) {
    throw new Error(ADMIN_ERRORS.AGENT_NOT_FOUND);
  }
  if (!input.note.trim()) {
    throw new Error(ADMIN_ERRORS.REJECT_NOTE_REQUIRED);
  }

  const updated = await prisma.agent.update({
    where: { id: input.id },
    data: {
      status: "rejected",
      reviewNote: input.note,
      reviewedAt: new Date(),
    },
  });

  return {
    agent_id: updated.id,
    status: updated.status,
    review_note: updated.reviewNote ?? "",
  };
}

export async function retryAgent(input: { id: string }) {
  const existing = await prisma.agent.findUnique({ where: { id: input.id } });
  if (!existing) {
    throw new Error(ADMIN_ERRORS.AGENT_NOT_FOUND);
  }

  if (existing.status !== "pending_review" || existing.chainStatus !== "failed") {
    throw new Error(ADMIN_ERRORS.RETRY_NOT_ALLOWED);
  }

  return approveAgent({ id: input.id, note: "" });
}

export async function suspendAgent(input: { id: string; note: string }) {
  const existing = await prisma.agent.findUnique({ where: { id: input.id } });
  if (!existing) {
    throw new Error(ADMIN_ERRORS.AGENT_NOT_FOUND);
  }

  const updated = await prisma.agent.update({
    where: { id: input.id },
    data: {
      status: "suspended",
      reviewNote: input.note,
      reviewedAt: new Date(),
    },
  });

  return {
    agent_id: updated.id,
    status: updated.status,
  };
}

export async function getFailedReceipts(params: ListFailedReceiptsParams = {}) {
  const page = parsePage(params.page);
  const limit = parseLimit(params.limit);
  const skip = (page - 1) * limit;

  const where = { feedbackStatus: "failed" as const };

  const [receipts, total] = await Promise.all([
    prisma.receipt.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip,
      take: limit,
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
        consumerWallet: {
          select: {
            pubkey: true,
          },
        },
        order: {
          select: {
            errorCode: true,
          },
        },
      },
    }),
    prisma.receipt.count({ where }),
  ]);

  return {
    receipts: receipts.map((receipt: any) => ({
      id: receipt.id,
      agent_name: receipt.agent.name,
      agent_id: receipt.agent.id,
      consumer_wallet: receipt.consumerWallet.pubkey,
      amount_usdc: toUsdc(receipt.amountUsdcMicro),
      error: receipt.order?.errorCode ?? "Feedback submission failed",
      feedback_status: receipt.feedbackStatus,
      retry_count: receipt.retryCount,
      max_retries: 3,
      created_at: receipt.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
  };
}

export async function retryReceipt(input: { id: string }) {
  const receipt = await prisma.receipt.findUnique({
    where: { id: input.id },
  });

  if (!receipt) {
    throw new Error("RECEIPT_NOT_FOUND");
  }

  if (receipt.feedbackStatus === "submitted") {
    throw new Error("ALREADY_SUBMITTED");
  }

  const updated = await prisma.receipt.update({
    where: { id: input.id },
    data: {
      feedbackStatus: "pending",
      retryCount: receipt.retryCount + 1,
    },
  });

  return {
    receipt_id: updated.id,
    feedback_status: updated.feedbackStatus,
    retry_count: updated.retryCount,
    message: "Retry enqueued",
  };
}

type WalletAggregates = {
  wallet_id: string;
  pubkey: string;
  source: string;
  last_active: string | null;
  created_at: string;
  agents_count: number;
  orders_count: number;
  spending_usdc: number;
  revenue_usdc: number;
};

function sortUsers(rows: WalletAggregates[], sort: NonNullable<ListUsersParams["sort"]>) {
  if (sort === "spending") {
    return rows.sort((a, b) => b.spending_usdc - a.spending_usdc);
  }
  if (sort === "revenue") {
    return rows.sort((a, b) => b.revenue_usdc - a.revenue_usdc);
  }
  if (sort === "agents") {
    return rows.sort((a, b) => b.agents_count - a.agents_count);
  }
  if (sort === "orders") {
    return rows.sort((a, b) => b.orders_count - a.orders_count);
  }

  return rows.sort((a, b) => {
    const dateA = a.last_active ? new Date(a.last_active).getTime() : 0;
    const dateB = b.last_active ? new Date(b.last_active).getTime() : 0;
    return dateB - dateA;
  });
}

export async function listUsers(params: ListUsersParams = {}) {
  const page = parsePage(params.page);
  const limit = parseLimit(params.limit);
  const sort = params.sort ?? "last_active";

  const wallets = await prisma.wallet.findMany({
    where: params.search
      ? {
          pubkey: {
            contains: params.search,
          },
        }
      : undefined,
    select: {
      id: true,
      pubkey: true,
      source: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  const rows = await Promise.all(
    wallets.map(async (wallet: any): Promise<WalletAggregates> => {
      const [agentsCount, ordersCount, spendingAgg, revenueAgg] = await Promise.all([
        prisma.agent.count({
          where: {
            providerWalletId: wallet.id,
            status: {
              not: "rejected",
            },
          },
        }),
        prisma.order.count({
          where: {
            consumerWalletId: wallet.id,
          },
        }),
        prisma.order.aggregate({
          where: {
            consumerWalletId: wallet.id,
            paymentVerified: true,
          },
          _sum: {
            paymentAmount: true,
          },
        }),
        prisma.order.aggregate({
          where: {
            paymentVerified: true,
            agent: {
              providerWalletId: wallet.id,
            },
          },
          _sum: {
            paymentAmount: true,
          },
        }),
      ]);

      return {
        wallet_id: wallet.id,
        pubkey: wallet.pubkey,
        source: wallet.source,
        last_active: wallet.lastLoginAt ? wallet.lastLoginAt.toISOString() : null,
        created_at: wallet.createdAt.toISOString(),
        agents_count: agentsCount,
        orders_count: ordersCount,
        spending_usdc: toUsdc(spendingAgg._sum.paymentAmount),
        revenue_usdc: toUsdc(revenueAgg._sum.paymentAmount),
      };
    }),
  );

  const sorted = sortUsers(rows, sort);
  const total = sorted.length;
  const start = (page - 1) * limit;
  const paged = sorted.slice(start, start + limit);

  return {
    users: paged,
    total,
    page,
    limit,
  };
}

export async function getUsersStats(now: Date = new Date()) {
  const [totalWallets, activeThisWeek, newThisMonth] = await Promise.all([
    prisma.wallet.count(),
    prisma.wallet.count({
      where: {
        lastLoginAt: {
          gte: sevenDaysAgo(now),
        },
      },
    }),
    prisma.wallet.count({
      where: {
        createdAt: {
          gte: startOfCurrentMonth(now),
        },
      },
    }),
  ]);

  return {
    total_wallets: totalWallets,
    active_this_week: activeThisWeek,
    new_this_month: newThisMonth,
  };
}
