# AgentHub Plugin

AgentHub plugin is a stdio MCP server. In the current phase, the formal tools are `wallet_connect`, `wallet_status`, `wallet_faucet`, `match_capability`, and `run_agent_task`.

For Claude Code, the repository now uses a split install model:

- monorepo root `.claude-plugin/marketplace.json`: formal marketplace entry
- `agenthub-plugin/.claude-plugin/plugin.json`: formal plugin wrapper
- `agenthub-plugin/.mcp.json`: bundled MCP runtime registration

The MCP server in `dist/index.js` remains the actual runtime.

## Current Scope

- Formal MCP tools: `wallet_connect`, `wallet_status`, `wallet_faucet`, `match_capability`, `run_agent_task`
- Dev-only smoke entry: `npm run smoke:connect`
- Current wallet layer: in-process Wallet Bridge SDK backed by a local development wallet file
- Default Gateway target: `http://127.0.0.1:8080`
- Override with `AGENTHUB_GATEWAY_URL=<your-gateway-url>` when pointing to another environment

This repository phase does not yet include the full Wallet Bridge, marketplace tools, receipt query flow, rating flow, or dashboard integration.

Current internal-only next-step support:

- `match_capability` calls the protected `consumer/match` endpoint for the first step of `ah:run`
- `run_agent_task` uses the real SVM x402 client by default
- `AGENTHUB_X402_MODE=mock` is only a local development fallback
- real x402 signs payment transactions through the in-process Wallet Bridge SDK

## Install

```powershell
cd agenthub-plugin
npm install
npm run build
```

## Claude Code Wrapper

The formal Claude Code install path now spans both the monorepo root and the plugin package:

- `<repo-root>/.claude-plugin/marketplace.json`
- `.claude-plugin/plugin.json`
- `.mcp.json`
- `commands/connect.md`
- `commands/faucet.md`
- `commands/run.md`

The wrapper does not replace MCP. Its job is to let Claude Code install AgentHub as a plugin from the repository root and auto-load the bundled `agenthub` MCP server.

## Claude Code Local Install

For local development, add the monorepo root as the marketplace source:

```powershell
claude plugin marketplace add .\
claude plugin install agenthub
```

After install, restart Claude Code. The user-facing command namespace is `/agenthub:*`.

Current Claude-facing commands:

- `/agenthub:connect`
- `/agenthub:faucet`
- `/agenthub:run`

For the intended product flow, publish the marketplace to GitHub and then use:

```powershell
claude plugin marketplace add <github-repo>
claude plugin install agenthub
```

## Gateway Configuration

The plugin treats `AGENTHUB_GATEWAY_URL` as the Gateway API base URL and then calls:

- `GET {AGENTHUB_GATEWAY_URL}/v1/public/auth/challenge`
- `POST {AGENTHUB_GATEWAY_URL}/v1/public/auth/verify`
- `POST {AGENTHUB_GATEWAY_URL}/v1/consumer/match`
- `POST {AGENTHUB_GATEWAY_URL}/v1/consumer/faucet`
- `POST {AGENTHUB_GATEWAY_URL}/v1/consumer/receipts`

Default behavior:

- Default local Gateway: `http://127.0.0.1:8080`
- Override with `AGENTHUB_GATEWAY_URL=<your-gateway-url>` when needed

## Faucet Configuration

`wallet_faucet` calls Gateway `POST /v1/consumer/faucet`. The faucet wallet secret is never held by the plugin.

Gateway uses:

- `AGENTHUB_SOLANA_RPC_URL`: optional Solana RPC override, defaults to `https://devnet.helius-rpc.com/?api-key=ea3297f1-582d-4b7d-b287-ecd5c8b05ecb`
- `AGENTHUB_DEVNET_USDC_FAUCET_SECRET_KEY`: server-side public faucet wallet secret key, formatted as a base58-encoded Solana 64-byte secret key string
- `AGENTHUB_DEVNET_USDC_MINT`: optional devnet USDC mint override, defaults to Circle's Solana devnet USDC mint
- `AGENTHUB_DEVNET_USDC_AMOUNT`: optional USDC transfer amount, defaults to `10`

If Gateway does not have `AGENTHUB_DEVNET_USDC_FAUCET_SECRET_KEY`, `wallet_faucet` still requests devnet SOL and reports USDC as skipped.

## x402 Configuration

`run_agent_task` uses:

- `AGENTHUB_X402_MODE`: optional mode selector, defaults to `real`
- `AGENTHUB_X402_MODE=mock`: explicitly enables the local mock x402 fallback
- `AGENTHUB_SOLANA_RPC_URL`: optional Solana RPC override, shared with faucet and x402 SVM client

Default behavior is real x402. For local development without a Provider endpoint or devnet USDC, set `AGENTHUB_X402_MODE=mock`.

Real behavior:

1. Load the connected local wallet from Wallet Bridge SDK
2. Convert the wallet keypair into an `@x402/svm` client signer
3. Wrap `fetch` with `@x402/fetch`
4. POST the task payload to the selected Provider endpoint
5. Decode the `PAYMENT-RESPONSE` header
6. Submit the resulting transaction receipt to Gateway `POST /v1/consumer/receipts`

Weather agent behavior:

