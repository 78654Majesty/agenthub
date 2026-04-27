import type { FastifyInstance } from "fastify";

import { getAuthService } from "../../services/auth.service";

type PublicAuthService = ReturnType<typeof getAuthService>;

interface PublicAuthRouteOptions {
  authService?: PublicAuthService;
}

function resolveAuthService(optionsOrService?: PublicAuthRouteOptions | PublicAuthService): PublicAuthService {
  if (optionsOrService && "createChallenge" in optionsOrService) {
    return optionsOrService;
  }

  return optionsOrService?.authService ?? getAuthService();
}

export async function registerPublicAuthRoutes(
  app: FastifyInstance,
  optionsOrService?: PublicAuthRouteOptions | PublicAuthService,
) {
  const authService = resolveAuthService(optionsOrService);

  app.get("/challenge", async (request, reply) => {
    const wallet = typeof request.query === "object" && request.query ? (request.query as { wallet?: string }).wallet : undefined;
    if (!wallet) {
      return reply.code(400).send({ error: "wallet query param is required" });
    }

    const result = await authService.createChallenge(wallet);
    return reply.send({
      challenge: result.challenge,
      nonce: result.nonce,
      expires_in: result.expiresIn,
    });
  });

  app.post("/verify", async (request, reply) => {
    const body = (request.body ?? {}) as { wallet?: string; signature?: string };
    if (!body.wallet || !body.signature) {
      return reply.code(400).send({ error: "wallet and signature are required" });
    }

    const result = await authService.verifyWalletLogin({
      wallet: body.wallet,
      signature: body.signature,
    });

    return reply.send({
      token: result.token,
      wallet_pubkey: result.walletPubkey,
      expires_in: result.expiresIn,
    });
  });
}

export default registerPublicAuthRoutes;
