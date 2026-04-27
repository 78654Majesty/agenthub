import type { FastifyInstance } from "fastify";

import { PROVIDER_ERRORS } from "../../lib/errors/provider";
import { verifyWalletJwt } from "../../middleware/verify-wallet-jwt";
import {
  createAgent,
  getMyAgent,
  getProviderDashboard,
  getRatingDistribution,
  listMyAgents,
  listMyRatings,
  listProviderOrders,
  updateAgent,
} from "../../services/provider";

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

function toStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return undefined;
}

function handleProviderError(reply: { code: (statusCode: number) => { send: (payload: unknown) => unknown } }, error: unknown) {
  if (!(error instanceof Error)) {
    return reply.code(500).send({
      error: "INTERNAL_SERVER_ERROR",
      message: "Provider request failed",
    });
  }

  if (error.message === PROVIDER_ERRORS.AGENT_NOT_FOUND) {
    return reply.code(404).send({
      error: PROVIDER_ERRORS.AGENT_NOT_FOUND,
      message: "Agent not found",
    });
  }

  if (error.message === PROVIDER_ERRORS.FORBIDDEN_AGENT_ACCESS) {
    return reply.code(403).send({
      error: PROVIDER_ERRORS.FORBIDDEN_AGENT_ACCESS,
      message: "You do not have access to this agent",
    });
  }

  if (error.message === PROVIDER_ERRORS.INVALID_AGENT_STATUS) {
    return reply.code(400).send({
      error: PROVIDER_ERRORS.INVALID_AGENT_STATUS,
      message: "Agent status does not allow this operation",
    });
  }

  return reply.code(500).send({
    error: "INTERNAL_SERVER_ERROR",
    message: error.message,
  });
}

