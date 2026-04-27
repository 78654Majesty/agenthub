export interface ChallengeDto {
  challenge: string;
  nonce: string;
  expiresIn: number;
}

export interface VerifyChallengeInput {
  wallet: string;
  signature: string;
}

export interface VerifyChallengeDto {
  token: string;
  walletPubkey: string;
  expiresIn: number;
}

export interface MatchAgentInput {
  task: string;
  maxPriceUsdc?: number;
  tags?: string[];
}

export interface MatchedAgentDto {
  agentId: string;
  name: string;
  description: string;
  endpointUrl: string;
  priceUsdcMicro: number;
  ratingAvg: number;
  capabilityTags: string[];
}

export interface MatchAgentDto {
  top: MatchedAgentDto;
  alternatives: MatchedAgentDto[];
  reason: string;
}

export interface SubmitReceiptInput {
  agentId: string;
  taskText: string;
  txSignature: string;
  payer: string;
  amount: number;
  network: string;
  resultHash: string;
}

export interface SubmitReceiptDto {
  receiptId: string;
  orderId: string;
  paymentVerified: boolean;
  explorerLink?: string;
}

export interface FaucetSolResult {
  requested: true;
  amount: number;
  signature: string;
  balanceLamports: number;
}

export interface FaucetUsdcRequestedResult {
  requested: true;
  signature?: string;
  amount?: string;
}

export interface FaucetUsdcSkippedResult {
  requested: false;
  skipped: true;
  reason: string;
}

export interface FaucetResult {
  walletPubkey: string;
  network: "solana:devnet";
  sol: FaucetSolResult;
  usdc: FaucetUsdcRequestedResult | FaucetUsdcSkippedResult;
  warnings: string[];
}

export class GatewayClient {
  constructor(private readonly baseUrl: string) {}

  async getChallenge(pubkey: string): Promise<ChallengeDto> {
    const response = await fetch(`${this.baseUrl}/v1/public/auth/challenge?wallet=${encodeURIComponent(pubkey)}`);
    if (!response.ok) {
      throw new Error(`Challenge request failed with ${response.status}`);
    }

    const data = (await response.json()) as { challenge: string; nonce: string; expiresIn?: number; expires_in?: number };
    return {
      challenge: data.challenge,
      nonce: data.nonce,
      expiresIn: data.expiresIn ?? data.expires_in ?? 300,
    };
  }

  async verifyChallenge(payload: VerifyChallengeInput): Promise<VerifyChallengeDto> {
    const response = await fetch(`${this.baseUrl}/v1/public/auth/verify`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Verify request failed with ${response.status}`);
    }

    const data = (await response.json()) as {
      token: string;
      walletPubkey?: string;
      wallet_pubkey?: string;
      expiresIn?: number;
      expires_in?: number;
    };

    return {
      token: data.token,
      walletPubkey: data.walletPubkey ?? data.wallet_pubkey ?? payload.wallet,
      expiresIn: data.expiresIn ?? data.expires_in ?? 3600,
    };
  }

  async matchAgent(input: MatchAgentInput, token: string): Promise<MatchAgentDto> {
    const response = await fetch(`${this.baseUrl}/v1/consumer/match`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`Match request failed with ${response.status}`);
    }

    const data = (await response.json()) as {
      top: {
        agent_id: string;
        name: string;
        description: string;
        endpoint_url: string;
        price_usdc_micro: number;
        rating_avg: number;
        capability_tags?: string[];
      };
      alternatives: Array<{
        agent_id: string;
        name: string;
        description: string;
        endpoint_url: string;
        price_usdc_micro: number;
        rating_avg: number;
        capability_tags?: string[];
      }>;
      reason: string;
    };

    const mapAgent = (agent: {
      agent_id: string;
      name: string;
      description: string;
      endpoint_url: string;
      price_usdc_micro: number;
      rating_avg: number;
      capability_tags?: string[];
    }): MatchedAgentDto => ({
      agentId: agent.agent_id,
      name: agent.name,
      description: agent.description,
      endpointUrl: agent.endpoint_url,
      priceUsdcMicro: agent.price_usdc_micro,
      ratingAvg: agent.rating_avg,
      capabilityTags: agent.capability_tags ?? [],
    });

    return {
      top: mapAgent(data.top),
      alternatives: data.alternatives.map(mapAgent),
      reason: data.reason,
    };
  }

  async submitReceipt(input: SubmitReceiptInput, token: string): Promise<SubmitReceiptDto> {
    const response = await fetch(`${this.baseUrl}/v1/consumer/receipts`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`Receipt request failed with ${response.status}`);
    }

    const data = (await response.json()) as {
      receipt_id: string;
      order_id: string;
      payment_verified: boolean;
      explorer_link?: string;
    };

    return {
      receiptId: data.receipt_id,
      orderId: data.order_id,
      paymentVerified: data.payment_verified,
      explorerLink: data.explorer_link,
    };
  }

  async requestFaucet(token: string): Promise<FaucetResult> {
    const response = await fetch(`${this.baseUrl}/v1/consumer/faucet`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`Faucet request failed with ${response.status}`);
    }

    const data = (await response.json()) as {
      wallet_pubkey: string;
      network: "solana:devnet";
      sol: {
        requested: true;
        amount: number;
        signature: string;
        balance_lamports: number;
      };
      usdc: FaucetUsdcRequestedResult | FaucetUsdcSkippedResult;
      warnings: string[];
    };

    return {
      walletPubkey: data.wallet_pubkey,
      network: data.network,
      sol: {
        requested: true,
        amount: data.sol.amount,
        signature: data.sol.signature,
        balanceLamports: data.sol.balance_lamports,
      },
      usdc: data.usdc,
      warnings: data.warnings,
    };
  }
}
