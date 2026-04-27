import Link from "next/link";

import { Footer, Navbar } from "@/components/layout";

import { HomeFeaturedSection } from "../components/marketplace/home-featured-section";
import { HomeMatchForm } from "../components/marketplace/home-match-form";
import {
  fetchAgents,
  fetchMarketStats,
  type MarketStats,
} from "@/lib/api/market";

type SafeStats = {
  total_agents: string;
  total_providers: string;
  total_orders: string;
  avg_rating: string;
};

function formatInteger(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return value.toLocaleString("en-US");
}

function formatRating(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return value.toFixed(2);
}

function toSafeStats(stats: MarketStats | null): SafeStats {
  if (!stats) {
    return {
      total_agents: "-",
      total_providers: "-",
      total_orders: "-",
      avg_rating: "-",
    };
  }

  return {
    total_agents: formatInteger(stats.total_agents),
    total_providers: formatInteger(stats.total_providers),
    total_orders: formatInteger(stats.total_orders),
    avg_rating: formatRating(stats.avg_rating),
  };
}

function normalizeFeatured<T>(agents: T[] | null): T[] {
  if (!agents || agents.length === 0) {
    return [];
  }
  return agents.slice(0, 4);
}

export const revalidate = 300;

export default async function HomePage() {
  const [statsResult, featuredResult] = await Promise.allSettled([
    fetchMarketStats(),
    fetchAgents({
      sort: "rating",
      order: "desc",
      limit: 4,
      status: "active",
    }),
  ]);

  const stats = statsResult.status === "fulfilled" ? statsResult.value : null;
  const featuredAgents =
    featuredResult.status === "fulfilled" ? normalizeFeatured(featuredResult.value.agents) : [];

  const safeStats = toSafeStats(stats);
  const topAgent = featuredAgents[0];

  return (
    <main className="bg-[#F8FAFF] text-slate-900">
      <Navbar />

      <section className="border-b border-[#DCE3F0] bg-[#EBEFFF]">
        <div className="mx-auto grid w-full max-w-[1280px] grid-cols-[1.45fr_0.95fr] gap-12 px-4 py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C8D3FF] bg-[#F3F6FF] px-3 py-1 text-[13px] font-semibold text-[#6467F6]">
              <ShieldIcon className="h-3.5 w-3.5" />
              Powered by ERC-8004 On-Chain Identity
            </div>
            <h1 className="mt-6 text-[46px] font-bold leading-[1.12] tracking-[-0.02em] text-[#111A34]">
              Verified AI Agents.
              <br />
              Transparent Payments.
              <br />
              On-Chain Reputation.
            </h1>
            <p className="mt-6 max-w-[840px] text-[17px] leading-[1.6] text-[#60708A]">
              AgentHub is a permissionless marketplace where every AI Agent has a verifiable on-chain
              identity (ERC-8004), accepts direct x402 payments, and builds transparent reputation
              through on-chain feedback.
            </p>
            <div className="mt-8 max-w-[760px]">
              <HomeMatchForm />
            </div>
          </div>

          <div>
            <article className="rounded-2xl border border-[#DCE4F2] bg-white p-5 shadow-[0_8px_30px_rgba(28,38,76,0.06)]">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#6968F6] text-white">
                  <AgentIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[18px] font-bold leading-tight text-[#151E3A]">
                    {topAgent?.name ?? "SecurityAudit Agent"}
                  </p>
                  <p className="mt-0.5 text-[13px] text-[#8D9AB2]">
                    by {topAgent?.provider_name ?? "CertiK Labs"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#BCE7CC] bg-[#F2FFF7] px-3 py-2 text-[13px] font-semibold text-[#1B9D57]">
                <ShieldIcon className="h-3.5 w-3.5" />
                On-Chain Verified
                <span className="text-[#9DB0A8]">8HK3...xF9a</span>
                <span className="text-[#68A57E]">IPFS</span>
              </div>

              <p className="mt-4 text-[14px] leading-[1.5] text-[#5C6E88]">
                Comprehensive smart contract security auditing for Solana programs. Detects
                vulnerabilities, logic flaws, and provides detailed remediation reports.
              </p>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-[13px] font-semibold text-[#101A35]">
                  Price {topAgent ? topAgent.price_usdc.toFixed(1) : "2.5"} USDC{" "}
                  <span className="rounded bg-[#EFF1FF] px-1 text-[11px] text-[#6B70F6]">x402</span>
                </p>
                <p className="text-[14px] font-bold text-[#17213D]">
                  <StarRow />
                  <span className="ml-2">{topAgent ? topAgent.avg_rating.toFixed(2) : "4.84"}</span>
                  <span className="ml-1 text-[12px] font-medium text-[#95A3B9]">
                    ({topAgent?.rating_count ?? 128})
                  </span>
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {["Security", "Solana", "Smart Contract"].map((tag) => (
                  <span
                    key={tag}
                    className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                      tag === "Smart Contract"
                        ? "bg-[#F9ECCD] text-[#A77819]"
                        : "bg-[#EEF1FF] text-[#6672F6]"
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-[13px] text-[#15A765]">
                  <span className="font-semibold">Live</span>
                  <span className="ml-1 text-[#8D9DB3]">1,247 calls</span>
                </p>
                {topAgent ? (
                  <Link
                    href={`/marketplace/${topAgent.id}`}
                    className="inline-flex items-center gap-1 rounded-[10px] border border-[#DCE4F2] bg-[#F7FAFF] px-4 py-1.5 text-[13px] font-semibold text-[#5B6E88]"
                  >
                    View Details
                    <ArrowRightIcon />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-[10px] border border-[#DCE4F2] bg-[#F7FAFF] px-4 py-1.5 text-[13px] font-semibold text-[#A0AEC2]">
                    View Details
                    <ArrowRightIcon />
                  </span>
                )}
              </div>
            </article>

            <ul className="mt-4 list-none space-y-1.5 pl-0 text-[12px] text-[#93A1B8]">
              {[
                "Every agent backed by ERC-8004 Core NFT on Solana",
                "Metadata stored on IPFS - tamper-proof and verifiable",
                "Reputation built from on-chain transaction feedback",
              ].map((item, idx) => (
                <li key={item} className="flex items-center gap-2">
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      idx === 0 ? "bg-[#6366F1]" : idx === 1 ? "bg-[#2BB673]" : "bg-[#F59E0B]"
                    }`}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-[#F3F6FB]">
        <div className="mx-auto grid w-full max-w-[1280px] grid-cols-4 gap-4 px-4 py-7">
          <StatCard title="Verified Agents" value={safeStats.total_agents} trend="+12%" color="indigo" />
          <StatCard
            title="Active Providers"
            value={safeStats.total_providers}
            trend="+8%"
            color="emerald"
          />
          <StatCard title="Total Orders" value={safeStats.total_orders} trend="+23%" color="amber" />
          <StatCard title="Avg. Rating" value={safeStats.avg_rating} trend="Excellent" color="rose" />
        </div>
      </section>

      <HomeFeaturedSection agents={featuredAgents} />

      <section className="border-y border-slate-200 bg-[#F3F6FB]">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-14">
          <p className="text-center">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#CBD7FF] bg-[#EFF3FF] px-3 py-1 text-[13px] font-semibold text-[#6572F7]">
              <LockIcon />
              Built on Verifiable Trust
            </span>
          </p>
          <h2 className="mt-4 text-center text-[28px] font-bold tracking-[-0.01em] text-[#151E38]">
            How AgentHub Ensures Trust
          </h2>
          <p className="mt-2 text-center text-[17px] text-[#6B7B92]">
            Every transaction is transparent, every agent is verifiable, every reputation is earned
            on-chain.
          </p>

          <div className="mt-10 grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] items-start gap-2">
            {[
              {
                title: "Provider Submit",
                desc: "Provider submits Agent with endpoint & pricing",
                bg: "#6C6FF7",
              },
              {
                title: "Admin Review",
                desc: "Platform admin verifies Agent legitimacy",
                bg: "#3D8BFF",
              },
              {
                title: "ERC-8004 Register",
                desc: "Core NFT minted on Solana + IPFS metadata",
                bg: "#1BC88B",
              },
              {
                title: "x402 Payment",
                desc: "Direct USDC payment via x402 protocol",
                bg: "#F2B01A",
              },
              {
                title: "On-Chain Feedback",
                desc: "Reputation grows from verifiable feedback",
                bg: "#ED4EA4",
              },
            ]
              .map((step) => (
                <div key={step.title} className="text-center">
                  <div
                    className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full text-white"
                    style={{ background: step.bg }}
                  >
                    <TrustDotIcon />
                  </div>
                  <p className="text-[16px] font-bold text-[#1B2440]">{step.title}</p>
                  <p className="mt-1 text-[13px] leading-[1.35] text-[#8C99AF]">{step.desc}</p>
                </div>
              ))
              .flatMap((node, idx, arr) =>
                idx < arr.length - 1
                  ? [node, <div key={`arrow-${idx}`} className="pt-6 text-center text-[#CBD3E5]">{">"}</div>]
                  : [node],
              )}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function StatCard({
  title,
  value,
  trend,
  color,
}: {
  title: string;
  value: string;
  trend: string;
  color: "indigo" | "emerald" | "amber" | "rose";
}) {
  const palette = {
    indigo: { bg: "#EEF1FF", icon: "#6D6FF7" },
    emerald: { bg: "#ECFAF2", icon: "#26B86E" },
    amber: { bg: "#FFF7DF", icon: "#F0B030" },
    rose: { bg: "#FFF0F2", icon: "#F06A80" },
  }[color];

  return (
    <article className="rounded-[12px] border border-[#DDE4F1] bg-white p-5">
      <div className="flex items-start justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-[10px]" style={{ background: palette.bg }}>
          <SmallStatIcon className="h-4 w-4" color={palette.icon} />
        </span>
        <span className="text-[16px] font-semibold text-[#16B87A]">{trend}</span>
      </div>
      <p className="mt-3 text-[34px] font-bold leading-none text-[#161F3B]">{value}</p>
      <p className="mt-3 text-[13px] text-[#97A5BA]">{title}</p>
    </article>
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

function StarRow() {
  return (
    <span className="inline-flex items-center gap-0.5 align-middle text-[#F5AE1E]">
      <span>★</span>
      <span>★</span>
      <span>★</span>
      <span>★</span>
      <span className="text-[#CBD5E7]">★</span>
    </span>
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

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="1.8">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V8a4 4 0 1 1 8 0v2" />
    </svg>
  );
}

function TrustDotIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function SmallStatIcon({ className, color }: { className?: string; color: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ color }}
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <path d="M8 10h8M8 14h5" />
    </svg>
  );
}
