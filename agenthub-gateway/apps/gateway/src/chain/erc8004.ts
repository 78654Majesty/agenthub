/**
 * @file  src/chain/erc8004.ts
 * @owner 基建
 * @module chain
 *
 * ERC-8004 Solana SDK singleton initialization.
 * Connects to the configured Solana RPC and provides a shared SDK instance.
 *
 * Type hints:
 *   - ../config (config)
 *   - 8004-solana (SolanaSDK)
 *
 * Exports:
 *   - getReadOnlySDK()
 *   - ensurePlatformWalletHasGas()
 *   - registerAgentOnChain()
 */

import { Keypair, LAMPORTS_PER_SOL, type Cluster } from "@solana/web3.js";

import { config } from "../config";

type RegisterAgentResult = {
  assetAddress: string;
  txSignature: string;
};

type SolanaSDKInstance = {
  registerAgent: (
    metadataUri?: string,
    options?: { collectionPointer?: string },
  ) => Promise<unknown>;
  connection?: { getBalance: (address: unknown) => Promise<number> };
};

type SolanaSDKConstructor = new (options: {
  rpcUrl: string;
  cluster: Cluster;
  signer?: Keypair;
  programIds?: {
    agentRegistry?: string;
    atomEngine?: string;
    mplCore?: string;
  };
}) => SolanaSDKInstance;

let writeSdkInstance: SolanaSDKInstance | null = null;
let readOnlySdkInstance: SolanaSDKInstance | null = null;
let platformKeypairInstance: Keypair | null = null;

function resolveProgramIdsOverride():
  | { agentRegistry?: string; atomEngine?: string; mplCore?: string }
  | undefined {
  const agentRegistry = config.erc8004AgentRegistryProgramId.trim();
  const atomEngine = config.erc8004AtomEngineProgramId.trim();
  const mplCore = config.erc8004MplCoreProgramId.trim();

  if (!agentRegistry && !atomEngine && !mplCore) {
    return undefined;
  }

  return {
    ...(agentRegistry ? { agentRegistry } : {}),
    ...(atomEngine ? { atomEngine } : {}),
    ...(mplCore ? { mplCore } : {}),
  };
}

function loadSolanaSdkConstructor(): SolanaSDKConstructor {
  let moduleValue: { SolanaSDK?: SolanaSDKConstructor } | undefined;

  try {
    moduleValue = require("8004-solana") as {
      SolanaSDK?: SolanaSDKConstructor;
    };
  } catch {
    // Some runtimes fail package export resolution for this dependency.
    // Fallback to absolute dist entry via exported package.json path.
    const path = require("node:path") as typeof import("node:path");
    const packageJsonPath = require.resolve("8004-solana/package.json");
    const distEntryPath = path.join(path.dirname(packageJsonPath), "dist", "index.js");
    moduleValue = require(distEntryPath) as {
      SolanaSDK?: SolanaSDKConstructor;
    };
  }

  if (!moduleValue?.SolanaSDK) {
    throw new Error("ERC8004_SDK_UNAVAILABLE");
  }

  return moduleValue.SolanaSDK;
}

function resolveClusterFromRpc(rpcUrl: string): Cluster {
  const normalized = rpcUrl.toLowerCase();
  if (normalized.includes("devnet")) {
    return "devnet";
  }
  if (normalized.includes("testnet")) {
    return "testnet";
  }
  return "mainnet-beta";
}

function parseSecretKey(secretKey: string): Uint8Array {
  if (!secretKey) {
    throw new Error("PLATFORM_WALLET_NOT_CONFIGURED");
  }

  const trimmed = secretKey.trim();
  if (!trimmed.startsWith("[")) {
    throw new Error("PLATFORM_WALLET_FORMAT_INVALID");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("PLATFORM_WALLET_FORMAT_INVALID");
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("PLATFORM_WALLET_FORMAT_INVALID");
  }

  return Uint8Array.from(parsed);
}

export function getPlatformKeypair(): Keypair {
  if (platformKeypairInstance) {
    return platformKeypairInstance;
  }

  const secret = parseSecretKey(config.platformWalletSecretKey);
  platformKeypairInstance = Keypair.fromSecretKey(secret);
  return platformKeypairInstance;
}

