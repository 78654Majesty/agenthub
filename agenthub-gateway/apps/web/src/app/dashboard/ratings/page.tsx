import { cookies } from "next/headers";

import {
  fetchMyAgents,
  fetchMyRatings,
  fetchRatingDistribution,
} from "@/lib/api/provider";

type PageProps = {
  searchParams?: Promise<{
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

export default async function DashboardRatingsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const page = parsePage(resolvedSearchParams.page);
  const agentId = resolvedSearchParams.agent_id;
  const cookieStore = await cookies();
  const token = cookieStore.get("agenthub_token")?.value;

  const [distribution, ratingsResult, agentsResult] = token
    ? await Promise.all([
        fetchRatingDistribution({ token, revalidate: 0 }),
        fetchMyRatings({ agent_id: agentId, page, limit: 20 }, { token, revalidate: 0 }),
        fetchMyAgents({ limit: 100 }, { token, revalidate: 0 }),
      ])
    : [
        { distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, total: 0, average: 0 },
        { ratings: [], total: 0, page: 1, limit: 20 },
        {
          agents: [],
          total: 0,
          page: 1,
          limit: 100,
          total_pages: 1,
          status_counts: { all: 0, active: 0, pending_review: 0, rejected: 0, suspended: 0 },
        },
      ];

  const maxCount = Math.max(...Object.values(distribution.distribution), 1);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-[28px] font-bold leading-tight text-[#0F172A]">Ratings & Reviews</h1>
        <p className="mt-1 text-[14px] text-[#64748B]">Feedback received from consumers across all your agents</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <article className="rounded-xl border border-[#E2E8F0] bg-white p-5 text-center">
          <p className="text-[14px] text-[#94A3B8]">Overall Rating</p>
          <p className="mt-2 text-[28px] font-bold leading-none text-[#0F172A]">
            {distribution.average.toFixed(2)}
          </p>
          <p className="mt-1 text-[14px] text-[#94A3B8]">/ 5</p>
          <div className="mt-2 flex justify-center">
            <StarRow score={Math.round(distribution.average)} size={19} />
          </div>
          <p className="mt-2 text-[14px] text-[#64748B]">{distribution.total} total reviews</p>
          <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] px-3 py-1 text-[12px] font-semibold text-[#6366F1]">
            On-chain verified via ERC-8004
          </div>
        </article>

        <article className="rounded-xl border border-[#E2E8F0] bg-white p-5">
          <h2 className="text-[22px] font-semibold text-[#0F172A]">Score Distribution</h2>
          <div className="mt-4 space-y-3">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distribution.distribution[star as keyof typeof distribution.distribution];
              const width = `${Math.max((count / maxCount) * 100, count > 0 ? 6 : 0)}%`;

              return (
                <div key={star} className="grid grid-cols-[36px_minmax(0,1fr)_28px] items-center gap-3">
                  <span className="text-[14px] text-[#64748B]">{star} ★</span>
                  <div className="h-5 rounded-full bg-[#F1F5F9]">
                    <div className="h-5 rounded-full bg-[#F59E0B]" style={{ width }} />
                  </div>
                  <span className="text-right text-[14px] text-[#94A3B8]">{count}</span>
                </div>
              );
            })}
          </div>
        </article>
      </div>

      <article className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-3">
          <h2 className="text-[22px] font-semibold text-[#0F172A]">Recent Reviews</h2>
          <form method="get" className="flex items-center gap-2">
            <select
              name="agent_id"
              defaultValue={agentId ?? ""}
              className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1 text-[13px] text-[#64748B]"
            >
              <option value="">All Agents</option>
              {agentsResult.agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1 text-[13px] font-semibold text-[#64748B]"
            >
              Apply
            </button>
          </form>
        </div>
        <div className="divide-y divide-[#F1F5F9]">
          {ratingsResult.ratings.length > 0 ? (
            ratingsResult.ratings.map((review) => (
              <div key={review.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[14px] font-semibold text-[#0F172A]">{review.consumer_wallet}</p>
                    <p className="text-[12px] text-[#94A3B8]">{review.agent_name}</p>
                  </div>
                  <StarRow score={review.score} />
                </div>
                <p className="mt-2 text-[14px] text-[#64748B]">{review.comment || "No comment provided."}</p>
                <p className="mt-2 text-[13px] text-[#6366F1]">
                  Feedback verified on-chain - tx: {review.feedback_tx ?? "-"}
                </p>
              </div>
            ))
          ) : (
            <div className="px-5 py-6 text-[14px] text-[#64748B]">No ratings found.</div>
          )}
        </div>
      </article>
    </section>
  );
}

function StarRow({ score, size = 16 }: { score: number; size?: number }) {
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${score} out of 5`}>
      {[0, 1, 2, 3, 4].map((idx) => (
        <svg
          key={idx}
          width={size}
          height={size}
          viewBox="0 0 20 20"
          fill={idx < score ? "#F59E0B" : "none"}
          stroke={idx < score ? "#F59E0B" : "#CBD5E1"}
          strokeWidth="1.5"
          aria-hidden
        >
          <path d="M10 2.3 12.3 7l5.1.7-3.7 3.6.9 5.1L10 14l-4.6 2.4.9-5.1L2.6 7.7 7.7 7 10 2.3Z" />
        </svg>
      ))}
    </div>
  );
}
