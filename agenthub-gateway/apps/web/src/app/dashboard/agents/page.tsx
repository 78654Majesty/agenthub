import Link from "next/link";
import { cookies } from "next/headers";

import {
  fetchMyAgents,
  type ProviderAgentStatus,
  type ProviderAgentSummary,
} from "@/lib/api/provider";

type DashboardAgentsPageProps = {
  searchParams?: Promise<{
    search?: string;
    status?: ProviderAgentStatus | "all";
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
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export default async function DashboardAgentsPage({ searchParams }: DashboardAgentsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const cookieStore = await cookies();
  const token = cookieStore.get("agenthub_token")?.value;
  const activeStatus = resolvedSearchParams.status ?? "all";
  const page = parsePage(resolvedSearchParams.page);
  const search = resolvedSearchParams.search?.trim() || undefined;

  const data = token
    ? await fetchMyAgents(
        {
          search,
          status: activeStatus === "all" ? undefined : activeStatus,
          page,
          limit: 20,
        },
        { token, revalidate: 0 },
      )
    : {
        agents: [],
        total: 0,
        page: 1,
        limit: 20,
        total_pages: 1,
        status_counts: {
          all: 0,
          active: 0,
          pending_review: 0,
          rejected: 0,
          suspended: 0,
        },
      };

  const filters: Array<{ label: string; status: ProviderAgentStatus | "all"; count: number }> = [
    { label: "All", status: "all", count: data.status_counts.all },
    { label: "Active", status: "active", count: data.status_counts.active },
    { label: "Pending", status: "pending_review", count: data.status_counts.pending_review },
    { label: "Rejected", status: "rejected", count: data.status_counts.rejected },
  ];

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-[#0F172A]">My Agents</h1>
          <p className="mt-1 text-[14px] text-[#64748B]">Manage your registered agents and submissions</p>
        </div>
        <div className="flex items-center gap-2.5">
          <form method="get" className="flex items-center gap-2.5">
            <input type="hidden" name="status" value={activeStatus} />
            <label className="relative">
              <SearchIcon />
              <input
                name="search"
                defaultValue={search}
                placeholder="Search agents..."
                className="h-8 w-[150px] rounded-lg border border-[#E2E8F0] bg-white pl-8 pr-3 text-[13px] text-[#64748B] outline-none"
              />
            </label>
          </form>
          <Link
            href="/dashboard/agents/new"
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#6366F1] px-4 text-[13px] font-semibold text-white"
          >
            <PlusIcon />
            New Agent
          </Link>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[14px] text-[#94A3B8]">Filter:</span>
        {filters.map((filter) => (
          <FilterPill
            key={filter.status}
            href={`/dashboard/agents${toQueryString({
              status: filter.status === "all" ? undefined : filter.status,
              search,
            })}`}
            active={filter.status === activeStatus}
          >
            {filter.label} ({filter.count})
          </FilterPill>
        ))}
      </div>

      <div className="space-y-4">
        {data.agents.length > 0 ? (
          data.agents.map((agent) => <AgentCard key={agent.id} agent={agent} />)
        ) : (
          <article className="rounded-xl border border-dashed border-[#CBD5E1] bg-white p-6 text-[14px] text-[#64748B]">
            No agents found.
          </article>
        )}
      </div>
    </section>
  );
}

function AgentCard({ agent }: { agent: ProviderAgentSummary }) {
  const detailHref = `/dashboard/agents/${agent.id}`;
  const editHref = `${detailHref}?edit=1`;
  const resubmitHref = `${detailHref}?edit=1&resubmit=1`;

  return (
    <article className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <div className="flex flex-wrap justify-between gap-4">
        <div className="min-w-[320px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[18px] font-bold leading-tight text-[#0F172A]">{agent.name}</h3>
            <StatusBadge status={agent.status} />
            {agent.chain_status === "registered" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[12px] font-semibold text-[#6366F1]">
                <ChainIcon />
                On-Chain
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[14px] text-[#64748B]">{agent.description}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {agent.tags.map((tag) => (
              <span key={tag} className="rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[12px] text-[#94A3B8]">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="min-w-[140px] text-right">
          <p className="text-[16px] font-bold leading-none text-[#0F172A]">{agent.price_usdc.toFixed(1)} USDC</p>
          {agent.status === "active" ? (
            <>
              <p className="mt-1 text-[14px] text-[#64748B]">★ {agent.avg_rating.toFixed(1)} ({agent.rating_count})</p>
              <p className="text-[14px] text-[#94A3B8]">{agent.total_orders} orders</p>
            </>
          ) : null}
          {agent.status === "pending_review" ? (
            <p className="mt-1 text-[13px] text-[#F59E0B]">Awaiting admin</p>
          ) : null}
          {agent.status === "rejected" && agent.review_note ? (
            <p className="mt-1 text-[13px] text-[#F59E0B]">Rejection note: "{agent.review_note}"</p>
          ) : null}
          <div className="mt-2 flex justify-end gap-2">
            {agent.status !== "rejected" ? (
              <Link
                className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-1 text-[13px] font-semibold text-[#64748B]"
                href={editHref}
              >
                Edit
              </Link>
            ) : null}
            {agent.status === "active" ? (
              <Link
                href={detailHref}
                className="rounded-lg bg-[#6366F1] px-3 py-1 text-[13px] font-semibold text-white"
              >
                View
              </Link>
            ) : null}
            {agent.status === "rejected" ? (
              <Link
                href={resubmitHref}
                className="rounded-lg bg-[#6366F1] px-3 py-1 text-[13px] font-semibold text-white"
              >
                Resubmit
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function FilterPill({
  children,
  active = false,
  href,
}: {
  children: React.ReactNode;
  active?: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-[13px] font-semibold ${
        active ? "bg-[#6366F1] text-white" : "border border-[#E2E8F0] bg-[#F1F5F9] text-[#64748B]"
      }`}
    >
      {children}
    </Link>
  );
}

function StatusBadge({ status }: { status: ProviderAgentStatus }) {
  if (status === "active") {
    return (
      <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[12px] font-semibold text-[#16A34A]">
        Active
      </span>
    );
  }
  if (status === "pending_review") {
    return (
      <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[12px] font-semibold text-[#D97706]">
        Pending Review
      </span>
    );
  }
  if (status === "suspended") {
    return (
      <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[12px] font-semibold text-[#64748B]">
        Suspended
      </span>
    );
  }
  return (
    <span className="rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[12px] font-semibold text-[#DC2626]">
      Rejected
    </span>
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

function PlusIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ChainIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m10 14 4-4M8.5 16.5l-2 2a3 3 0 0 1-4.2-4.2l2-2M15.5 7.5l2-2a3 3 0 1 1 4.2 4.2l-2 2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
