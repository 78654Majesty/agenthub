import { getAgentHubGatewayUrl } from "../config";
import { GatewayClient } from "../gateway-client";
import {
  createWalletConnectHandler,
  InMemorySessionStore,
  type GatewayAuthClient,
  type SessionStore,
  type WalletBridge,
} from "../tools";
import { FileSystemWalletBridge } from "../wallet-bridge/sdk";

export async function runWalletConnectSmoke(deps: {
  walletBridge?: WalletBridge;
  gatewayClient?: GatewayAuthClient;
  sessionStore?: SessionStore;
} = {}) {
  const sessionStore = deps.sessionStore ?? new InMemorySessionStore();
  const walletBridge = deps.walletBridge ?? new FileSystemWalletBridge();
  const gatewayClient = deps.gatewayClient ?? new GatewayClient(getAgentHubGatewayUrl());

  const walletConnect = createWalletConnectHandler({
    walletBridge,
    gatewayClient,
    sessionStore,
  });

  const result = await walletConnect();
  return {
    result,
    token: sessionStore.getToken(),
  };
}

if (require.main === module) {
  runWalletConnectSmoke()
    .then((output) => {
      console.log(JSON.stringify(output, null, 2));
    })
    .catch((error) => {
      console.error("wallet_connect smoke run failed:", error);
      process.exit(1);
    });
}
