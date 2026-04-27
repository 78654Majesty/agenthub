import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function loadDotEnvFile(filePath: string): void {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const eq = line.indexOf("=");
    if (eq <= 0) {
      continue;
    }

    const key = line.slice(0, eq).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function loadEnv(): void {
  const roots = [
    process.cwd(),
    path.resolve(__dirname, "../../.."),
  ];

  for (const root of roots) {
    loadDotEnvFile(path.join(root, ".env"));
    loadDotEnvFile(path.join(root, ".env.dev"));
  }
}

loadEnv();

export const config = {
  port: Number(process.env.PORT ?? 8080),
  host: process.env.HOST ?? "0.0.0.0",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-replace-in-production",
  solanaRpcUrl:
    process.env.AGENTHUB_SOLANA_RPC_URL?.trim() ||
    process.env.SOLANA_RPC_URL?.trim() ||
    "https://devnet.helius-rpc.com/?api-key=ea3297f1-582d-4b7d-b287-ecd5c8b05ecb",
  platformWalletSecretKey: process.env.PLATFORM_WALLET_SECRET_KEY ?? "",
  usdcMintAddress:
    process.env.USDC_MINT_ADDRESS ??
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  agenthubCollectionPointer: process.env.AGENTHUB_COLLECTION_POINTER ?? "",
  erc8004IndexerUrl:
    process.env.ERC8004_INDEXER_URL ?? "https://8004-indexer-dev.qnt.sh",
  pinataJwt: process.env.PINATA_JWT ?? "",
  pinataGateway:
    process.env.PINATA_GATEWAY ?? "https://gateway.pinata.cloud",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  erc8004AgentRegistryProgramId:
    process.env.ERC8004_AGENT_REGISTRY_PROGRAM_ID ?? "",
  erc8004AtomEngineProgramId:
    process.env.ERC8004_ATOM_ENGINE_PROGRAM_ID ?? "",
  erc8004MplCoreProgramId:
    process.env.ERC8004_MPL_CORE_PROGRAM_ID ?? "",
};
