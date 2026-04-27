import { decodePaymentResponseHeader, wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { ExactSvmScheme, type ClientSvmSigner } from "@x402/svm";

import { getSolanaDevnetRpcUrl } from "./config";

export interface ExecuteWithPaymentResult {
  result: unknown;
  txSignature: string;
  payer: string;
  amount: number;
  network: "solana:devnet";
}

export interface X402Client {
  executeWithPayment(
    endpointUrl: string,
    payload: Record<string, unknown>,
  ): Promise<ExecuteWithPaymentResult>;
}

type PaidFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface PaymentResponseLike {
  success: boolean;
  payer?: string;
  transaction: string;
  network: string;
  amount?: string;
}

export class RealX402Client implements X402Client {
  private readonly paidFetch: PaidFetch;
  private readonly decodeHeader: (header: string) => PaymentResponseLike;

  constructor(options: {
    paidFetch: PaidFetch;
    decodePaymentResponseHeader?: (header: string) => PaymentResponseLike;
  }) {
    this.paidFetch = options.paidFetch;
    this.decodeHeader =
      options.decodePaymentResponseHeader ?? ((header) => decodePaymentResponseHeader(header) as PaymentResponseLike);
  }

  async executeWithPayment(
    endpointUrl: string,
    payload: Record<string, unknown>,
  ): Promise<ExecuteWithPaymentResult> {
    const response = await this.paidFetch(endpointUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const responseSummary = await summarizeErrorResponse(response);
      throw new Error(`x402 paid request failed with ${response.status} from ${endpointUrl}${responseSummary}`);
    }

    const paymentResponseHeader = response.headers.get("payment-response");
    if (!paymentResponseHeader) {
      throw new Error("Missing PAYMENT-RESPONSE header");
    }

    const paymentResponse = this.decodeHeader(paymentResponseHeader);
    if (!paymentResponse.success) {
      throw new Error("x402 payment settlement failed");
    }

    const data = (await response.json()) as { result?: unknown };
    if (typeof data.result === "undefined" || data.result === null) {
      throw new Error("Agent response is missing result");
    }

    return {
      result: data.result,
      txSignature: paymentResponse.transaction,
      payer: paymentResponse.payer ?? "",
      amount: paymentResponse.amount ? Number(paymentResponse.amount) : 0,
      network: mapX402Network(paymentResponse.network),
    };
  }
}

export function createRealSvmX402Client(options: {
  signer: ClientSvmSigner;
  rpcUrl?: string;
  baseFetch?: typeof fetch;
  createSvmScheme?: (signer: ClientSvmSigner, config?: { rpcUrl?: string }) => unknown;
  wrapFetchWithPaymentFromConfig?: (
    fetchImpl: typeof fetch,
    config: { schemes: Array<{ network: string; client: unknown }> },
  ) => PaidFetch;
  decodePaymentResponseHeader?: (header: string) => PaymentResponseLike;
}): RealX402Client {
  const rpcUrl = options.rpcUrl ?? getSolanaDevnetRpcUrl();
  const createSvmScheme = options.createSvmScheme ?? ((signer, config) => new ExactSvmScheme(signer, config));
  const wrappedFetch = (options.wrapFetchWithPaymentFromConfig ?? wrapFetchWithPaymentFromConfig)(
    options.baseFetch ?? fetch,
    {
      schemes: [
        {
          network: "solana:*",
          client: createSvmScheme(options.signer, { rpcUrl }),
        },
      ],
    },
  );

  return new RealX402Client({
    paidFetch: wrappedFetch,
    decodePaymentResponseHeader: options.decodePaymentResponseHeader,
  });
}

export class WalletBackedX402Client implements X402Client {
  constructor(private readonly deps: {
    walletBridge: { getSvmSigner(): Promise<ClientSvmSigner> };
    rpcUrl?: string;
    createClient?: (signer: ClientSvmSigner) => X402Client;
  }) {}

  async executeWithPayment(
    endpointUrl: string,
    payload: Record<string, unknown>,
  ): Promise<ExecuteWithPaymentResult> {
    const signer = await this.deps.walletBridge.getSvmSigner();
    const rpcUrl = this.deps.rpcUrl ?? getSolanaDevnetRpcUrl();
    const client =
      this.deps.createClient?.(signer) ??
      createRealSvmX402Client({
        signer,
        rpcUrl,
      });
    try {
      return await client.executeWithPayment(endpointUrl, payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown x402 execution error";
      throw new Error(`x402 execution failed for ${endpointUrl} via rpc ${rpcUrl}: ${message}`);
    }
  }
}

export class MockX402Client implements X402Client {
  async executeWithPayment(
    _endpointUrl: string,
    payload: Record<string, unknown>,
  ): Promise<ExecuteWithPaymentResult> {
    return {
      result: `MOCK_AGENT_RESULT: ${String(payload.task ?? JSON.stringify(payload))}`,
      txSignature: "mock-tx-signature",
      payer: "mock-wallet-payer",
      amount: 1_000_000,
      network: "solana:devnet",
    };
  }
}

function mapX402Network(network: string): "solana:devnet" {
  if (
    network === "solana:devnet" ||
    network === "solana-devnet" ||
    network === "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"
  ) {
    return "solana:devnet";
  }

  throw new Error(`Unsupported x402 network ${network}`);
}

async function summarizeErrorResponse(response: Response): Promise<string> {
  try {
    const body = (await response.text()).trim();
    if (!body) {
      return "";
    }

    const compact = body.replace(/\s+/g, " ").slice(0, 300);
    return `: ${compact}`;
  } catch {
    return "";
  }
}
