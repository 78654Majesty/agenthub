declare module "@x402/fetch" {
  export function decodePaymentResponseHeader(header: string): unknown;

  export function wrapFetchWithPaymentFromConfig(
    fetchImpl: typeof fetch,
    config: { schemes: Array<{ network: string; client: unknown }> },
  ): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}