function getWriteSdk(): SolanaSDKInstance {
  if (writeSdkInstance) {
    return writeSdkInstance;
  }

  const SolanaSDK = loadSolanaSdkConstructor();
  const signer = getPlatformKeypair();
  const programIds = resolveProgramIdsOverride();
  writeSdkInstance = new SolanaSDK({
    rpcUrl: config.solanaRpcUrl,
    cluster: resolveClusterFromRpc(config.solanaRpcUrl),
    signer,
    ...(programIds ? { programIds } : {}),
  });
  return writeSdkInstance;
}

export function getReadOnlySDK(): SolanaSDKInstance {
  if (readOnlySdkInstance) {
    return readOnlySdkInstance;
  }

  const SolanaSDK = loadSolanaSdkConstructor();
  const programIds = resolveProgramIdsOverride();
  readOnlySdkInstance = new SolanaSDK({
    rpcUrl: config.solanaRpcUrl,
    cluster: resolveClusterFromRpc(config.solanaRpcUrl),
    ...(programIds ? { programIds } : {}),
  });
  return readOnlySdkInstance;
}

export async function ensurePlatformWalletHasGas(minSol: number = 0.005): Promise<void> {
  const signer = getPlatformKeypair();
  const connection = getWriteSdk().connection;

  if (!connection || typeof connection.getBalance !== "function") {
    return;
  }

  const lamports = await connection.getBalance(signer.publicKey);
  const minLamports = Math.floor(minSol * LAMPORTS_PER_SOL);
  if (lamports < minLamports) {
    throw new Error("PLATFORM_WALLET_INSUFFICIENT_BALANCE");
  }
}

export async function registerAgentOnChain(metadataUri: string): Promise<RegisterAgentResult> {
  if (!config.agenthubCollectionPointer) {
    throw new Error("COLLECTION_POINTER_NOT_CONFIGURED");
  }

  const result = await getWriteSdk().registerAgent(metadataUri, {
    collectionPointer: config.agenthubCollectionPointer,
  });

  const maybeResult = result as {
    success?: boolean;
    error?: string;
    asset?:
      | string
      | { toBase58?: () => string; toString?: () => string }
      | { publicKey?: { toBase58?: () => string; toString?: () => string } };
    assetAddress?: string;
    mint?: { toBase58?: () => string; toString?: () => string } | string;
    signature?: string;
    signatures?: string[];
    txid?: string;
  };

  if (maybeResult.success === false) {
    const detail =
      typeof maybeResult.error === "string" && maybeResult.error.trim().length > 0
        ? maybeResult.error.trim()
        : "unknown";
    throw new Error(`ERC8004_REGISTER_FAILED:${detail}`);
  }

  const assetAddress =
    (typeof maybeResult.asset === "string" ? maybeResult.asset : undefined) ??
    maybeResult.assetAddress ??
    (typeof maybeResult.mint === "string" ? maybeResult.mint : undefined) ??
    (typeof maybeResult.asset === "object" ? maybeResult.asset?.toBase58?.() : undefined) ??
    (typeof maybeResult.asset === "object" ? maybeResult.asset?.toString?.() : undefined) ??
    (typeof maybeResult.asset === "object"
      ? maybeResult.asset?.publicKey?.toBase58?.()
      : undefined) ??
    (typeof maybeResult.asset === "object"
      ? maybeResult.asset?.publicKey?.toString?.()
      : undefined) ??
    (typeof maybeResult.mint === "object" ? maybeResult.mint?.toBase58?.() : undefined) ??
    (typeof maybeResult.mint === "object" ? maybeResult.mint?.toString?.() : undefined) ??
    "";
  const txSignature =
    maybeResult.signature ??
    maybeResult.signatures?.[0] ??
    maybeResult.txid ??
    "";

  if (!assetAddress) {
    throw new Error("ERC8004_REGISTER_NO_ASSET");
  }

  return {
    assetAddress,
    txSignature,
  };
}
