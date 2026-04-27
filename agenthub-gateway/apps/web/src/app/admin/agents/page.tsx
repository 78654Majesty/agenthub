"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import {
  approveAgent,
  fetchAdminAgents,
  fetchAdminStats,
  getAdminUsername,
  rejectAgent,
  retryAgent,
  type AdminAgent,
  type AdminAgentStatus,
} from "@/lib/api/admin";

type AgentFilter = "all" | AdminAgentStatus;

const FILTERS: AgentFilter[] = ["all", "pending_review", "active", "rejected", "suspended"];

function formatStatus(status: AdminAgentStatus): string {
  if (status === "pending_review") {
    return "Pending";
  }
  if (status === "active") {
    return "Active";
  }
  if (status === "rejected") {
    return "Rejected";
  }
  return "Suspended";
}

function formatFilterLabel(filter: AgentFilter): string {
  if (filter === "all") {
    return "All";
  }
  if (filter === "pending_review") {
    return "Pending";
  }
  if (filter === "active") {
    return "Active";
  }
  if (filter === "rejected") {
    return "Rejected";
  }
  return "Suspended";
}

export default function Page() {
  const [username, setUsername] = useState("admin");
  const [activeFilter, setActiveFilter] = useState<AgentFilter>("all");
  const [agents, setAgents] = useState<AdminAgent[]>([]);
  const [counts, setCounts] = useState<Record<AgentFilter, number>>({
    all: 0,
    pending_review: 0,
    active: 0,
    rejected: 0,
    suspended: 0,
  });
  const [reviewBadge, setReviewBadge] = useState(0);
  const [receiptBadge, setReceiptBadge] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadCounts() {
    const [all, pending, active, rejected, suspended] = await Promise.all([
      fetchAdminAgents({ sort: "newest", limit: 1 }),
      fetchAdminAgents({ status: "pending_review", sort: "newest", limit: 1 }),
      fetchAdminAgents({ status: "active", sort: "newest", limit: 1 }),
      fetchAdminAgents({ status: "rejected", sort: "newest", limit: 1 }),
      fetchAdminAgents({ status: "suspended", sort: "newest", limit: 1 }),
    ]);

    setCounts({
      all: all.total,
      pending_review: pending.total,
      active: active.total,
      rejected: rejected.total,
      suspended: suspended.total,
    });
  }

  async function loadData(filter: AgentFilter) {
    try {
      setLoading(true);
      setError(null);

      const [stats, list] = await Promise.all([
        fetchAdminStats(),
        fetchAdminAgents({
          status: filter === "all" ? undefined : filter,
          sort: "newest",
          page: 1,
          limit: 20,
        }),
      ]);

      setReviewBadge(stats.agents_by_status.pending_review);
      setReceiptBadge(stats.failed_receipts_count);
      setAgents(list.agents);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load agents.");
    } finally {
      setLoading(false);
    }
  }

  async function refresh(filter: AgentFilter) {
    await Promise.all([loadCounts(), loadData(filter)]);
  }

  useEffect(() => {
    setUsername(getAdminUsername());
    void refresh(activeFilter);
  }, []);

  useEffect(() => {
    void loadData(activeFilter);
  }, [activeFilter]);

  async function runApprove(agent: AdminAgent) {
    const confirmed = window.confirm(
      "Approve this agent and trigger real ERC-8004 on-chain registration now?",
    );
    if (!confirmed) {
      return;
    }

    try {
      setActionLoadingKey(`${agent.id}:approve`);
      await approveAgent(agent.id, "Approved by admin");
      await refresh(activeFilter);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Approve failed.");
    } finally {
      setActionLoadingKey(null);
    }
  }

  async function runReject(agent: AdminAgent) {
    const note = window.prompt("Reject reason (required)") ?? "";
    if (!note.trim()) {
      return;
    }

    try {
      setActionLoadingKey(`${agent.id}:reject`);
      await rejectAgent(agent.id, note);
      await refresh(activeFilter);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Reject failed.");
    } finally {
      setActionLoadingKey(null);
    }
  }

  async function runRetry(agent: AdminAgent) {
    const confirmed = window.confirm("Retry chain registration for this agent?");
    if (!confirmed) {
      return;
    }

    try {
      setActionLoadingKey(`${agent.id}:retry`);
      await retryAgent(agent.id);
      await refresh(activeFilter);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Retry failed.");
    } finally {
      setActionLoadingKey(null);
    }
  }

  const tabs = useMemo(
    () =>
      FILTERS.map((filter) => ({
        filter,
        label: `${formatFilterLabel(filter)} (${counts[filter]})`,
      })),
    [counts],
  );

  return (
    <AdminShell active="agents" reviewBadge={reviewBadge} receiptBadge={receiptBadge} username={username}>
      <div className="space-y-6">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-[#0F172A]">Agent Review</h1>
          <p className="mt-2 text-[14px] text-[#64748B]">
            Review and approve Agent submissions for ERC-8004 on-chain registration
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-[#FEE2E2] bg-[#FEF2F2] px-4 py-3 text-[14px] text-[#DC2626]">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2.5">
          {tabs.map((tab) => (
            <button
              key={tab.filter}
              onClick={() => setActiveFilter(tab.filter)}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${
                tab.filter === activeFilter
                  ? "border-[#6366F1] bg-[#6366F1] text-white"
                  : "border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#CBD5E1]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[1100px] w-full text-left">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.08em] text-slate-500">
              <tr>
                {["Agent Name", "Provider", "Price", "Status", "Chain", "Submitted", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-[14px]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-[14px] text-[#94A3B8]">
                    Loading...
                  </td>
                </tr>
              ) : agents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-[14px] text-[#94A3B8]">
                    No agents found.
                  </td>
                </tr>
              ) : (
                agents.map((agent) => (
                  <tr key={agent.id} className="border-t border-[#F1F5F9] align-top">
                    <td className="px-4 py-3 font-semibold text-[#0F172A]">{agent.name}</td>
                    <td className="px-4 py-3 text-[12px] text-[#94A3B8]">{agent.provider_wallet}</td>
                    <td className="px-4 py-3 font-medium text-[#0F172A]">{agent.price_usdc.toFixed(2)} USDC</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${
                          agent.status === "pending_review"
                            ? "bg-[#FEF3C7] text-[#D97706]"
                            : agent.status === "active"
                              ? "bg-[#DCFCE7] text-[#16A34A]"
                              : "bg-[#FEE2E2] text-[#DC2626]"
                        }`}
                      >
                        {formatStatus(agent.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#94A3B8]">
                      <p>Status: {agent.chain_status}</p>
                      <p className="truncate">Asset: {agent.sol_asset_address ?? "-"}</p>
                      <p className="truncate">Tx: {agent.chain_tx ?? "-"}</p>
                      {agent.chain_error ? <p className="truncate text-[#DC2626]">Err: {agent.chain_error}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{new Date(agent.created_at).toLocaleString()}</td>
                    <td className="min-w-[220px] px-4 py-3 whitespace-nowrap">
                      {agent.status === "pending_review" ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => void runApprove(agent)}
                            disabled={actionLoadingKey !== null}
                            className="rounded-lg bg-[#6366F1] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:opacity-90"
                          >
                            {actionLoadingKey === `${agent.id}:approve` ? "Approving..." : "Approve"}
                          </button>
                          <button
                            onClick={() => void runReject(agent)}
                            disabled={actionLoadingKey !== null}
                            className="rounded-lg border border-[#CBD5E1] px-3 py-1.5 text-[12px] font-semibold text-[#64748B] transition hover:bg-[#F8FAFC]"
                          >
                            {actionLoadingKey === `${agent.id}:reject` ? "Rejecting..." : "Reject"}
                          </button>
                          {agent.chain_status === "failed" ? (
                            <button
                              onClick={() => void runRetry(agent)}
                              disabled={actionLoadingKey !== null}
                              className="rounded-lg border border-[#FCD34D] px-3 py-1.5 text-[12px] font-semibold text-[#D97706] transition hover:bg-[#FEF3C7]"
                            >
                              {actionLoadingKey === `${agent.id}:retry` ? "Retrying..." : "Retry"}
                            </button>
                          ) : null}
                        </div>
                      ) : agent.status === "rejected" ? (
                        <span className="text-[12px] text-[#94A3B8]">{agent.review_note ?? "Rejected"}</span>
                      ) : (
                        <span className="text-[12px] text-[#94A3B8]">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </AdminShell>
  );
}
