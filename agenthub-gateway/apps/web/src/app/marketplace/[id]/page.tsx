import Link from "next/link";

import { Footer, Navbar } from "@/components/layout";
import { fetchAgentDetail, fetchAgentOnChain } from "@/lib/api/market";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  try {
    const [agent, onChain] = await Promise.all([
      fetchAgentDetail(id),
      fetchAgentOnChain(id).catch(() => null),
    ]);
    const isOnChainVerified = (agent.chain_status ?? onChain?.chain_status) === "registered";

    return (
      <>
        <Navbar activeLink="Marketplace" />
        <main className="min-h-screen bg-[#F8FAFF]">
          <section className="mx-auto w-full max-w-[1180px] px-6 py-10">
            <div className="space-y-6">
              <p className="text-[13px] text-[#7A8AA3]">
                <Link href="/marketplace" className="font-semibold text-[#6875F7]">
                  Marketplace
                </Link>{" "}
                {" > "} {agent.name}
              </p>

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-[28px] font-bold leading-tight text-[#19233F]">{agent.name}</h1>
                    <StatusBadge status={agent.status} />
                    {isOnChainVerified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF1FF] px-2 py-0.5 text-[12px] font-semibold text-[#6773F6]">
                        <ChainIcon />
                        On-Chain Verified
                      </span>
                    ) : null}
                  </div>
                  <p className="max-w-[820px] text-[14px] leading-[1.45] text-[#60728C]">{agent.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {agent.tags.map((tag) => (
                      <span key={tag} className="rounded-md bg-[#EEF2F7] px-2 py-0.5 text-[12px] text-[#7A8AA3]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Price" value={`${agent.price_usdc.toFixed(1)} USDC`} />
                <StatCard label="Total Orders" value={String(agent.total_calls)} />
                <StatCard label="Avg. Rating" value={`${agent.avg_rating.toFixed(1)} (${agent.rating_count} reviews)`} />
                <StatCard label="Provider" value={agent.provider_name ?? agent.provider_wallet ?? "-"} />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <InfoPanel title="Agent Configuration">
                  <InfoRow label="Endpoint URL" value={agent.endpoint ?? "-"} mono />
                  <InfoRow label="Capabilities" value={agent.tags.join(", ") || "-"} />
                  <InfoRow label="Status" value={formatStatus(agent.status)} />
                  <InfoRow label="Liveness" value={formatLiveness(agent.liveness)} />
                  <InfoRow label="Created" value={agent.created_at ? formatDate(agent.created_at) : "-"} />
                </InfoPanel>

                <InfoPanel title="On-Chain Identity (ERC-8004)">
                  <InfoRow label="Asset Address" value={agent.sol_asset_address ?? onChain?.sol_asset_address ?? "-"} mono />
                  <InfoRow label="IPFS URI" value={onChain?.ipfs_metadata_uri ?? "-"} mono />
                  <InfoRow label="Owner" value={onChain?.owner ?? agent.provider_wallet ?? "-"} mono />
                  <InfoRow label="Chain Status" value={formatChainStatus(agent.chain_status ?? onChain?.chain_status)} />
                  <InfoRow
                    label="Reputation"
                    value={onChain ? `${onChain.reputation.rating_count} ratings / ${onChain.reputation.transaction_count} txs` : "-"}
                  />
                </InfoPanel>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  } catch {
    return (
      <>
        <Navbar activeLink="Marketplace" />
        <main className="min-h-screen bg-[#F8FAFF]">
          <section className="mx-auto w-full max-w-[960px] px-6 py-16">
            <div className="rounded-[18px] border border-[#DDE4F1] bg-white p-8">
              <h1 className="text-[28px] font-bold text-[#17213D]">Agent not found</h1>
              <p className="mt-3 text-[14px] text-[#647791]">
                The agent detail page could not be loaded.
              </p>
              <Link href="/marketplace" className="mt-6 inline-flex text-[14px] font-semibold text-[#6875F7]">
                Back to Marketplace
              </Link>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatStatus(status?: string) {
  if (status === "active") {
    return "Active";
  }
  if (status === "pending_review") {
    return "Pending Review";
  }
  if (status === "suspended") {
    return "Suspended";
  }
  if (status === "rejected") {
    return "Rejected";
  }
  return status ?? "-";
}

function formatChainStatus(status?: string) {
  if (status === "registered") {
    return "Registered";
  }
  if (status === "uploading") {
    return "Uploading";
  }
  if (status === "failed") {
    return "Failed";
  }
  if (status === "none") {
    return "Not Registered";
  }
  return status ?? "-";
}

function formatLiveness(value?: "live" | "partial" | "not_live") {
  if (value === "live") {
    return "Live";
  }
  if (value === "partial") {
    return "Partial";
  }
  if (value === "not_live") {
    return "Not Live";
  }
  return "-";
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[12px] border border-[#DDE4F1] bg-white p-4">
      <p className="text-[14px] text-[#8FA0B7]">{label}</p>
      <p className="mt-1 text-[20px] font-bold leading-none text-[#1A2340]">{value}</p>
    </article>
  );
}

function InfoPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="overflow-hidden rounded-[12px] border border-[#DDE4F1] bg-white">
      <h2 className="border-b border-[#E7EDF6] px-4 py-3 text-[22px] font-semibold text-[#1A2340]">{title}</h2>
      <div>{children}</div>
    </article>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 border-b border-[#EEF3F9] px-4 py-3 text-[14px] last:border-b-0">
      <span className="text-[#8CA0BB]">{label}</span>
      <span className={`${mono ? "font-mono text-[13px]" : ""} break-all text-[#2A3A55]`}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  if (status === "active") {
    return (
      <span className="rounded-full bg-[#EAFBF0] px-2 py-0.5 text-[12px] font-semibold text-[#19AA66]">
        Active
      </span>
    );
  }
  if (status === "pending_review") {
    return (
      <span className="rounded-full bg-[#FFF4DF] px-2 py-0.5 text-[12px] font-semibold text-[#E59A1E]">
        Pending Review
      </span>
    );
  }
  if (status === "suspended") {
    return (
      <span className="rounded-full bg-[#F1F3F7] px-2 py-0.5 text-[12px] font-semibold text-[#647791]">
        Suspended
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="rounded-full bg-[#FFECEF] px-2 py-0.5 text-[12px] font-semibold text-[#EF5567]">
        Rejected
      </span>
    );
  }
  return null;
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
