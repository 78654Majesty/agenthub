import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createHash } from "node:crypto";
import * as z from "zod/v4-mini";

import { getAgentHubGatewayUrl } from "./config";
import {
  GatewayClient,
  type FaucetResult,
  type MatchAgentDto,
  type MatchAgentInput,
  type SubmitReceiptDto,
  type VerifyChallengeDto,
} from "./gateway-client";
import { FileSystemWalletBridge, type WalletBridge } from "./wallet-bridge/sdk";
import { MockX402Client, WalletBackedX402Client, type X402Client } from "./x402-client";
import type { ClientSvmSigner } from "@x402/svm";

export type { WalletBridge } from "./wallet-bridge/sdk";

export interface GatewayAuthClient {
  getChallenge(pubkey: string): Promise<{ challenge: string; nonce: string; expiresIn: number }>;
  verifyChallenge(payload: { wallet: string; signature: string }): Promise<VerifyChallengeDto>;
  requestFaucet?(token: string): Promise<FaucetResult>;
  matchAgent?(payload: MatchAgentInput, token: string): Promise<MatchAgentDto>;
  submitReceipt?(
    payload: {
      agentId: string;
      taskText: string;
      txSignature: string;
      payer: string;
      amount: number;
      network: string;
      resultHash: string;
    },
    token: string,
  ): Promise<SubmitReceiptDto>;
}

export interface SessionStore {
  setToken(token: string): void;
  getToken(): string | null;
}

export class InMemorySessionStore implements SessionStore {
  private token: string | null = null;

  setToken(token: string): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }
}

export function createWalletConnectHandler(deps: {
  walletBridge: WalletBridge;
  gatewayClient: GatewayAuthClient;
  sessionStore: SessionStore;
}) {
  return async () => {
    const { wallet, isNew } = await deps.walletBridge.connectWallet();
    const challenge = await deps.gatewayClient.getChallenge(wallet.publicKey);
    const signature = await deps.walletBridge.signMessage(challenge.challenge);
    const verified = await deps.gatewayClient.verifyChallenge({
      wallet: wallet.publicKey,
      signature,
    });

    deps.sessionStore.setToken(verified.token);

    return {
      walletPubkey: verified.walletPubkey,
      tokenCached: true,
      network: "solana:devnet",
      isNew,
    };
  };
}

export function createWalletStatusHandler(deps: {
  walletBridge: Pick<WalletBridge, "getStatus">;
  sessionStore: SessionStore;
}) {
  return async () => {
    const status = await deps.walletBridge.getStatus();
    return {
      connected: status.connected,
      walletPubkey: status.walletPubkey,
      network: status.network,
      tokenCached: deps.sessionStore.getToken() !== null,
    };
  };
}

export function createWalletFaucetHandler(deps: {
  sessionStore: SessionStore;
  gatewayClient: Pick<GatewayAuthClient, "requestFaucet">;
}) {
  return async (): Promise<FaucetResult> => {
    const token = deps.sessionStore.getToken();
    if (!token) {
      throw new Error("wallet_connect must be completed before wallet_faucet");
    }

    if (!deps.gatewayClient.requestFaucet) {
      throw new Error("requestFaucet is not configured");
    }

    return deps.gatewayClient.requestFaucet(token);
  };
}

export function createMatchCapabilityHandler(deps: {
  sessionStore: SessionStore;
  gatewayClient: Pick<GatewayAuthClient, "matchAgent">;
}) {
  return async (input: MatchAgentInput) => {
    const token = deps.sessionStore.getToken();
    if (!token) {
      throw new Error("wallet_connect must be completed before match_capability");
    }

    if (!deps.gatewayClient.matchAgent) {
      throw new Error("matchAgent is not configured");
    }

    return deps.gatewayClient.matchAgent(input, token);
  };
}

export function createRunAgentTaskHandler(deps: {
  sessionStore: SessionStore;
  x402Client: X402Client;
  gatewayClient: Pick<GatewayAuthClient, "submitReceipt">;
}) {
  return async (input: {
    agentId: string;
    endpointUrl: string;
    task: string;
  }) => {
    const token = deps.sessionStore.getToken();
    if (!token) {
      throw new Error("wallet_connect must be completed before run_agent_task");
    }

    if (!deps.gatewayClient.submitReceipt) {
      throw new Error("submitReceipt is not configured");
    }

    const execution = await deps.x402Client.executeWithPayment(
      input.endpointUrl,
      buildAgentTaskPayload({
        agentId: input.agentId,
        endpointUrl: input.endpointUrl,
        task: input.task,
      }),
    );

    const resultHash = createHash("sha256").update(stableResultString(execution.result), "utf8").digest("hex");
    let receipt:
      | {
          receiptId: string;
          orderId: string;
          paymentVerified: boolean;
          explorerLink?: string;
        }
      | undefined;
    let receiptError: string | undefined;

    try {
      receipt = await deps.gatewayClient.submitReceipt(
        {
          agentId: input.agentId,
          taskText: input.task,
          txSignature: execution.txSignature,
          payer: execution.payer,
          amount: execution.amount,
          network: execution.network,
          resultHash,
        },
        token,
      );
    } catch (error) {
      receiptError = error instanceof Error ? error.message : "Receipt reporting failed";
    }

    return {
      result: execution.result,
      receiptId: receipt?.receiptId,
      txSignature: execution.txSignature,
      explorerLink: receipt?.explorerLink,
      ...(receiptError ? { receiptError } : {}),
    };
  };
}

