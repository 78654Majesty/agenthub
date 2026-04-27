import type { FastifyInstance } from "fastify";

import { verifyWalletJwt } from "../../middleware/verify-wallet-jwt";
import { getUserDashboard, listUserOrders } from "../../services/user";

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

function escapeCsv(value: string | number | boolean | null | undefined) {
  const stringValue = value == null ? "" : String(value);
  if (stringValue.includes(",") || stringValue.includes("\"") || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, "\"\"")}"`;
  }
  return stringValue;
}

export default async function registerUserRoutes(app: FastifyInstance) {
  app.get(
    "/dashboard",
    {
      preHandler: verifyWalletJwt,
    },
    async (request, reply) => {
      const walletPubkey = request.walletAuth?.walletPubkey ?? "";
      const result = await getUserDashboard(walletPubkey);
      return reply.send(result);
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
        search?: string;
        type?: "initiated" | "received";
        status?: string;
        agent_id?: string;
        sort?: "created_at" | "amount";
        order?: "asc" | "desc";
        page?: string | number;
        limit?: string | number;
        format?: string;
      };

      const result = await listUserOrders(walletPubkey, {
        search: query.search,
        type: query.type,
        status: query.status,
        agentId: query.agent_id,
        sort: query.sort,
        order: query.order,
        page: parseInteger(query.page),
        limit: parseInteger(query.limit),
      });

      if (query.format === "csv") {
        const rows = [
          [
            "order_id",
            "type",
            "agent_name",
            "counterparty_wallet",
            "amount_usdc_micro",
            "status",
            "payment_verified",
            "payment_tx",
            "created_at",
          ].join(","),
          ...result.orders.map((order) =>
            [
              escapeCsv(order.id),
              escapeCsv(order.type),
              escapeCsv(order.agent_name),
              escapeCsv(order.counterparty_wallet),
              escapeCsv(order.amount_usdc_micro),
              escapeCsv(order.status),
              escapeCsv(order.payment_verified),
              escapeCsv(order.payment_tx),
              escapeCsv(order.created_at),
            ].join(","),
          ),
        ];

        reply.header("Content-Type", "text/csv; charset=utf-8");
        reply.header("Content-Disposition", 'attachment; filename="agenthub-orders.csv"');
        return reply.send(rows.join("\n"));
      }

      return reply.send(result);
    },
  );
}
