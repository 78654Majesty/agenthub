import Link from "next/link";
import { cookies } from "next/headers";

import { fetchOrders, type UserOrderItem } from "@/lib/api/consumer";

type DashboardOrdersPageProps = {
  searchParams?: Promise<{
    search?: string;
    type?: "initiated" | "received";
    status?: string;
    agent_id?: string;
    page?: string;
  }>;
};

function parsePage(value?: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.floor(parsed);
}

function toQueryString(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      query.set(key, value);
    }
  }

  const result = query.toString();
  return result ? `?${result}` : "";
}

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

function formatStatusLabel(status: string) {
  const normalized = status.replace(/_/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function paymentLabel(order: UserOrderItem) {
  if (order.payment_verified) {
    return "Verified";
  }
  if (order.status === "failed") {
    return "Failed";
  }
  return "Pending";
}

function orderTypeLabel(type: UserOrderItem["type"]) {
  return type === "initiated" ? "Initiated" : "Received";
}

function resolveOrderType(value?: string): "initiated" | "received" | undefined {
  if (value === "initiated" || value === "received") {
    return value;
  }
  return undefined;
}

function buildPageHref(
  page: number,
  filters: {
    search?: string;
    type?: string;
    status?: string;
    agent_id?: string;
  },
) {
  return `/dashboard/orders${toQueryString({
    ...filters,
    page: page > 1 ? String(page) : undefined,
  })}`;
}

export default async function DashboardOrdersPage({ searchParams }: DashboardOrdersPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const cookieStore = await cookies();
  const token = cookieStore.get("agenthub_token")?.value;
  const page = parsePage(resolvedSearchParams.page);
  const search = resolvedSearchParams.search?.trim() || undefined;
  const type = resolveOrderType(resolvedSearchParams.type);
  const status = resolvedSearchParams.status || undefined;
  const agentId = resolvedSearchParams.agent_id || undefined;

  const ordersResult = token
    ? await fetchOrders(
        {
          search,
          type,
          status,
          agent_id: agentId,
          page,
          limit: 20,
          sort: "created_at",
          order: "desc",
        },
        { token, revalidate: 0 },
      )
    : {
        orders: [],
        total: 0,
        page: 1,
        limit: 20,
        total_pages: 1,
        agents: [],
      };

  const filters = {
    search,
    type,
    status,
    agent_id: agentId,
  };

  const showingFrom = ordersResult.total === 0 ? 0 : (ordersResult.page - 1) * ordersResult.limit + 1;
  const showingTo = Math.min(ordersResult.page * ordersResult.limit, ordersResult.total);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-[#0F172A]">Orders</h1>
          <p className="mt-1 text-[14px] text-[#64748B]">All orders across your activity on AgentHub</p>
        </div>

        <Link
          href={`/dashboard/orders/export${toQueryString(filters)}`}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 text-[13px] font-semibold text-[#64748B]"
        >
          <ExportIcon />
          Export
        </Link>
      </div>

      <article className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
        <form method="get" className="flex flex-wrap items-center gap-3 border-b border-[#E2E8F0] px-5 py-4">
          <label className="relative min-w-[320px] flex-1">
            <SearchIcon />
            <input
              name="search"
              defaultValue={search}
              placeholder="Search by order ID, agent, or consumer..."
              className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white pl-10 pr-3 text-[13px] text-[#64748B] outline-none"
            />
          </label>

          <select
            name="type"
            defaultValue={type ?? ""}
            className="h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13px] text-[#64748B] outline-none"
          >
            <option value="">All Types</option>
            <option value="initiated">Initiated</option>
            <option value="received">Received</option>
          </select>

          <select
            name="status"
            defaultValue={status ?? ""}
            className="h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13px] text-[#64748B] outline-none"
          >
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>

          <select
            name="agent_id"
            defaultValue={agentId ?? ""}
            className="h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13px] text-[#64748B] outline-none"
          >
            <option value="">All Agents</option>
            {ordersResult.agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-lg bg-[#6366F1] px-4 text-[13px] font-semibold text-white"
          >
            Apply
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-left text-[13px] font-semibold text-[#94A3B8]">
                <th className="px-5 py-3">Order ID</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Agent</th>
                <th className="px-3 py-3">Consumer</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Payment</th>
                <th className="px-5 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {ordersResult.orders.length > 0 ? (
                ordersResult.orders.map((order) => <OrderRow key={order.id} order={order} />)
              ) : (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-[14px] text-[#64748B]">
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E8F0] px-5 py-4">
          <p className="text-[14px] text-[#94A3B8]">
            Showing {showingFrom}-{showingTo} of {ordersResult.total} orders
          </p>

          <div className="flex items-center gap-2">
            <PaginationLink
              href={buildPageHref(Math.max(ordersResult.page - 1, 1), filters)}
              disabled={ordersResult.page <= 1}
            >
              Prev
            </PaginationLink>

            {Array.from({ length: ordersResult.total_pages }, (_, index) => index + 1)
              .filter((pageNumber) => {
                if (ordersResult.total_pages <= 5) {
                  return true;
                }
                return (
                  pageNumber === 1 ||
                  pageNumber === ordersResult.total_pages ||
                  Math.abs(pageNumber - ordersResult.page) <= 1
                );
              })
              .map((pageNumber, index, items) => {
                const previous = items[index - 1];
                const showGap = previous && pageNumber - previous > 1;

                return (
                  <div key={pageNumber} className="flex items-center gap-2">
                    {showGap ? <span className="text-[14px] text-[#94A3B8]">...</span> : null}
                    <PaginationLink
                      href={buildPageHref(pageNumber, filters)}
                      active={pageNumber === ordersResult.page}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </div>
                );
              })}

            <PaginationLink
              href={buildPageHref(Math.min(ordersResult.page + 1, ordersResult.total_pages), filters)}
              disabled={ordersResult.page >= ordersResult.total_pages}
            >
              Next
            </PaginationLink>
          </div>
        </div>
      </article>
    </section>
  );
}

function OrderRow({ order }: { order: UserOrderItem }) {
  return (
    <tr className="text-[14px] text-[#334155]">
      <td className="px-5 py-4 font-semibold text-[#6366F1]">#{order.id}</td>
      <td className="px-3 py-4">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px] font-semibold ${
            order.type === "received" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#EEF2FF] text-[#6366F1]"
          }`}
        >
          {order.type === "received" ? <ArrowDownLeftIcon /> : <ArrowUpRightIcon />}
          {orderTypeLabel(order.type)}
        </span>
      </td>
      <td className="px-3 py-4">
        <p className="font-semibold text-[#0F172A]">{order.agent_name}</p>
      </td>
      <td className="px-3 py-4 text-[#64748B]">{order.counterparty_wallet}</td>
      <td className="px-3 py-4 font-semibold text-[#0F172A]">
        {formatUsdcFromMicro(order.amount_usdc_micro)} USDC
      </td>
      <td className="px-3 py-4">
        <StatusBadge status={order.status} />
      </td>
      <td className="px-3 py-4">
        <PaymentBadge order={order} />
      </td>
      <td className="px-5 py-4 text-[#94A3B8]">{formatRelativeTime(order.created_at)}</td>
    </tr>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "completed"
      ? "bg-[#DCFCE7] text-[#16A34A]"
      : status === "failed"
        ? "bg-[#FEE2E2] text-[#DC2626]"
        : "bg-[#FEF3C7] text-[#D97706]";

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-[12px] font-semibold ${tone}`}>
      {formatStatusLabel(status)}
    </span>
  );
}

function PaymentBadge({ order }: { order: UserOrderItem }) {
  const label = paymentLabel(order);
  const tone =
    label === "Verified"
      ? "bg-[#DCFCE7] text-[#16A34A]"
      : label === "Failed"
        ? "bg-[#FEE2E2] text-[#DC2626]"
        : "bg-[#FEF3C7] text-[#D97706]";

  return <span className={`inline-flex rounded-full px-2 py-1 text-[12px] font-semibold ${tone}`}>{label}</span>;
}

function PaginationLink({
  href,
  children,
  active = false,
  disabled = false,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  const className = `inline-flex min-w-9 items-center justify-center rounded-lg border px-3 py-2 text-[13px] font-semibold ${
    active
      ? "border-[#6366F1] bg-[#6366F1] text-white"
      : disabled
        ? "border-[#E2E8F0] bg-[#F8FAFC] text-[#CBD5E1]"
        : "border-[#E2E8F0] bg-white text-[#64748B]"
  }`;

  if (disabled) {
    return <span className={className}>{children}</span>;
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function SearchIcon() {
  return (
    <svg
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A1AEC2]"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" stroke="currentColor" strokeWidth="2" />
      <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3v10m0 0 4-4m-4 4-4-4M5 16v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