export default async function registerProviderRoutes(app: FastifyInstance) {
  app.post(
    "/agents",
    {
      preHandler: verifyWalletJwt,
    },
    async (request, reply) => {
      const walletPubkey = request.walletAuth?.walletPubkey ?? "";
      const body = (request.body ?? {}) as {
        name?: string;
        description?: string;
        capability_tags?: unknown;
        endpoint_url?: string;
        price_usdc_micro?: unknown;
        skills?: unknown;
        domains?: unknown;
        input_schema?: string | null;
        output_format?: string | null;
      };

      const capabilityTags = toStringArray(body.capability_tags);
      const skills = toStringArray(body.skills);
      const domains = toStringArray(body.domains);
      const priceUsdcMicro = parseInteger(body.price_usdc_micro);

      if (
        !body.name ||
        !body.description ||
        !body.endpoint_url ||
        typeof priceUsdcMicro !== "number" ||
        !capabilityTags ||
        !skills ||
        !domains
      ) {
        return reply.code(400).send({
          error: "BAD_REQUEST",
          message:
            "name, description, capability_tags, endpoint_url, price_usdc_micro, skills, and domains are required",
        });
      }

      try {
        const result = await createAgent(walletPubkey, {
          name: body.name,
          description: body.description,
          capabilityTags,
          endpointUrl: body.endpoint_url,
          priceUsdcMicro,
          skills,
          domains,
          inputSchema: body.input_schema ?? null,
          outputFormat: body.output_format ?? null,
        });

        return reply.code(201).send(result);
      } catch (error) {
        request.log.error(error, "create agent failed");
        return handleProviderError(reply, error);
      }
    },
  );

  app.get(
    "/agents",
    {
      preHandler: verifyWalletJwt,
    },
    async (request, reply) => {
      const walletPubkey = request.walletAuth?.walletPubkey ?? "";
      const query = request.query as {
        search?: string;
        status?: string;
        page?: string | number;
        limit?: string | number;
      };

      try {
        const result = await listMyAgents(walletPubkey, {
          search: query.search,
          status: query.status,
          page: parseInteger(query.page),
          limit: parseInteger(query.limit),
        });

        return reply.send(result);
      } catch (error) {
        request.log.error(error, "list my agents failed");
        return handleProviderError(reply, error);
      }
    },
  );

  app.get(
    "/agents/:id",
    {
      preHandler: verifyWalletJwt,
    },
    async (request, reply) => {
      const walletPubkey = request.walletAuth?.walletPubkey ?? "";
      const params = request.params as { id?: string };

      if (!params.id) {
        return reply.code(400).send({
          error: "BAD_REQUEST",
          message: "id is required",
        });
      }

      try {
        const result = await getMyAgent(walletPubkey, params.id);
        return reply.send(result);
      } catch (error) {
        request.log.error(error, "get my agent failed");
        return handleProviderError(reply, error);
      }
    },
  );

  app.patch(
    "/agents/:id",
    {
      preHandler: verifyWalletJwt,
    },
    async (request, reply) => {
      const walletPubkey = request.walletAuth?.walletPubkey ?? "";
      const params = request.params as { id?: string };
      const body = (request.body ?? {}) as {
        name?: string;
        description?: string;
        capability_tags?: unknown;
        endpoint_url?: string;
        price_usdc_micro?: unknown;
        skills?: unknown;
        domains?: unknown;
        input_schema?: string | null;
        output_format?: string | null;
        resubmit?: boolean;
      };

      if (!params.id) {
        return reply.code(400).send({
          error: "BAD_REQUEST",
          message: "id is required",
        });
      }

      try {
        const result = await updateAgent(walletPubkey, params.id, {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.capability_tags !== undefined
            ? { capabilityTags: toStringArray(body.capability_tags) ?? [] }
            : {}),
          ...(body.endpoint_url !== undefined ? { endpointUrl: body.endpoint_url } : {}),
          ...(body.price_usdc_micro !== undefined
            ? { priceUsdcMicro: parseInteger(body.price_usdc_micro) }
            : {}),
          ...(body.skills !== undefined ? { skills: toStringArray(body.skills) ?? [] } : {}),
          ...(body.domains !== undefined ? { domains: toStringArray(body.domains) ?? [] } : {}),
          ...(body.input_schema !== undefined ? { inputSchema: body.input_schema } : {}),
          ...(body.output_format !== undefined ? { outputFormat: body.output_format } : {}),
          ...(body.resubmit !== undefined ? { resubmit: body.resubmit } : {}),
        });

        return reply.send(result);
      } catch (error) {
        request.log.error(error, "update my agent failed");
        return handleProviderError(reply, error);
      }
    },
  );

  app.get(
    "/ratings",
    {
      preHandler: verifyWalletJwt,
    },
    async (request, reply) => {
      const walletPubkey = request.walletAuth?.walletPubkey ?? "";
      const query = request.query as {
        agent_id?: string;
        page?: string | number;
        limit?: string | number;
      };

      try {
        const result = await listMyRatings(walletPubkey, {
          agentId: query.agent_id,
          page: parseInteger(query.page),
          limit: parseInteger(query.limit),
        });

        return reply.send(result);
      } catch (error) {
        request.log.error(error, "list my ratings failed");
        return handleProviderError(reply, error);
      }
    },
  );

  app.get(
    "/ratings/distribution",
    {
      preHandler: verifyWalletJwt,
    },
    async (request, reply) => {
      const walletPubkey = request.walletAuth?.walletPubkey ?? "";

      try {
        const result = await getRatingDistribution(walletPubkey);
        return reply.send(result);
      } catch (error) {
        request.log.error(error, "get rating distribution failed");
        return handleProviderError(reply, error);
      }
    },
  );

  app.get(
    "/orders",
    {
      preHandler: verifyWalletJwt,
    },
    async (request, reply) => {
      const walletPubkey = request.walletAuth?.walletPubkey ?? "";
      const query = request.query as {
        status?: string;
        agent_id?: string;
        page?: string | number;
        limit?: string | number;
      };

      try {
        const result = await listProviderOrders(walletPubkey, {
          status: query.status,
          agentId: query.agent_id,
          page: parseInteger(query.page),
          limit: parseInteger(query.limit),
        });

        return reply.send(result);
      } catch (error) {
        request.log.error(error, "list provider orders failed");
        return handleProviderError(reply, error);
      }
    },
  );

  app.get(
    "/dashboard",
    {
      preHandler: verifyWalletJwt,
    },
    async (request, reply) => {
      const walletPubkey = request.walletAuth?.walletPubkey ?? "";

      try {
        const result = await getProviderDashboard(walletPubkey);
        return reply.send(result);
      } catch (error) {
        request.log.error(error, "get provider dashboard failed");
        return handleProviderError(reply, error);
      }
    },
  );
}
