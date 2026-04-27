import { createHash, randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { getOrCreateAssociatedTokenAccount, transferChecked } from "@solana/spl-token";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

export interface CreateReceiptInput {
  agentId: string;
  taskText: string;
  txSignature: string;
  payer: string;
  amount: number;
  network: string;
  resultHash: string;
}

export interface CreateReceiptResult {
  receiptId: string;
  orderId: string;
  paymentVerified: boolean;
  explorerLink?: string;
}

export interface ExpectedPaymentVerificationInput {
  payer: string;
  amount: number;
  network: string;
}

export interface ConsumerService {
  createReceipt(walletPubkey: string, input: CreateReceiptInput): Promise<CreateReceiptResult>;
}

export interface ReceiptStore {
  findWalletByPubkey(pubkey: string): Promise<{ id: string; pubkey: string } | null>;
  findAgentById(agentId: string): Promise<{ id: string; priceUsdcMicro: number } | null>;
  createPaidReceipt(input: {
    walletId: string;
    agentId: string;
    taskText: string;
    amountUsdcMicro: number;
    txSignature: string;
    payer: string;
    network: string;
    resultHash: string;
  }): Promise<{ receiptId: string; orderId: string }>;
}

export interface FaucetResult {
  walletPubkey: string;
  network: "solana:devnet";
  sol: {
    requested: true;
    amount: number;
    signature: string;
    balanceLamports: number;
  };
  usdc:
    | {
        requested: true;
        signature: string;
        amount: string;
      }
    | {
        requested: false;
        skipped: true;
        reason: string;
      };
  warnings: string[];
}

export interface FaucetService {
  requestFunds(walletPubkey: string): Promise<FaucetResult>;
}

let prismaSingleton: PrismaClient | undefined;

function getPrismaClient(): PrismaClient {
  if (!prismaSingleton) {
    prismaSingleton = new PrismaClient();
  }

  return prismaSingleton;
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function createPrismaReceiptStore(prisma: PrismaClient = getPrismaClient()): ReceiptStore {
  return {
    async findWalletByPubkey(pubkey) {
      return prisma.wallet.findUnique({
        where: { pubkey },
        select: { id: true, pubkey: true },
      });
    },
    async findAgentById(agentId) {
      return prisma.agent.findUnique({
        where: { id: agentId },
        select: { id: true, priceUsdcMicro: true },
      });
    },
    async createPaidReceipt(input) {
      const now = new Date();
      const quote = await prisma.quote.create({
        data: {
          agentId: input.agentId,
          consumerWalletId: input.walletId,
          taskText: input.taskText,
          amountUsdcMicro: input.amountUsdcMicro,
          status: "accepted",
          expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
        },
      });
      const order = await prisma.order.create({
        data: {
          quoteId: quote.id,
          agentId: input.agentId,
          consumerWalletId: input.walletId,
          status: "completed",
          paymentTx: input.txSignature,
          paymentVerified: false,
          paymentPayer: input.payer,
          paymentAmount: input.amountUsdcMicro,
          paymentNetwork: input.network,
          resultHash: input.resultHash,
        },
      });
      const receipt = await prisma.receipt.create({
        data: {
          orderId: order.id,
          agentId: input.agentId,
          consumerWalletId: input.walletId,
          receiptHash: sha256(`${order.id}:${input.resultHash}:${input.txSignature}`),
          amountUsdcMicro: input.amountUsdcMicro,
          feedbackStatus: "pending",
        },
      });

      await prisma.agent.update({
        where: { id: input.agentId },
        data: { totalOrders: { increment: 1 } },
      });

      return {
        receiptId: receipt.id,
        orderId: order.id,
      };
    },
  };
}

export function createConsumerService(deps: {
  verifyTransaction?: (txSignature: string, expected: ExpectedPaymentVerificationInput) => Promise<boolean>;
  receiptStore?: ReceiptStore;
  createId?: () => string;
}): ConsumerService {
  const createId = deps.createId ?? randomUUID;
  const receiptStore = deps.receiptStore;

  return {
    async createReceipt(walletPubkey, input) {
      if (receiptStore) {
        const wallet = await receiptStore.findWalletByPubkey(walletPubkey);
        if (!wallet) {
          throw new Error("Authenticated wallet not found");
        }

        const agent = await receiptStore.findAgentById(input.agentId);
        if (!agent) {
          throw new Error("Agent not found");
        }

        const ids = await receiptStore.createPaidReceipt({
          walletId: wallet.id,
          agentId: agent.id,
          taskText: input.taskText,
          amountUsdcMicro: input.amount,
          txSignature: input.txSignature,
          payer: input.payer,
          network: input.network,
          resultHash: input.resultHash,
        });

        return {
          receiptId: ids.receiptId,
          orderId: ids.orderId,
          paymentVerified: false,
          explorerLink: `https://explorer.solana.com/tx/${input.txSignature}?cluster=devnet`,
        };
      }

      return {
        receiptId: createId(),
        orderId: createId(),
        paymentVerified: false,
        explorerLink: `https://explorer.solana.com/tx/${input.txSignature}?cluster=devnet`,
      };
    },
  };
}

export function getSolanaDevnetRpcUrl(): string {
  return (
    process.env.AGENTHUB_SOLANA_RPC_URL?.trim() ||
    process.env.SOLANA_RPC_URL?.trim() ||
    "https://devnet.helius-rpc.com/?api-key=ea3297f1-582d-4b7d-b287-ecd5c8b05ecb"
  );
}

function getDevnetUsdcFaucetSecretKey(): string | null {
  return process.env.AGENTHUB_DEVNET_USDC_FAUCET_SECRET_KEY ?? null;
}

function getDevnetUsdcMint(): string {
  return process.env.AGENTHUB_DEVNET_USDC_MINT ?? "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
}

function getDevnetUsdcAmount(): string {
  return process.env.AGENTHUB_DEVNET_USDC_AMOUNT ?? "1";
}

export function parseSecretKey(secretKey: string): Uint8Array {
  const trimmed = secretKey.trim();

  try {
    const decoded = bs58.decode(trimmed);
    if (decoded.length !== 64) {
      throw new Error("invalid_length");
    }

    return decoded;
  } catch {
    throw new Error("AGENTHUB_DEVNET_USDC_FAUCET_SECRET_KEY must be a base58-encoded 64-byte secret key");
  }
}

function toTokenBaseUnits(amount: string, decimals: number): bigint {
  const [wholePart, fractionalPart = ""] = amount.split(".");
  const normalizedFraction = fractionalPart.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(wholePart || "0") * 10n ** BigInt(decimals) + BigInt(normalizedFraction || "0");
}

export function createDevnetFaucetService(options: {
  connection?: Connection;
  solAmount?: number;
  usdcAmount?: string;
  usdcMint?: string;
  faucetSecretKey?: string | null;
} = {}): FaucetService {
  const connection = options.connection ?? new Connection(getSolanaDevnetRpcUrl(), "confirmed");
  const solAmount = options.solAmount ?? 1;
  const usdcAmount = options.usdcAmount ?? getDevnetUsdcAmount();
  const faucetSecretKey =
    typeof options.faucetSecretKey === "undefined" ? getDevnetUsdcFaucetSecretKey() : options.faucetSecretKey;
  const usdcMint = new PublicKey(options.usdcMint ?? getDevnetUsdcMint());

  return {
    async requestFunds(walletPubkey) {
      const recipient = new PublicKey(walletPubkey);
      const solSignature = await connection.requestAirdrop(recipient, Math.round(solAmount * LAMPORTS_PER_SOL));
      await connection.confirmTransaction(solSignature, "confirmed");
      const balanceLamports = await connection.getBalance(recipient, "confirmed");
      const warnings: string[] = [];

      if (!faucetSecretKey) {
        warnings.push("Gateway USDC faucet wallet is not configured; only SOL was requested.");

        return {
          walletPubkey,
          network: "solana:devnet",
          sol: {
            requested: true,
            amount: solAmount,
            signature: solSignature,
            balanceLamports,
          },
          usdc: {
            requested: false,
            skipped: true,
            reason: "AGENTHUB_DEVNET_USDC_FAUCET_SECRET_KEY is not configured",
          },
          warnings,
        };
      }

      const faucetKeypair = Keypair.fromSecretKey(parseSecretKey(faucetSecretKey));
      const sourceAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        faucetKeypair,
        usdcMint,
        faucetKeypair.publicKey,
      );
      const destinationAccount = await getOrCreateAssociatedTokenAccount(connection, faucetKeypair, usdcMint, recipient);
      const usdcSignature = await transferChecked(
        connection,
        faucetKeypair,
        sourceAccount.address,
        usdcMint,
        destinationAccount.address,
        faucetKeypair,
        toTokenBaseUnits(usdcAmount, 6),
        6,
      );

      return {
        walletPubkey,
        network: "solana:devnet",
        sol: {
          requested: true,
          amount: solAmount,
          signature: solSignature,
          balanceLamports,
        },
        usdc: {
          requested: true,
          signature: usdcSignature,
          amount: usdcAmount,
        },
        warnings,
      };
    },
  };
}
