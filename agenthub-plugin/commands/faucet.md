---
description: Request Solana devnet SOL and configured devnet USDC for the connected AgentHub wallet
allowed-tools: [
  "mcp__plugin_agenthub_agenthub__wallet_status",
  "mcp__plugin_agenthub_agenthub__wallet_faucet"
]
---

# AgentHub Faucet

Use this command when the user wants test funds for the current AgentHub devnet wallet.

## Goal

Prepare the wallet for `/agenthub:run` on Solana devnet by requesting SOL for gas and configured USDC for x402 payments.

## Steps

1. Check wallet state by calling `wallet_status`.
   - If no wallet is connected, tell the user to run `/agenthub:connect` first.

2. Call `wallet_faucet`.
   - This sends a protected request to Gateway `POST /v1/consumer/faucet`.
   - Gateway requests SOL through Solana devnet RPC.
   - Gateway transfers USDC only when its server-side `AGENTHUB_DEVNET_USDC_FAUCET_SECRET_KEY` is configured.

3. Report the result.
   - Wallet pubkey
   - SOL airdrop signature
   - SOL balance in lamports
   - USDC transfer signature or skipped reason
   - Any warnings

## Current Limits

- SOL funding is executed by Gateway against Solana devnet RPC.
- USDC funding requires Gateway to hold a configured public faucet wallet secret key.
- Do not claim USDC was funded when the result says it was skipped.

## Rules

- Never describe `/agenthub:faucet` as the protocol-level tool name.
- Never bypass `wallet_faucet` with an ad hoc shell command.
- If USDC is skipped, tell the user exactly which Gateway environment variable is missing.