- If the matched agent identity contains `weather`, `/agenthub:run` sends `{ "city": "<city>" }` to the Provider endpoint.
- The city is extracted from prompts such as `weather in Shanghai` or `forecast for Tokyo`.
- Object results are hashed using stable JSON before receipt submission.

## Run As MCP Server

After build, the formal MCP server entry is:

```powershell
npm run start
```

This launches:

- `node dist/index.js`

## Generate Claude Code Config

From `agenthub-plugin/`:

```powershell
$env:AGENTHUB_GATEWAY_URL = "http://127.0.0.1:8080"
$env:AGENTHUB_WALLET_PATH = "C:\path\to\.tmp-agenthub-wallet.json"
npm run claude:config
```

This prints a Claude Code MCP registration snippet that points to `dist/index.js`.

## Claude Code Runtime Model

For Claude Code, the intended layering is:

1. Claude plugin wrapper for install
2. Claude plugin-bundled MCP configuration via `.mcp.json`
3. Local AgentHub MCP server via `node dist/index.js`
4. Remote Gateway `public-auth` API

This means AgentHub still depends on a local stdio MCP runtime, but users should not hand-edit MCP config or run a setup command in the intended product path.

## Tool Contract

### `wallet_connect`

Current behavior:

1. Create or load a local development wallet
2. Request Gateway auth challenge
3. Sign challenge locally
4. Verify signature with Gateway
5. Cache returned JWT in plugin memory

Current structured result:

```json
{
  "walletPubkey": "<wallet-pubkey>",
  "tokenCached": true,
  "network": "solana:devnet",
  "isNew": true
}
```

### `wallet_status`

Current behavior:

1. Read the current wallet state from the Wallet Bridge SDK
2. Return whether a local wallet is available
3. Return whether an AgentHub JWT is cached in the current session

Current structured result:

```json
{
  "connected": true,
  "walletPubkey": "<wallet-pubkey>",
  "network": "solana:devnet",
  "tokenCached": true
}
```

### `wallet_faucet`

Current behavior:

1. Require an authenticated session from `wallet_connect`
2. Call Gateway `POST /v1/consumer/faucet`
3. Gateway requests SOL and transfers devnet USDC from its configured faucet wallet when available
4. Return funding signatures, SOL balance, and warnings

Current structured result:

```json
{
  "walletPubkey": "<wallet-pubkey>",
  "network": "solana:devnet",
  "sol": {
    "requested": true,
    "amount": 1,
    "signature": "<sol-airdrop-signature>",
    "balanceLamports": 1000000000
  },
  "usdc": {
    "requested": false,
    "skipped": true,
    "reason": "AGENTHUB_DEVNET_USDC_FAUCET_SECRET_KEY is not configured"
  },
  "warnings": ["Gateway USDC faucet wallet is not configured; only SOL was requested."]
}
```

### `match_capability`

Current behavior:

1. Require an authenticated session from `wallet_connect`
2. Call `POST /v1/consumer/match`
3. Return the top matched agent, alternatives, and Gateway match reason

Current structured result:

```json
{
  "top": {
    "agentId": "agent-1",
    "name": "Invoice Summarizer",
    "description": "Summarizes invoice batches",
    "endpointUrl": "https://agent-1.example.com",
    "priceUsdcMicro": 1500000,
    "ratingAvg": 4.8,
    "capabilityTags": ["finance", "summary"]
  },
  "alternatives": [],
  "reason": "Matched by tags and price ceiling."
}
```

### `run_agent_task`

Current behavior:

1. Require an authenticated session from `wallet_connect`
2. Call the current x402 client to execute a paid task; default is real SVM x402, `AGENTHUB_X402_MODE=mock` enables local fallback
3. Hash the returned result with SHA-256
4. Report the execution receipt to `POST /v1/consumer/receipts`
5. Return the task result plus receipt metadata

Current structured result:

```json
{
  "result": {
    "city": "Shanghai",
    "current": {
      "temperature_c": 22.8
    },
    "source": "open-meteo"
  },
  "receiptId": "receipt-1",
  "txSignature": "<x402-payment-tx>",
  "explorerLink": "https://explorer.solana.com/tx/<x402-payment-tx>?cluster=devnet"
}
```

If receipt reporting fails after the paid execution already succeeded, `run_agent_task` still returns the agent result and transaction signature, and adds:

```json
{
  "receiptError": "Receipt request failed with 400: Agent not found"
}
```

Current limitations:

- real x402 needs a real Provider endpoint that supports SVM x402 devnet payments
- Gateway receipt reporting is currently hackathon-mode: it writes Quote / Order / Receipt records without chain-side verification and returns `paymentVerified=false`
- `run_agent_task` still requires explicit `agentId` and `endpointUrl` from the selected match

## Claude Commands

### `/agenthub:connect`

Wrapper command for the formal `wallet_connect` MCP tool.

### `/agenthub:faucet`

Wrapper command for the formal `wallet_faucet` MCP tool. Intended flow:

1. `/agenthub:connect`
2. `/agenthub:faucet`
3. `/agenthub:run`

### `/agenthub:run`

Wrapper command for the current run flow:

1. `wallet_status`
2. `match_capability`
3. user confirmation
4. `run_agent_task`

`/agenthub:run` is a Claude-facing command. The protocol-level tools remain `wallet_status`, `match_capability`, and `run_agent_task`.

## Dev Commands

```powershell
npm run build
npm run start
npm run test
npm run smoke:connect
npm run claude:config
```
