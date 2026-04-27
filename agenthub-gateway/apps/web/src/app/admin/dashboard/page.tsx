"use client";

import { useEffect, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import {
  fetchAdminAgents,
  fetchAdminStats,
  fetchFailedReceipts,
  getAdminUsername,
  retryReceipt,
  type AdminAgent,
  type AdminStats,
  type FailedReceipt,
} from "@/lib/api/admin";

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function statusLabel(status: AdminAgent["status"]): string {
  if (status === "pending_review") {
    return "Pending";
  }
  if (status === "active") {
    return "Approved";
  }
  if (status === "rejected") {
    return "Rejected";
  }
  return "Suspended";
}

const EMPTY_STATS: AdminStats = {
  total_agents: 0,
  agents_by_status: {
    active: 0,
    pending_review: 0,
    rejected: 0,
    suspended: 0,
  },
  total_orders: 0,
  orders_this_week: 0,
  total_revenue_usdc: 0,
  revenue_this_week_usdc: 0,
  active_wallets: 0,
  new_wallets_this_month: 0,
  failed_receipts_count: 0,
};

export default function Page() {
  const [username, setUsername] = useState("admin");
  const [stats, setStats] = useState<AdminStats>(EMPTY_STATS);
  const [agents, setAgents] = useState<AdminAgent[]>([]);
  const [receipts, setReceipts] = useState<FailedReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [statsData, agentsData, receiptData] = await Promise.all([
        fetchAdminStats(),
        fetchAdminAgents({ sort: "newest", limit: 5 }),
        fetchFailedReceipts({ limit: 5 }),
      ]);
      setStats(statsData);
      setAgents(agentsData.agents);
      setReceipts(receiptData.receipts);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load admin dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setUsername(getAdminUsername());
    void loadData();
  }, []);

  async function handleRetry(receiptId: string) {
    try {
      await retryReceipt(receiptId);
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Retry failed.");
    }
  }

  return (
    <AdminShell
      active="dashboard"
      reviewBadge={stats.agents_by_status.pending_review}
      receiptBadge={stats.failed_receipts_count}
      username={username}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-[#0F172A]">Platform Dashboard</h1>
          <p className="mt-2 text-[14px] text-[#64748B]">
            Overview of AgentHub platform metrics
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-[#FEE2E2] bg-[#FEF2F2] px-4 py-3 text-[14px] text-[#DC2626]">
            {error}
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
            <p className="text-[13px] text-[#94A3B8]">Total Agents</p>
            <p className="mt-2 text-[28px] font-semibold text-[#0F172A]">{stats.total_agents}</p>
            <p className="mt-2 text-[12px] text-[#94A3B8]">
              {stats.agents_by_status.active} active | {stats.agents_by_status.pending_review} pending |{" "}
              {stats.agents_by_status.rejected} rejected
            </p>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
            <p className="text-[13px] text-[#94A3B8]">Pending Review</p>
            <p className="mt-2 text-[28px] font-semibold text-[#D97706]">
              {stats.agents_by_status.pending_review}
            </p>
            <p className="mt-2 text-[12px] text-[#94A3B8]">Awaiting moderation</p>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
            <p className="text-[13px] text-[#94A3B8]">Total Orders</p>
            <p className="mt-2 text-[28px] font-semibold text-[#0F172A]">{stats.total_orders}</p>
            <p className="mt-2 text-[12px] text-[#16A34A]">+{stats.orders_this_week} this week</p>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
            <p className="text-[13px] text-[#94A3B8]">Total Revenue</p>
            <p className="mt-2 text-[28px] font-semibold text-[#0F172A]">
              {formatAmount(stats.total_revenue_usdc)} USDC
            </p>
            <p className="mt-2 text-[12px] text-[#16A34A]">
              +{formatAmount(stats.revenue_this_week_usdc)} this week
            </p>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
            <p className="text-[13px] text-[#94A3B8]">Active Wallets</p>
            <p className="mt-2 text-[28px] font-semibold text-[#0F172A]">{stats.active_wallets}</p>
            <p className="mt-2 text-[12px] text-[#94A3B8]">{stats.new_wallets_this_month} new this month</p>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="rounded-xl border border-[#E2E8F0] bg-white">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
              <h2 className="text-[16px] font-semibold text-[#0F172A]">Recent Submissions</h2>
              <span className="text-[14px] font-medium text-[#6366F1]">View all</span>
            </div>
            {loading ? (
              <p className="px-5 py-4 text-[14px] text-[#94A3B8]">Loading...</p>
            ) : agents.length === 0 ? (
              <p className="px-5 py-4 text-[14px] text-[#94A3B8]">No recent submissions.</p>
            ) : (
              agents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between border-b border-[#F1F5F9] px-5 py-4 last:border-b-0"
                >
                  <div>
                    <p className="text-[14px] font-semibold text-[#0F172A]">{agent.name}</p>
                    <p className="text-[12px] text-[#94A3B8]">
                      by {agent.provider_wallet} | {new Date(agent.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${
                      agent.status === "active"
                        ? "bg-[#DCFCE7] text-[#16A34A]"
                        : agent.status === "pending_review"
                          ? "bg-[#FEF3C7] text-[#D97706]"
                          : "bg-[#FEE2E2] text-[#DC2626]"
                    }`}
                  >
                    {statusLabel(agent.status)}
                  </span>
                </div>
              ))
            )}
          </section>

          <section className="rounded-xl border border-[#E2E8F0] bg-white">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
              <h2 className="text-[16px] font-semibold text-[#0F172A]">Failed Receipts</h2>
              <span className="text-[14px] font-medium text-[#6366F1]">View all</span>
            </div>
            {loading ? (
              <p className="px-5 py-4 text-[14px] text-[#94A3B8]">Loading...</p>
            ) : receipts.length === 0 ? (
              <p className="px-5 py-4 text-[14px] text-[#94A3B8]">No failed receipts.</p>
            ) : (
              receipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="flex items-center justify-between border-b border-[#F1F5F9] px-5 py-4 last:border-b-0"
                >
                  <div>
                    <p className="text-[14px] font-semibold text-[#0F172A]">
                      {receipt.id} - {receipt.error}
                    </p>
                    <p className="text-[12px] text-[#94A3B8]">
                      {formatAmount(receipt.amount_usdc)} USDC | {new Date(receipt.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => void handleRetry(receipt.id)}
                    className="rounded-lg bg-[#6366F1] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:opacity-90"
                  >
                    Retry
                  </button>
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