function buildAgentTaskPayload(input: { agentId: string; endpointUrl: string; task: string }): Record<string, unknown> {
  const identity = `${input.agentId} ${input.endpointUrl}`.toLowerCase();
  if (identity.includes("weather")) {
    return {
      city: extractWeatherCity(input.task),
    };
  }

  return {
    task: input.task,
  };
}

function extractWeatherCity(task: string): string {
  const trimmed = task.trim();
  const match = trimmed.match(/(?:weather|forecast)\s+(?:in|for)\s+(.+)/i) ?? trimmed.match(/(?:in|for)\s+(.+)/i);
  const city = (match?.[1] ?? trimmed).replace(/[?.!。！？]+$/u, "").trim();
  return city || trimmed;
}

function stableResultString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  return stableJsonStringify(value);
}

function stableJsonStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJsonStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJsonStringify(record[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
}

export function createDefaultX402Client(deps: {
  walletBridge: Pick<WalletBridge, "getSvmSigner">;
  mode?: string;
  createRealClient?: (signer: ClientSvmSigner) => X402Client;
}): X402Client {
  const mode = deps.mode ?? process.env.AGENTHUB_X402_MODE ?? "real";
  if (mode === "real") {
    return new WalletBackedX402Client({
      walletBridge: deps.walletBridge,
      createClient: deps.createRealClient,
    });
  }

  return new MockX402Client();
}

export function registerTools(
  server: McpServer,
  deps: {
    walletBridge?: WalletBridge;
    gatewayClient?: GatewayAuthClient;
    sessionStore?: SessionStore;
    x402Client?: X402Client;
  } = {},
) {
  const sessionStore = deps.sessionStore ?? new InMemorySessionStore();
  const gatewayUrl = getAgentHubGatewayUrl();
  const walletBridge = deps.walletBridge ?? new FileSystemWalletBridge();
  const gatewayClient = deps.gatewayClient ?? new GatewayClient(gatewayUrl);
  const x402Client = deps.x402Client ?? createDefaultX402Client({ walletBridge });
  const walletConnect = createWalletConnectHandler({
    walletBridge,
    gatewayClient,
    sessionStore,
  });
  const walletStatus = createWalletStatusHandler({
    walletBridge,
    sessionStore,
  });
  const walletFaucet = createWalletFaucetHandler({
    sessionStore,
    gatewayClient,
  });
  const matchCapability = createMatchCapabilityHandler({
    sessionStore,
    gatewayClient,
  });
  const runAgentTask = createRunAgentTaskHandler({
    sessionStore,
    x402Client,
    gatewayClient,
  });

  server.registerTool(
    "wallet_connect",
    {
      description: "Create or load a local wallet, authenticate with AgentHub Gateway, and cache the JWT.",
    },
    async () => {
      const result = await walletConnect();
      return {
        content: [
          {
            type: "text",
            text: `Wallet ${result.walletPubkey} connected and authenticated.`,
          },
        ],
        structuredContent: result,
      };
    },
  );

  server.registerTool(
    "wallet_status",
    {
      description: "Return the current local wallet connection status and whether an AgentHub JWT is cached.",
    },
    async () => {
      const result = await walletStatus();
      const summary = result.connected
        ? `Wallet ${result.walletPubkey} is available.`
        : "No local wallet is connected.";

      return {
        content: [
          {
            type: "text",
            text: summary,
          },
        ],
        structuredContent: result,
      };
    },
  );

  server.registerTool(
    "wallet_faucet",
    {
      description: "Request Solana devnet SOL and configured devnet USDC for the connected AgentHub wallet.",
    },
    async () => {
      const result = await walletFaucet();
      const usdcText = result.usdc.requested
        ? `USDC requested${result.usdc.signature ? ` with signature ${result.usdc.signature}` : ""}.`
        : `USDC skipped: ${result.usdc.reason}.`;
      const structuredContent: Record<string, unknown> = {
        walletPubkey: result.walletPubkey,
        network: result.network,
        sol: result.sol,
        usdc: result.usdc,
        warnings: result.warnings,
      };

      return {
        content: [
          {
            type: "text",
            text: `Requested ${result.sol.amount} devnet SOL for ${result.walletPubkey}. ${usdcText}`,
          },
        ],
        structuredContent,
      };
    },
  );

  server.registerTool(
    "match_capability",
    {
      description: "Match a user task to the best available AgentHub provider agent.",
      inputSchema: {
        task: z.string(),
        maxPriceUsdc: z.optional(z.number()),
        tags: z.optional(z.array(z.string())),
      },
    },
    async (args) => {
      const result = await matchCapability(args);
      const structuredContent: Record<string, unknown> = {
        top: result.top,
        alternatives: result.alternatives,
        reason: result.reason,
      };

      return {
        content: [
          {
            type: "text",
            text: `Top match: ${result.top.name} (${result.top.agentId}).`,
          },
        ],
        structuredContent,
      };
    },
  );

  server.registerTool(
    "run_agent_task",
    {
      description: "Execute a matched agent task with x402 payment and report a receipt.",
      inputSchema: {
        agentId: z.string(),
        endpointUrl: z.string(),
        task: z.string(),
      },
    },
    async (args) => {
      const result = await runAgentTask(args);

      return {
        content: [
          {
            type: "text",
            text: `Task completed with receipt ${result.receiptId}.`,
          },
        ],
        structuredContent: result,
      };
    },
  );
}
