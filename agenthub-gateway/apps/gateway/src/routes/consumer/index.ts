import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { Connection } from "@solana/web3.js";

import {
  createConsumerService,
  createDevnetFaucetService,
  createPrismaReceiptStore,
  type ConsumerService,
  type FaucetResult,
  type FaucetService,
} from "../../services/consumer";
import { verifyWalletJwt as verifyWalletJwtMiddleware } from "../../middleware/verify-wallet-jwt";
import {
  createMatchService,
  createPrismaAgentLister,
  type MatchAgentInput,
  type MatchService,
} from "../../services/match.service";

function toSnakeCaseAgent(agent: {
  agentId: string;
  name: string;
  description: string;
  endpointUrl: string;
  priceUsdcMicro: number;
  ratingAvg: number;
  capabilityTags: string[];
}) {
  return {
    agent_id: agent.agentId,
    name: agent.name,
    description: agent.description,
    endpoint_url: agent.endpointUrl,
    price_usdc_micro: agent.priceUsdcMicro,
    rating_avg: agent.ratingAvg,
    capability_tags: agent.capabilityTags,
  };
}

function getSolanaDevnetRpcUrl(): string {
  return (
    process.env.AGENTHUB_SOLANA_RPC_URL?.trim() ||
    process.env.SOLANA_RPC_URL?.trim() ||
    "https://devnet.helius-rpc.com/?api-key=ea3297f1-582d-4b7d-b287-ecd5c8b05ecb"
  );
}

function createSolanaTransactionVerifier(connection = new Connection(getSolanaDevnetRpcUrl(), "confirmed")) {
  return async (
    txSignature: string,
    expected: {
      payer: string;
      amount: number;
      network: string;
    },
  ) => {
    if (expected.network !== "solana:devnet") {
      return false;
    }

    const transaction = await connection.getTransaction(txSignature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    return transaction !== null && transaction.meta?.err === null;
  };
}

function toSnakeCaseFaucetResult(result: FaucetResult) {
  return {
    wallet_pubkey: result.walletPubkey,
    network: result.network,
    sol: {
      requested: result.sol.requested,
      amount: result.sol.amount,
      signature: result.sol.signature,
      balance_lamports: result.sol.balanceLamports,
    },
    usdc: result.usdc,
    warnings: result.warnings,
  };
}

export async function registerConsumerRoutes(
  app: FastifyInstance,
  deps: {
    verifyWalletJwt?: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
    matchService?: MatchService;
    consumerService?: ConsumerService;
    faucetService?: FaucetService;
  } = {},
) {
  const verifyWalletJwt = deps.verifyWalletJwt ?? verifyWalletJwtMiddleware;
  const matchService = deps.matchService ?? createMatchService({ listAgents: createPrismaAgentLister() });
  const consumerService =
    deps.consumerService ??
    createConsumerService({
      verifyTransaction: createSolanaTransactionVerifier(),
      receiptStore: createPrismaReceiptStore(),
    });
  const faucetService = deps.faucetService ?? createDevnetFaucetService();

  app.post(
    "/receipts",
    {
      preHandler: verifyWalletJwt,
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as {
        agentId?: string;
        taskText?: string;
        txSignature?: string;
        payer?: string;
        amount?: number;
        network?: string;
        resultHash?: string;
      };

      if (
        !body.agentId ||
        !body.taskText ||
        !body.txSignature ||
        !body.payer ||
        typeof body.amount !== "number" ||
        !body.network ||
        !body.resultHash
      ) {
        return reply.code(400).send({ error: "agentId, taskText, txSignature, payer, amount, network, resultHash are required" });
      }

      try {
        const result = await consumerService.createReceipt(request.walletAuth?.walletPubkey ?? "", {
          agentId: body.agentId,
          taskText: body.taskText,
          txSignature: body.txSignature,
          payer: body.payer,
          amount: body.amount,
          network: body.network,
          resultHash: body.resultHash,
        });

        return reply.send({
          receipt_id: result.receiptId,
          order_id: result.orderId,
          payment_verified: result.paymentVerified,
          explorer_link: result.explorerLink,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Receipt reporting failed";
        return reply.code(400).send({ error: message });
      }
    },
  );

  app.post(
    "/match",
    {
      preHandler: verifyWalletJwt,
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as {
        task?: string;
        maxPriceUsdc?: number;
        tags?: string[];
      };

      if (!body.task) {
        return reply.code(400).send({ error: "task is required" });
      }

      try {
        const result = await matchService.matchAgent({
          task: body.task,
          maxPriceUsdc: body.maxPriceUsdc,
          tags: body.tags,
        } satisfies MatchAgentInput);

        return reply.send({
          top: toSnakeCaseAgent(result.top),
          alternatives: result.alternatives.map(toSnakeCaseAgent),
          reason: result.reason,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Match failed";
        const statusCode = /No matching agent/i.test(message) ? 404 : 500;
        return reply.code(statusCode).send({ error: message });
      }
    },
  );

  app.post(
    "/faucet",
    {
      preHandler: verifyWalletJwt,
    },
    async (request, reply) => {
      try {
        const result = await faucetService.requestFunds(request.walletAuth?.walletPubkey ?? "");
        return reply.send(toSnakeCaseFaucetResult(result));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Faucet request failed";
        return reply.code(400).send({ error: message });
      }
    },
  );
}

export default registerConsumerRoutes;
