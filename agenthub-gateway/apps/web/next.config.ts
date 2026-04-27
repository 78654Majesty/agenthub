import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_GATEWAY_URL: process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:8080",
    NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "",
    NEXT_PUBLIC_USDC_MINT: process.env.NEXT_PUBLIC_USDC_MINT ?? "",
  },
};

export default nextConfig;
