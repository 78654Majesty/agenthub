"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

type MarketplaceAgent = {
  id: string;
  name: string;
  provider: string;
  description: string;
  priceUsdc: number;
  tags: string[];
  category: string;
  rating: number;
  ratingCount: number;
  calls: string;
  status: "live" | "partial";
  accent: "indigo" | "emerald" | "amber" | "pink" | "violet" | "sky" | "rose" | "teal" | "fuchsia";
};

export type MarketplaceShellData = {
  agents: MarketplaceAgent[];
  total: number;
  showing: number;
  page: number;
  totalPages: number;
  sortBy: (typeof SORT_OPTIONS)[number]["value"];
  minPrice?: number;
  maxPrice?: number;
};

const CATEGORY_OPTIONS = [
  "All Categories",
  "Security",
  "DeFi",
  "Data Analysis",
  "Code Audit",
  "NLP",
  "Infrastructure",
] as const;

const SORT_OPTIONS = [
  { value: "rating", label: "Rating" },
  { value: "price", label: "Price" },
  { value: "newest", label: "Newest" },
  { value: "calls", label: "Calls" },
] as const;

const ACCENT_CLASS: Record<MarketplaceAgent["accent"], string> = {
  indigo: "bg-indigo-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  pink: "bg-pink-500",
  violet: "bg-violet-500",
  sky: "bg-sky-500",
  rose: "bg-rose-500",
  teal: "bg-teal-500",
  fuchsia: "bg-fuchsia-500",
};

