import Link from "next/link";
import { cookies } from "next/headers";

import { AgentForm } from "@/components/provider/agent-form";
import { fetchMyAgent, type ProviderAgentStatus } from "@/lib/api/provider";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ edit?: string; resubmit?: string }>;
};

export default async function AgentDetailPage({ params, searchParams }: PageProps) {
  const [{ id }, resolvedSearchParams, cookieStore] = await Promise.all([
    params,
    searchParams ?? Promise.resolve<{ edit?: string; resubmit?: string }>({}),
    cookies(),
  ]);

  const token = cookieStore.get("agenthub_token")?.value;
  const agent = token ? await fetchMyAgent(id, { token, revalidate: 0 }) : null;
  const isEditMode = resolvedSearchParams?.edit === "1";
  const resubmit = resolvedSearchParams?.resubmit === "1";

  if (!agent) {
    return (
      <section>
        <h1 className="text-[28px] font-bold leading-tight text-[#19233F]">Agent not found</h1>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[13px] text-[#94A3B8]">
            <Link href="/dashboard/agents" className="font-semibold text-[#6366F1]">
              My Agents
            </Link>{" "}
            › {agent.name}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] font-bold leading-tight text-[#0F172A]">{agent.name}</h1>
            <StatusBadge status={agent.status} />
            {agent.chain_status === "registered" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[12px] font-semibold text-[#6366F1]">
                <ChainIcon />
                On-Chain Verified
              </span>
            ) : null}
          </div>
          <p className="max-w-[820px] text-[14px] leading-[1.45] text-[#64748B]">{agent.description}</p>
          <div className="flex gap-2">
            {agent.tags.map((tag) => (
              <span key={tag} className="rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[12px] text-[#94A3B8]">
                {tag}
              </span>
            ))}
          </div>
        </div>
        {!isEditMode ? (
          <Link
            href={`/dashboard/agents/${agent.id}?edit=1`}
            className="inline-flex items-center gap-1 rounded-lg border border-[#CBD5E1] bg-white px-4 py-2 text-[13px] font-semibold text-[#64748B]"
          >
            <EditIcon />
            Edit Agent
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Price" value={`${agent.price_usdc.toFixed(1)} USDC`} />
        <StatCard label="Total Orders" value={String(agent.total_orders)} />
        <StatCard label="Avg. Rating" value={`★ ${agent.avg_rating.toFixed(1)} (${agent.rating_count} reviews)`} />
        <StatCard label="Avg. Response" value={`${agent.avg_response_seconds.toFixed(1)}s`} />
      </div>

      {isEditMode ? (
        <AgentForm mode="edit" initialAgent={agent} resubmit={resubmit} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <InfoPanel title="Agent Configuration">
            <InfoRow label="Endpoint URL" value={agent.endpoint_url} />
            <InfoRow label="Skills" value={agent.skills.join(", ") || "-"} />
            <InfoRow label="Domains" value={agent.domains.join(", ") || "-"} />
            <InfoRow label="Created" value={formatDate(agent.created_at)} />
            <InfoRow label="Last Updated" value={formatDate(agent.updated_at)} />
          </InfoPanel>

          <InfoPanel title="On-Chain Identity (ERC-8004)">
            <InfoRow label="Asset Address" value={agent.sol_asset_address ?? "-"} />
            <InfoRow label="IPFS CID" value={agent.ipfs_cid ?? "-"} />
            <InfoRow label="Register TX" value={agent.register_tx ?? "-"} />
            <InfoRow label="Chain Status" value={agent.chain_status} />
            <InfoRow
              label="Registered At"
              value={agent.registered_at ? formatDate(agent.registered_at) : "-"}
            />
          </InfoPanel>
        </div>
      )}
    </section>
  );
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <p className="text-[14px] text-[#94A3B8]">{label}</p>
      <p className="mt-1 text-[20px] font-bold leading-none text-[#0F172A]">{value}</p>
    </article>
  );
}

function InfoPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
      <h2 className="border-b border-[#E2E8F0] px-4 py-3 text-[22px] font-semibold text-[#0F172A]">{title}</h2>
      <div>{children}</div>
    </article>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 border-b border-[#F1F5F9] px-4 py-3 text-[14px] last:border-b-0">
      <span className="text-[#94A3B8]">{label}</span>
      <span className="text-[#334155]">{value}</span>
    </div>
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

function EditIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 20h4l10-10-4-4L4 16v4ZM13 7l4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
