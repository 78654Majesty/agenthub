import { Footer, Navbar } from "@/components/layout";
import {
  MarketplaceShell,
  type MarketplaceShellData,
} from "@/components/marketplace/marketplace-shell";
import { fetchAgents, type FetchAgentsParams, type MarketAgent } from "@/lib/api/market";

type MarketplacePageProps = {
  searchParams?: Promise<{
    sort?: string;
    order?: string;
    page?: string;
    min_price?: string;
    max_price?: string;
  }>;
};

type ShellAgent = MarketplaceShellData["agents"][number];

const ACCENTS: ShellAgent["accent"][] = [
  "indigo",
  "emerald",
  "amber",
  "pink",
  "violet",
  "sky",
  "rose",
  "teal",
  "fuchsia",
];

function formatCalls(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  }
  return String(value);
}

function deriveCategory(agent: MarketAgent): ShellAgent["category"] {
  const haystack = [agent.name, agent.description, ...agent.tags].join(" ").toLowerCase();

  if (haystack.includes("security") || haystack.includes("audit") || haystack.includes("risk")) {
    return "Security";
  }
  if (haystack.includes("defi") || haystack.includes("token")) {
    return "DeFi";
  }
  if (haystack.includes("data") || haystack.includes("pipeline") || haystack.includes("analytics")) {
    return "Data Analysis";
  }
  if (haystack.includes("code") || haystack.includes("anchor") || haystack.includes("contract")) {
    return "Code Audit";
  }
  if (haystack.includes("nlp") || haystack.includes("translation") || haystack.includes("language")) {
    return "NLP";
  }
  return "Infrastructure";
}

function mapApiAgentToShellData(agent: MarketAgent, index: number): ShellAgent {
  return {
    id: agent.id,
    name: agent.name,
    provider: agent.provider_name || agent.provider_wallet || "Unknown Provider",
    description: agent.description,
    priceUsdc: agent.price_usdc,
    tags: agent.tags,
    category: deriveCategory(agent),
    rating: agent.avg_rating,
    ratingCount: agent.rating_count,
    calls: formatCalls(agent.total_calls),
    status: agent.liveness === "partial" ? "partial" : "live",
    accent: ACCENTS[index % ACCENTS.length],
  };
}

function resolveSort(value?: string): NonNullable<MarketplaceShellData["sortBy"]> {
  if (value === "price" || value === "newest" || value === "calls" || value === "rating") {
    return value;
  }
  return "rating";
}

function resolveOrder(
  value: string | undefined,
  sort: NonNullable<MarketplaceShellData["sortBy"]>,
): NonNullable<FetchAgentsParams["order"]> {
  if (value === "asc" || value === "desc") {
    return value;
  }
  return sort === "price" ? "asc" : "desc";
}

function resolvePage(value?: string): number {
  const page = Number(value ?? "1");
  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }
  return Math.floor(page);
}

function resolvePrice(value?: string): number | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) {
    return undefined;
  }
  return price;
}

async function loadMarketplaceData(
  searchParams?: Awaited<MarketplacePageProps["searchParams"]>,
): Promise<MarketplaceShellData> {
  const sort = resolveSort(searchParams?.sort);
  const page = resolvePage(searchParams?.page);
  const order = resolveOrder(searchParams?.order, sort);
  const minPrice = resolvePrice(searchParams?.min_price);
  const maxPrice = resolvePrice(searchParams?.max_price);

  const response = await fetchAgents({
    sort,
    order,
    limit: 9,
    status: "active",
    page,
    min_price: minPrice,
    max_price: maxPrice,
  });

  return {
    total: response.total,
    showing: response.agents.length,
    page: response.page,
    totalPages: response.total_pages ?? Math.max(1, Math.ceil(response.total / response.limit)),
    sortBy: sort,
    minPrice,
    maxPrice,
    agents: response.agents.map(mapApiAgentToShellData),
  };
}

export default async function Page({ searchParams }: MarketplacePageProps) {
  const resolvedSearchParams = await searchParams;
  const data = await loadMarketplaceData(resolvedSearchParams);

  return (
    <>
      <Navbar activeLink="Marketplace" />
      <MarketplaceShell data={data} />
      <Footer />
    </>
  );
}
