"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { MarketAgent } from "@/lib/api/market";

const FILTERS = ["All", "Security", "DeFi", "Data Analysis", "Code Audit", "NLP"] as const;

function deriveCategory(agent: MarketAgent): (typeof FILTERS)[number] {
  const haystack = [agent.name, agent.description, ...agent.tags].join(" ").toLowerCase();

  if (haystack.includes("security") || haystack.includes("audit") || haystack.includes("risk")) {
    return "Security";
  }
  if (haystack.includes("defi") || haystack.includes("token") || haystack.includes("yield")) {
    return "DeFi";
  }
  if (haystack.includes("data") || haystack.includes("pipeline") || haystack.includes("analytics")) {
    return "Data Analysis";
  }
  if (haystack.includes("code") || haystack.includes("anchor") || haystack.includes("contract")) {
    return "Code Audit";
  }
  return "NLP";
}

export function HomeFeaturedSection({ agents }: { agents: MarketAgent[] }) {
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>("All");

  const filteredAgents = useMemo(() => {
    if (activeFilter === "All") {
      return agents;
    }
    return agents.filter((agent) => deriveCategory(agent) === activeFilter);
  }, [activeFilter, agents]);

  return (
    <section className="mx-auto w-full max-w-[1280px] px-4 py-12">
      <div className="flex items-center justify-between">
        <h2 className="text-[28px] font-bold tracking-[-0.01em] text-[#131C37]">Featured Agents</h2>
        <Link href="/marketplace" className="inline-flex items-center gap-1 text-[14px] font-semibold text-[#6873F7]">
          View all agents <ArrowRightIcon />
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => setActiveFilter(tag)}
            className={`rounded-full px-4 py-1.5 text-[13px] font-semibold ${
              tag === activeFilter
                ? "bg-[#6467F6] text-white"
                : "border border-[#D6DDEA] bg-[#EEF2F8] text-[#64758E]"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        {filteredAgents.map((agent, idx) => (
          <FeaturedCard key={agent.id} agent={agent} index={idx} />
        ))}
      </div>
    </section>
  );
}

function FeaturedCard({ agent, index }: { agent: MarketAgent; index: number }) {
  const iconColors = ["#6C6FF7", "#20C38D", "#F1AF1E", "#EC5AA6"];
  const iconBg = iconColors[index % iconColors.length];

  return (
    <Link
      href={`/marketplace/${agent.id}`}
      className="block rounded-[14px] border border-[#DDE4F1] bg-white p-4 transition hover:border-[#CBD6EC] hover:shadow-[0_8px_22px_rgba(28,38,76,0.08)]"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-[10px] text-white" style={{ background: iconBg }}>
            <AgentIcon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[18px] font-bold leading-tight text-[#17203C]">{agent.name}</p>
            <p className="text-[13px] text-[#99A7BD]">by {agent.provider_name ?? "Provider"}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFBEF] px-2.5 py-1 text-[12px] font-semibold text-[#1FA963]">
          <ShieldIcon className="h-3 w-3" />
          Verified
        </span>
      </div>

      <p className="mt-3 min-h-[44px] text-[14px] leading-[1.45] text-[#60728C]">{agent.description}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {agent.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="rounded-full bg-[#EEF1FF] px-2.5 py-1 text-[12px] font-semibold text-[#6875F6]">
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[16px] font-bold text-[#17203C]">{agent.price_usdc.toFixed(1)} USDC</span>
        <span className="text-[13px] text-[#15AA67]">
          Live
          <span className="ml-2 text-[#F6A821]">{agent.avg_rating.toFixed(1)}</span>
          <span className="ml-1 text-[#8D9DB3]">({agent.rating_count})</span>
        </span>
      </div>
    </Link>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2">
      <path d="M12 3.5 5 7v5.5c0 4.2 2.99 6.96 7 8 4.01-1.04 7-3.8 7-8V7l-7-3.5Z" />
    </svg>
  );
}

function AgentIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8">
      <rect x="6" y="7" width="12" height="10" rx="2" />
      <path d="M9 11h6M12 9v4M9 17v2M15 17v2M12 5v2" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 10h11" />
      <path d="m11 6 4 4-4 4" />
    </svg>
  );
}
