import test from "node:test";
import assert from "node:assert/strict";

import { createMatchService, createPrismaAgentLister } from "./match.service";

test("match service returns the highest scoring agent as top and keeps the rest as alternatives", async () => {
  const service = createMatchService({
    listAgents: async () => [
      {
        agentId: "agent-1",
        name: "Calendar Agent",
        description: "Schedules and manages meetings",
        endpointUrl: "https://agent-1.example.com",
        priceUsdcMicro: 2_000_000,
        ratingAvg: 4.2,
        capabilityTags: ["calendar", "schedule"],
      },
      {
        agentId: "agent-2",
        name: "Email Agent",
        description: "Drafts and sends email replies",
        endpointUrl: "https://agent-2.example.com",
        priceUsdcMicro: 1_500_000,
        ratingAvg: 4.8,
        capabilityTags: ["email", "reply"],
      },
      {
        agentId: "agent-3",
        name: "Travel Agent",
        description: "Searches flights and hotels",
        endpointUrl: "https://agent-3.example.com",
        priceUsdcMicro: 3_500_000,
        ratingAvg: 4.5,
        capabilityTags: ["travel", "booking"],
      },
    ],
  });

  const result = await service.matchAgent({
    task: "help me reply to a customer email",
    maxPriceUsdc: 3,
    tags: ["email"],
  });

  assert.equal(result.top.agentId, "agent-2");
  assert.equal(result.alternatives.length, 0);
  assert.match(result.reason, /fallback/i);
});

test("match service throws when no agents satisfy the filters", async () => {
  const service = createMatchService({
    listAgents: async () => [
      {
        agentId: "agent-1",
        name: "Travel Agent",
        description: "Searches flights and hotels",
        endpointUrl: "https://agent-1.example.com",
        priceUsdcMicro: 5_000_000,
        ratingAvg: 4.5,
        capabilityTags: ["travel"],
      },
    ],
  });

  await assert.rejects(
    () =>
      service.matchAgent({
        task: "reply to an email",
        maxPriceUsdc: 2,
        tags: ["email"],
      }),
    /No matching agent/i,
  );
});

test("prisma agent lister maps active database agents to matchable agents", async () => {
  const listAgents = createPrismaAgentLister({
    agent: {
      findMany: async (query: unknown) => {
        assert.deepEqual(query, {
          where: { status: "active" },
          orderBy: [{ ratingAvg: "desc" }, { totalOrders: "desc" }],
        });

        return [
          {
            id: "seed-agent-weather",
            name: "AgentHub Weather",
            description: "Current weather lookup",
            endpointUrl: "http://127.0.0.1:9000/v1/execute",
            priceUsdcMicro: 10_000,
            ratingAvg: 4.9,
            capabilityTags: JSON.stringify(["weather", "forecast"]),
          },
        ];
      },
    },
  });

  assert.deepEqual(await listAgents(), [
    {
      agentId: "seed-agent-weather",
      name: "AgentHub Weather",
      description: "Current weather lookup",
      endpointUrl: "http://127.0.0.1:9000/v1/execute",
      priceUsdcMicro: 10_000,
      ratingAvg: 4.9,
      capabilityTags: ["weather", "forecast"],
    },
  ]);
});
