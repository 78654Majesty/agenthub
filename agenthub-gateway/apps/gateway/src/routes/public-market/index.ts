import type { FastifyInstance } from "fastify";

import { MARKET_ERRORS } from "../../lib/errors/market";
import { createMatchService } from "../../services/match.service";
import {
  getAgent,
  getAgentFeedbacks,
  getAgentOnChain,
  getMarketStats,
  listAgents,
  listMatchableAgents,
} from "../../services/market";

function parseInteger(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function toSnakeCaseMatchedAgent(scored: {
  agent: {
    agentId: string;
    name: string;
    priceUsdcMicro: number;
  };
  score: number;
  reason: string;
}) {
  return {
    agent_id: scored.agent.agentId,
    name: scored.agent.name,
    score: scored.score,
    price_usdc: Number((scored.agent.priceUsdcMicro / 1_000_000).toFixed(2)),
    reason: scored.reason,
  };
}

export default async function registerPublicMarketRoutes(app: FastifyInstance) {
  const matchService = createMatchService({
    listAgents: listMatchableAgents,
  });

  app.get("/market/stats", async (_, reply) => {
    const stats = await getMarketStats();
    return reply.send(stats);
  });

  app.get("/market/agents", async (request, reply) => {
    const query = request.query as {
      search?: string;
      tags?: string;
      sort?: "rating" | "price" | "newest" | "calls";
      order?: "asc" | "desc";
      min_price?: string | number;
      max_price?: string | number;
      page?: string | number;
      limit?: string | number;
      status?: string;
    };

    const result = await listAgents({
      search: query.search,
      tags: query.tags,
      sort: query.sort,
      order: query.order,
      minPrice: parseInteger(query.min_price),
      maxPrice: parseInteger(query.max_price),
      page: parseInteger(query.page),
      limit: parseInteger(query.limit),
      status: query.status,
    });

    return reply.send(result);
  });

  app.get("/market/agents/:id", async (request, reply) => {
    const params = request.params as { id?: string };
    if (!params.id) {
      return reply.code(400).send({
        error: "BAD_REQUEST",
        message: "id is required",
      });
    }

    try {
      const result = await getAgent(params.id);
      return reply.send(result);
    } catch (error) {
      if (error instanceof Error && error.message === MARKET_ERRORS.AGENT_NOT_FOUND) {
        return reply.code(404).send({
          error: MARKET_ERRORS.AGENT_NOT_FOUND,
          message: "Agent not found",
        });
      }
      request.log.error(error, "get agent detail failed");
      return reply.code(500).send({
        error: "INTERNAL_SERVER_ERROR",
        message: "Get agent detail failed",
      });
    }
  });

  app.get("/market/agents/:id/on-chain", async (request, reply) => {
    const params = request.params as { id?: string };
    if (!params.id) {
      return reply.code(400).send({
        error: "BAD_REQUEST",
        message: "id is required",
      });
    }

    try {
      const result = await getAgentOnChain(params.id);
      return reply.send(result);
    } catch (error) {
      if (error instanceof Error && error.message === MARKET_ERRORS.AGENT_NOT_FOUND) {
        return reply.code(404).send({
          error: MARKET_ERRORS.AGENT_NOT_FOUND,
          message: "Agent not found",
        });
      }
      request.log.error(error, "get agent on-chain failed");
      return reply.code(500).send({
        error: "INTERNAL_SERVER_ERROR",
        message: "Get agent on-chain failed",
      });
    }
  });

  app.get("/market/agents/:id/feedbacks", async (request, reply) => {
    const params = request.params as { id?: string };
    const query = request.query as { page?: string | number; limit?: string | number };
    if (!params.id) {
      return reply.code(400).send({
        error: "BAD_REQUEST",
        message: "id is required",
      });
    }

    try {
      const result = await getAgentFeedbacks(params.id, {
        page: parseInteger(query.page),
        limit: parseInteger(query.limit),
      });
      return reply.send(result);
    } catch (error) {
      if (error instanceof Error && error.message === MARKET_ERRORS.AGENT_NOT_FOUND) {
        return reply.code(404).send({
          error: MARKET_ERRORS.AGENT_NOT_FOUND,
          message: "Agent not found",
        });
      }
      request.log.error(error, "get agent feedbacks failed");
      return reply.code(500).send({
        error: "INTERNAL_SERVER_ERROR",
        message: "Get agent feedbacks failed",
      });
    }
  });

  app.post("/match", async (request, reply) => {
    const body = (request.body ?? {}) as {
      task?: string;
      max_price_usdc?: number;
      tags?: string[];
    };

    if (!body.task || body.task.trim().length === 0) {
      return reply.code(400).send({
        error: "BAD_REQUEST",
        message: "task is required",
      });
    }

    try {
      const result = await matchService.matchAgent({
        task: body.task,
        maxPriceUsdc: body.max_price_usdc,
        tags: body.tags,
      });

      return reply.send({
        top: toSnakeCaseMatchedAgent(result.top),
        alternatives: result.alternatives.map(toSnakeCaseMatchedAgent),
        reason: result.reason,
      });
    } catch (error) {
      if (error instanceof Error && /No matching agent/i.test(error.message)) {
        return reply.code(404).send({
          error: MARKET_ERRORS.MATCH_FAILED,
          message: error.message,
        });
      }
      request.log.error(error, "match agent failed");
      return reply.code(500).send({
        error: MARKET_ERRORS.MATCH_FAILED,
        message: "Match failed",
      });
    }
  });
}
