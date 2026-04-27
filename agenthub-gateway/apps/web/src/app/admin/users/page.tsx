"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import {
  fetchAdminStats,
  fetchAdminUsers,
  fetchAdminUsersStats,
  getAdminUsername,
  type AdminUser,
} from "@/lib/api/admin";

type UsersSort = "last_active" | "spending" | "revenue" | "agents" | "orders";

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function Page() {
  const [username, setUsername] = useState("admin");
  const [reviewBadge, setReviewBadge] = useState(0);
  const [receiptBadge, setReceiptBadge] = useState(0);
  const [totals, setTotals] = useState({
    total_wallets: 0,
    active_this_week: 0,
    new_this_month: 0,
  });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [sort, setSort] = useState<UsersSort>("last_active");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [limit, total]);

  async function loadData(nextPage: number, nextSearch: string, nextSort: UsersSort) {
    try {
      setLoading(true);
      setError(null);

      const [stats, userStats, list] = await Promise.all([
        fetchAdminStats(),
        fetchAdminUsersStats(),
        fetchAdminUsers({
          page: nextPage,
          limit,
          search: nextSearch || undefined,
          sort: nextSort,
        }),
      ]);

      setReviewBadge(stats.agents_by_status.pending_review);
      setReceiptBadge(stats.failed_receipts_count);
      setTotals(userStats);
      setUsers(list.users);
      setTotal(list.total);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setUsername(getAdminUsername());
  }, []);

  useEffect(() => {
    void loadData(page, search, sort);
  }, [page, search, sort]);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  return (
    <AdminShell active="users" reviewBadge={reviewBadge} receiptBadge={receiptBadge} username={username}>
      <div className="space-y-6">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-[#0F172A]">Users</h1>
          <p className="mt-2 text-[14px] text-[#64748B]">All connected wallets on the platform</p>
        </div>

        {error ? (
          <div className="rounded-xl border border-[#FEE2E2] bg-[#FEF2F2] px-4 py-3 text-[14px] text-[#DC2626]">
            {error}
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
            <p className="text-[14px] text-[#94A3B8]">Total Wallets</p>
            <p className="mt-2 text-[28px] font-semibold text-[#0F172A]">{totals.total_wallets}</p>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
            <p className="text-[14px] text-[#94A3B8]">Active This Week</p>
            <p className="mt-2 text-[28px] font-semibold text-[#0F172A]">{totals.active_this_week}</p>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
            <p className="text-[14px] text-[#94A3B8]">New This Month</p>
            <p className="mt-2 text-[28px] font-semibold text-[#0F172A]">{totals.new_this_month}</p>
          </div>
        </section>

        <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-3">
          <input
            className="h-10 min-w-[260px] flex-1 rounded-lg border border-[#E2E8F0] bg-white px-3 text-[14px] outline-none transition focus:border-[#6366F1]"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by wallet address..."
          />
          <select
            value={sort}
            onChange={(event) => {
              setPage(1);
              setSort(event.target.value as UsersSort);
            }}
            className="h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 text-[14px] text-[#64748B]"
          >
            <option value="last_active">Sort: Last Active</option>
            <option value="spending">Sort: Spending</option>
            <option value="revenue">Sort: Revenue</option>
            <option value="agents">Sort: Agents</option>
            <option value="orders">Sort: Orders</option>
          </select>
          <button className="h-10 rounded-lg bg-[#6366F1] px-4 text-[14px] font-semibold text-white transition hover:opacity-90">
            Search
          </button>
        </form>

        <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
          <table className="w-full text-left">
            <thead className="bg-[#F8FAFC] text-[12px] uppercase tracking-wide text-[#94A3B8]">
              <tr>
                {["Wallet", "Agents", "Orders", "Spending", "Revenue", "Last Active"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-[14px]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-[14px] text-[#94A3B8]">
                    Loading...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-[14px] text-[#94A3B8]">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.wallet_id} className="border-t border-[#F1F5F9]">
                    <td className="px-4 py-3 text-[12px] font-semibold text-[#0F172A]">{user.pubkey}</td>
                    <td className="px-4 py-3">{user.agents_count}</td>
                    <td className="px-4 py-3">{user.orders_count}</td>
                    <td className="px-4 py-3 text-[#DC2626]">{formatAmount(user.spending_usdc)} USDC</td>
                    <td className="px-4 py-3 text-[#16A34A]">{formatAmount(user.revenue_usdc)} USDC</td>
                    <td className="px-4 py-3 text-[12px] text-[#94A3B8]">{new Date(user.last_active).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <div className="flex items-center justify-end gap-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-[14px] text-[#64748B] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-[14px] text-[#94A3B8]">
            Page {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-[14px] text-[#64748B] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </AdminShell>
  );
}
