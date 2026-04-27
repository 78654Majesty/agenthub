import Link from "next/link";
import { cookies } from "next/headers";

import { fetchDashboard, fetchOrders } from "@/lib/api/consumer";
import { fetchMyAgents } from "@/lib/api/provider";

function formatUsdcFromMicro(value: number) {
  return (value / 1_000_000).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day ago`;
}

export default async function Page() {
  const cookieStore = await cookies();
  const token = cookieStore.get("agenthub_token")?.value;

  const [dashboard, ordersResult, myAgents] = token
    ? await Promise.all([
        fetchDashboard({ token, revalidate: 0 }),
        fetchOrders(
          {
            limit: 5,
            sort: "created_at",
            order: "desc",
          },
          { token, revalidate: 0 },
        ),
        fetchMyAgents({ limit: 4 }, { token, revalidate: 0 }),
      ])
    : [
        {
          spending: { total_usdc_micro: 0, total_calls: 0, this_month_usdc_micro: 0, this_month_calls: 0 },
          revenue: { total_usdc_micro: 0, total_orders: 0, this_month_usdc_micro: 0, this_month_orders: 0, growth_pct: 0 },
          agents: { total: 0, active: 0, pending: 0, rejected: 0 },
          rating: { average: 0, total_reviews: 0 },
        },
        { orders: [], total: 0, page: 1, limit: 5, total_pages: 1, agents: [] },
        {
          agents: [],
          total: 0,
          page: 1,
          limit: 4,
          total_pages: 1,
          status_counts: { all: 0, active: 0, pending_review: 0, rejected: 0, suspended: 0 },
        },
      ];

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-[28px] font-bold leading-tight text-[#0F172A]">Dashboard</h1>
        <p className="mt-1 text-[14px] text-[#64748B]">Overview of your activity on AgentHub</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Spending"
          value={`${formatUsdcFromMicro(dashboard.spending.total_usdc_micro)} USDC`}
          subtext={`${dashboard.spending.total_calls} calls made`}
          tone="amber"
        />
        <StatCard
          label="Revenue"
          value={`${formatUsdcFromMicro(dashboard.revenue.total_usdc_micro)} USDC`}
          subtext={`${dashboard.revenue.total_orders} orders received`}
          tone="green"
        />
        <StatCard
          label="My Agents"
          value={String(dashboard.agents.total)}
          subtext={`${dashboard.agents.active} active · ${dashboard.agents.pending} pending`}
          tone="indigo"
        />
        <StatCard
          label="Avg. Rating"
          value={dashboard.rating.average.toFixed(2)}
          subtext={`${dashboard.rating.total_reviews} reviews`}
          tone="rose"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_560px]">
        <article className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-3">
            <h2 className="text-[22px] font-semibold text-[#0F172A]">Recent Orders</h2>
            <Link href="/dashboard/orders" className="text-[14px] font-semibold text-[#6368F6]">
              View All →
            </Link>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {ordersResult.orders.length > 0 ? (
              ordersResult.orders.slice(0, 4).map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-[10px] ${
                        order.type === "initiated" ? "bg-[#EEF2FF] text-[#6366F1]" : "bg-[#F0FDF4] text-[#10B981]"
                      }`}
                    >
                      {order.type === "initiated" ? <ArrowUpRightIcon /> : <ArrowDownLeftIcon />}
                    </span>
                    <div>
                      <p className="text-[14px] font-semibold text-[#0F172A]">{order.agent_name}</p>
                      <p
                        className={`text-[12px] ${
                          order.status === "failed" ? "text-[#EF4444]" : "text-[#94A3B8]"
                        }`}
                      >
                        {order.type === "initiated" ? "Initiated" : "Received"} ·{" "}
                        {order.status === "failed" ? "Failed · " : ""}
                        {formatRelativeTime(order.created_at)}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`text-[14px] font-semibold ${
                      order.type === "initiated" ? "text-[#EF4444]" : "text-[#10B981]"
                    }`}
                  >
                    {order.type === "initiated" ? "-" : "+"}
                    {formatUsdcFromMicro(order.amount_usdc_micro)} USDC
                  </p>
                </div>
              ))
            ) : (
              <div className="px-5 py-6 text-[14px] text-[#64748B]">No recent orders.</div>
            )}
          </div>
        </article>

        <article className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-3">
            <h2 className="text-[22px] font-semibold text-[#0F172A]">My Agents</h2>
            <Link href="/dashboard/agents" className="text-[14px] font-semibold text-[#6368F6]">
              Manage →
            </Link>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {myAgents.agents.length > 0 ? (
              myAgents.agents.map((agent) => (
                <div key={agent.id} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#EEF2FF] text-[#6366F1]">
                      <AgentIcon />
                    </span>
                    <div>
                      <p className="text-[14px] font-semibold text-[#0F172A]">{agent.name}</p>
                      <p className="text-[12px] text-[#94A3B8]">
                        {agent.total_orders} orders · ★ {agent.avg_rating.toFixed(1)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[12px] font-semibold ${
                      agent.status === "active"
                        ? "bg-[#DCFCE7] text-[#16A34A]"
                        : agent.status === "pending_review"
                          ? "bg-[#FEF3C7] text-[#D97706]"
                          : "bg-[#FEE2E2] text-[#DC2626]"
                    }`}
                  >
                    {agent.status === "pending_review"
                      ? "Pending"
                      : agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-5 py-6 text-[14px] text-[#64748B]">No agents found.</div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  subtext,
  tone,
}: {
  label: string;
  value: string;
  subtext: string;
  tone: "amber" | "green" | "indigo" | "rose";
}) {
  const palette = {
    amber: "bg-[#FEF3C7] text-[#F59E0B]",
    green: "bg-[#DCFCE7] text-[#22C55E]",
    indigo: "bg-[#EEF2FF] text-[#6366F1]",
    rose: "bg-[#FEE2E2] text-[#F43F5E]",
  }[tone];

  return (
    <article className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[14px] text-[#94A3B8]">{label}</p>
          <p className="mt-2 text-[20px] font-bold leading-none text-[#0F172A]">{value}</p>
          <p className="mt-2 text-[13px] text-[#94A3B8]">{subtext}</p>
        </div>
        <span className={`grid h-8 w-8 place-items-center rounded-[10px] ${palette}`}>
          <SquareIcon />
        </span>
      </div>
    </article>
  );
}

function ArrowUpRightIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 17 17 7M9 7h8v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowDownLeftIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m17 7-10 10M7 9v8h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AgentIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="7" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 12h6M12 9v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SquareIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
