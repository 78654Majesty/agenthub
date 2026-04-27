"use client";

import { useEffect, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import {
  fetchAdminStats,
  fetchFailedReceipts,
  getAdminUsername,
  retryReceipt,
  type FailedReceipt,
} from "@/lib/api/admin";

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function Page() {
  const [username, setUsername] = useState("admin");
  const [reviewBadge, setReviewBadge] = useState(0);
  const [receiptBadge, setReceiptBadge] = useState(0);
  const [receipts, setReceipts] = useState<FailedReceipt[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [stats, failed] = await Promise.all([
        fetchAdminStats(),
        fetchFailedReceipts({ page: 1, limit: 20 }),
      ]);
      setReviewBadge(stats.agents_by_status.pending_review);
      setReceiptBadge(stats.failed_receipts_count);
      setReceipts(failed.receipts);
      setTotal(failed.total);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load failed receipts.");
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
    <AdminShell active="receipts" reviewBadge={reviewBadge} receiptBadge={receiptBadge} username={username}>
      <div className="space-y-6">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-[#0F172A]">Failed Receipts</h1>
          <p className="mt-2 text-[14px] text-[#64748B]">
            Receipts that failed IPFS upload or chain anchoring, retry or investigate
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-[#FEE2E2] bg-[#FEF2F2] px-4 py-3 text-[14px] text-[#DC2626]">
            {error}
          </div>
        ) : null}

        <div className="rounded-xl border border-[#FCD34D] bg-[#FEF3C7] px-4 py-3 text-[14px] text-[#D97706]">
          {total} receipts require attention. Failed receipts retry up to 3 times automatically before
          requiring manual intervention.
        </div>

        <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
          <table className="w-full text-left">
            <thead className="bg-[#F8FAFC] text-[11px] uppercase tracking-[0.08em] text-[#94A3B8]">
              <tr>
                {["Receipt ID", "Agent", "Consumer", "Amount", "Error", "Retries", "Action"].map((h) => (
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
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-[14px] text-[#94A3B8]">
                    No failed receipts.
                  </td>
                </tr>
              ) : (
                receipts.map((receipt) => (
                  <tr key={receipt.id} className="border-t border-[#F1F5F9] align-top">
                    <td className="px-4 py-3 text-[12px] font-medium text-[#6366F1]">{receipt.id}</td>
                    <td className="px-4 py-3 text-[#0F172A]">{receipt.agent_name}</td>
                    <td className="px-4 py-3 text-[12px] text-[#94A3B8]">{receipt.consumer_wallet}</td>
                    <td className="px-4 py-3 font-medium text-[#0F172A]">{formatAmount(receipt.amount_usdc)} USDC</td>
                    <td className="px-4 py-3 text-[#DC2626]">{receipt.error}</td>
                    <td className="px-4 py-3 text-[#DC2626]">
                      {receipt.retry_count} / {receipt.max_retries}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => void handleRetry(receipt.id)}
                        className="rounded-lg bg-[#6366F1] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:opacity-90"
                      >
                        Retry
                      </button>
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
