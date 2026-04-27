import { PrismaClient } from "@prisma/client";

export interface MatchableAgent {
  agentId: string;
  name: string;
  description: string;
  endpointUrl: string;
  priceUsdcMicro: number;
  ratingAvg: number;
  capabilityTags: string[];
}

export interface MatchAgentInput {
  task: string;
  maxPriceUsdc?: number;
  tags?: string[];
}

export interface MatchAgentResult {
  top: MatchableAgent;
  alternatives: MatchableAgent[];
  reason: string;
}

export interface MatchService {
  matchAgent(input: MatchAgentInput): Promise<MatchAgentResult>;
}

interface PrismaAgentRecord {
  id: string;
  name: string;
  description: string;
  endpointUrl: string;
  priceUsdcMicro: number;
  ratingAvg: number;
  capabilityTags: string;
}

interface PrismaAgentClient {
  agent: {
    findMany(args: {
      where: { status: string };
      orderBy: Array<{ ratingAvg: "desc" } | { totalOrders: "desc" }>;
    }): Promise<PrismaAgentRecord[]>;
  };
}

let prismaSingleton: PrismaClient | undefined;

function getPrismaClient(): PrismaClient {
  if (!prismaSingleton) {
    prismaSingleton = new PrismaClient();
  }

  return prismaSingleton;
}

function parseStringArrayJson(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function createPrismaAgentLister(prisma: PrismaAgentClient = getPrismaClient()) {
  return async (): Promise<MatchableAgent[]> => {
    const agents = await prisma.agent.findMany({
      where: { status: "active" },
      orderBy: [{ ratingAvg: "desc" }, { totalOrders: "desc" }],
    });

    return agents.map((agent) => ({
      agentId: agent.id,
      name: agent.name,
      description: agent.description,
      endpointUrl: agent.endpointUrl,
      priceUsdcMicro: agent.priceUsdcMicro,
      ratingAvg: agent.ratingAvg,
      capabilityTags: parseStringArrayJson(agent.capabilityTags),
    }));
  };
}

function scoreAgent(agent: MatchableAgent, input: MatchAgentInput): number {
  const task = input.task.toLowerCase();
  const tags = (input.tags ?? []).map((tag) => tag.toLowerCase());
  const capabilityTags = agent.capabilityTags.map((tag) => tag.toLowerCase());

  let score = agent.ratingAvg;

  for (const tag of tags) {
    if (capabilityTags.includes(tag)) {
      score += 10;
    }
  }

  for (const tag of capabilityTags) {
    if (task.includes(tag)) {
      score += 5;
    }
  }

  return score;
}

export function createMatchService(deps: {
  listAgents: () => Promise<MatchableAgent[]>;
}): MatchService {
  return {
    async matchAgent(input) {
      const normalizedTags = (input.tags ?? []).map((tag) => tag.toLowerCase());
      const maxPriceUsdcMicro =
        typeof input.maxPriceUsdc === "number" ? Math.round(input.maxPriceUsdc * 1_000_000) : null;

      const agents = await deps.listAgents();
      const filtered = agents.filter((agent) => {
        if (maxPriceUsdcMicro !== null && agent.priceUsdcMicro > maxPriceUsdcMicro) {
          return false;
        }

        if (
          normalizedTags.length > 0 &&
          !normalizedTags.every((tag) => agent.capabilityTags.map((value) => value.toLowerCase()).includes(tag))
        ) {
          return false;
        }

        return true;
      });

      if (filtered.length === 0) {
        throw new Error("No matching agent found");
      }

      const ranked = filtered
        .map((agent) => ({
          agent,
          score: scoreAgent(agent, input),
        }))
        .sort((left, right) => right.score - left.score);

      return {
        top: ranked[0].agent,
        alternatives: ranked.slice(1).map((entry) => entry.agent),
        reason: "Fallback ranking selected the best matching agent.",
      };
    },
  };
}