export function MarketplaceShell({ data }: { data: MarketplaceShellData }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<(typeof CATEGORY_OPTIONS)[number]>("All Categories");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [minPriceInput, setMinPriceInput] = useState(data.minPrice?.toString() ?? "0");
  const [maxPriceInput, setMaxPriceInput] = useState(data.maxPrice?.toString() ?? "50");

  function updateRoute(next: {
    sortBy?: (typeof SORT_OPTIONS)[number]["value"];
    page?: number;
    minPrice?: string;
    maxPrice?: string;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    const sortBy = next.sortBy ?? data.sortBy;
    const page = next.page ?? data.page;
    const order = sortBy === "price" ? "asc" : "desc";

    params.set("sort", sortBy);
    params.set("order", order);
    params.set("page", String(page));

    if (next.minPrice !== undefined) {
      if (next.minPrice === "") {
        params.delete("min_price");
      } else {
        params.set("min_price", next.minPrice);
      }
    }

    if (next.maxPrice !== undefined) {
      if (next.maxPrice === "") {
        params.delete("max_price");
      } else {
        params.set("max_price", next.maxPrice);
      }
    }

    router.push(`/marketplace?${params.toString()}`);
  }

  function commitPriceRange() {
    const minPrice = minPriceInput.trim();
    const maxPrice = maxPriceInput.trim();

    updateRoute({
      page: 1,
      minPrice,
      maxPrice,
    });
  }

  const filteredAgents = useMemo(() => {
    return data.agents.filter((agent) => {
      const byCategory =
        activeCategory === "All Categories" ||
        agent.category.toLowerCase() === activeCategory.toLowerCase();

      const query = search.trim().toLowerCase();
      const bySearch =
        query.length === 0 ||
        agent.name.toLowerCase().includes(query) ||
        agent.description.toLowerCase().includes(query) ||
        agent.tags.join(" ").toLowerCase().includes(query);

      return byCategory && bySearch;
    });
  }, [activeCategory, data.agents, search]);

  return (
    <main className="min-h-screen bg-[#F8FAFF]">
      <section className="mx-auto w-full max-w-[1320px] px-6 pb-8 pt-12">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.01em] text-[#141E39]">Agent Marketplace</h1>
        <p className="mt-2 text-[14px] text-[#51637E]">
          Browse, compare, and discover verified AI agents. Every agent has an ERC-8004 on-chain identity.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <label className="relative min-w-[300px] flex-1">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CAAC1]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search agents by name, capability, or description..."
              className="h-10 w-full rounded-xl border border-[#D5DDEA] bg-white pl-11 pr-4 text-[14px] text-slate-700 outline-none"
            />
          </label>

          <div className="flex h-10 items-center rounded-xl border border-[#D5DDEA] bg-white px-4 text-[14px] text-[#485B78]">
            <span>Sort by:</span>
            <select
              value={data.sortBy}
              onChange={(event) =>
                updateRoute({
                  sortBy: event.target.value as (typeof SORT_OPTIONS)[number]["value"],
                  page: 1,
                })
              }
              className="ml-1 bg-transparent font-medium text-[#2F3F59] outline-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center rounded-xl border border-[#D5DDEA] bg-[#F2F5FA] p-1">
            <button
              type="button"
              onClick={() => setView("grid")}
              className={`grid h-8 w-8 place-items-center rounded-md transition ${
                view === "grid" ? "bg-white text-[#4B5E7A]" : "text-[#94A3B8]"
              }`}
              aria-label="Grid view"
            >
              <GridIcon />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`grid h-8 w-8 place-items-center rounded-md transition ${
                view === "list" ? "bg-white text-[#4B5E7A]" : "text-[#94A3B8]"
              }`}
              aria-label="List view"
            >
              <ListIcon />
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <p className="inline-flex items-center gap-1.5 text-[14px] text-[#7A8AA4]">
            <FilterIcon />
            Filters:
          </p>
          {CATEGORY_OPTIONS.map((category) => {
            const active = category === activeCategory;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`rounded-full px-4 py-1 text-[13px] font-semibold transition ${
                  active
                    ? "bg-[#6568F6] text-white"
                    : "border border-[#D3DBE8] bg-[#EEF2F8] text-[#5C6E89]"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-[#8B99AF]">
          <span className="text-[14px] text-[#73839D]">Price Range:</span>
          <input
            inputMode="decimal"
            value={minPriceInput}
            onChange={(event) => setMinPriceInput(event.target.value)}
            onBlur={commitPriceRange}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commitPriceRange();
              }
            }}
            className="h-8 w-[84px] rounded-xl border border-[#D5DDEA] bg-white px-3 text-[13px] font-medium text-[#4B5D79] outline-none"
            aria-label="Minimum price"
          />
          <span>-</span>
          <input
            inputMode="decimal"
            value={maxPriceInput}
            onChange={(event) => setMaxPriceInput(event.target.value)}
            onBlur={commitPriceRange}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commitPriceRange();
              }
            }}
            className="h-8 w-[84px] rounded-xl border border-[#D5DDEA] bg-white px-3 text-[13px] font-medium text-[#4B5D79] outline-none"
            aria-label="Maximum price"
          />
          <span>USDC</span>
          <span>
            Showing {Math.min(filteredAgents.length, data.showing)} of {data.total.toLocaleString("en-US")} agents
          </span>
        </div>

        <div className={view === "grid" ? "mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3" : "mt-6 space-y-4"}>
          {filteredAgents.map((agent) => (
            <MarketplaceAgentCard key={agent.id} agent={agent} view={view} />
          ))}
        </div>

        <div className="mt-8 flex items-center justify-center gap-1.5 pb-6">
          <PaginationButton
            label="< Prev"
            muted={data.page <= 1}
            onClick={() => {
              if (data.page > 1) {
                updateRoute({ page: data.page - 1 });
              }
            }}
          />
          {Array.from({ length: data.totalPages }, (_, index) => index + 1)
            .filter((page) => {
              if (data.totalPages <= 7) {
                return true;
              }
              return page === 1 || page === data.totalPages || Math.abs(page - data.page) <= 1;
            })
            .map((page, index, pages) => {
              const previousPage = pages[index - 1];
              const shouldInsertGap = previousPage !== undefined && page - previousPage > 1;

              return (
                <FragmentWithGap
                  key={page}
                  showGap={shouldInsertGap}
                  page={page}
                  active={page === data.page}
                  onClick={() => updateRoute({ page })}
                />
              );
            })}
          <PaginationButton
            label="Next >"
            muted={data.page >= data.totalPages}
            onClick={() => {
              if (data.page < data.totalPages) {
                updateRoute({ page: data.page + 1 });
              }
            }}
          />
        </div>
      </section>
    </main>
  );
}

function MarketplaceAgentCard({
  agent,
  view,
}: {
  agent: MarketplaceAgent;
  view: "grid" | "list";
}) {
  const statusLabel = agent.status === "partial" ? "Partial" : "Live";

  return (
    <Link
      href={`/marketplace/${agent.id}`}
      className={`block rounded-2xl border border-[#DDE5F1] bg-white transition hover:border-[#CBD6EC] hover:shadow-[0_8px_22px_rgba(28,38,76,0.08)] ${
        view === "grid" ? "p-4" : "px-5 py-4"
      }`}
    >
      {view === "grid" ? (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`grid h-10 w-10 place-items-center rounded-xl text-white ${ACCENT_CLASS[agent.accent]}`}>
                <AgentGlyph />
              </div>
              <div>
                <h3 className="text-[18px] font-bold leading-tight text-[#17213D]">{agent.name}</h3>
                <p className="text-[13px] text-[#9AA7BC]">by {agent.provider}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFBEF] px-2.5 py-1 text-[12px] font-semibold text-[#22A561]">
              <VerifyIcon />
              Verified
            </span>
          </div>

          <p className="mt-3 min-h-[72px] text-[14px] leading-[1.45] text-[#5F718C]">{agent.description}</p>

          <div className="mt-2 flex flex-wrap gap-2">
            {agent.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-[#EEF1FF] px-2.5 py-1 text-[12px] font-semibold text-[#6874F6]">
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-3 flex items-end justify-between">
            <p className="text-[16px] font-bold text-[#17213D]">{agent.priceUsdc.toFixed(1)} USDC</p>
            <div className="flex items-center gap-2 text-[13px] text-[#8E9DB3]">
              <span className="font-semibold text-[#14AA67]">{statusLabel}</span>
              <span className="font-semibold text-[#F5AB1C]">★ {agent.rating.toFixed(1)}</span>
              <span>({agent.ratingCount})</span>
              <span>{agent.calls} calls</span>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between gap-5">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white ${ACCENT_CLASS[agent.accent]}`}>
              <AgentGlyph />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-[18px] font-bold leading-tight text-[#17213D]">{agent.name}</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFBEF] px-2.5 py-1 text-[12px] font-semibold text-[#22A561]">
                  <VerifyIcon />
                  Verified
                </span>
              </div>
              <p className="mt-1 text-[13px] text-[#9AA7BC]">by {agent.provider}</p>
              <p className="mt-2 text-[14px] leading-[1.45] text-[#5F718C]">{agent.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {agent.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-[#EEF1FF] px-2.5 py-1 text-[12px] font-semibold text-[#6874F6]">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[16px] font-bold text-[#17213D]">{agent.priceUsdc.toFixed(1)} USDC</p>
            <div className="mt-2 flex justify-end gap-3 text-[13px] text-[#8E9DB3]">
              <span className="font-semibold text-[#14AA67]">{statusLabel}</span>
              <span className="font-semibold text-[#F5AB1C]">★ {agent.rating.toFixed(1)}</span>
              <span>({agent.ratingCount})</span>
              <span>{agent.calls} calls</span>
            </div>
          </div>
        </div>
      )}
    </Link>
  );
}

function FragmentWithGap({
  showGap,
  page,
  active,
  onClick,
}: {
  showGap: boolean;
  page: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <>
      {showGap ? <span className="px-2 text-[13px] text-[#A1AFBF]">...</span> : null}
      <PaginationButton label={String(page)} active={active} onClick={onClick} />
    </>
  );
}

function PaginationButton({
  label,
  active = false,
  muted = false,
  onClick,
}: {
  label: string;
  active?: boolean;
  muted?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={muted}
      className={`h-8 rounded-[10px] border px-3 text-[13px] transition ${
        active
          ? "border-[#6568F6] bg-[#6568F6] text-white"
          : muted
            ? "border-[#DCE3EF] bg-white text-[#C1CADB]"
            : "border-[#D1D9E7] bg-white text-[#586B87] hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" stroke="currentColor" strokeWidth="2" />
      <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 6h16M4 12h16M4 18h16" stroke="#8FA0B8" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="9" cy="6" r="2" fill="#8FA0B8" />
      <circle cx="15" cy="12" r="2" fill="#8FA0B8" />
      <circle cx="7" cy="18" r="2" fill="#8FA0B8" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="14" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="14" y="14" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 7h14M6 12h14M6 17h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="3.5" cy="7" r="1" fill="currentColor" />
      <circle cx="3.5" cy="12" r="1" fill="currentColor" />
      <circle cx="3.5" cy="17" r="1" fill="currentColor" />
    </svg>
  );
}

function AgentGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3.5 5 7v5.5c0 4.2 2.99 6.96 7 8 4.01-1.04 7-3.8 7-8V7l-7-3.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M9.5 12h5M12 9.5v5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function VerifyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3.5 5 7v5.5c0 4.2 2.99 6.96 7 8 4.01-1.04 7-3.8 7-8V7l-7-3.5Z" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  );
}
