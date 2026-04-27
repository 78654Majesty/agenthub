export const DEFAULT_AGENTHUB_GATEWAY_URL = "http://127.0.0.1:8080";
export const DEFAULT_SOLANA_DEVNET_RPC_URL = "https://devnet.helius-rpc.com/?api-key=ea3297f1-582d-4b7d-b287-ecd5c8b05ecb";

export function getAgentHubGatewayUrl(): string {
  return process.env.AGENTHUB_GATEWAY_URL ?? DEFAULT_AGENTHUB_GATEWAY_URL;
}

export function getSolanaDevnetRpcUrl(): string {
  return process.env.AGENTHUB_SOLANA_RPC_URL ?? DEFAULT_SOLANA_DEVNET_RPC_URL;
}
