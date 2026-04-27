# AgentHub Plugin - Claude Code Integration

This document describes the minimum Claude Code integration path for the current phase.

Current direction:

- Claude-facing install layer: Claude plugin wrapper
- Formal runtime layer: local MCP server
- Formal tool layer: `wallet_connect`, `wallet_status`, `wallet_faucet`, `match_capability`, `run_agent_task`

## What Is Formal vs Dev-Only

- Claude plugin wrapper: install layer only
- Formal MCP tools: `wallet_connect`, `wallet_status`, `wallet_faucet`, `match_capability`, `run_agent_task`
- Formal MCP server entry: `node dist/index.js`
- Dev-only smoke entry: `npm run smoke:connect`
- Claude Code user-facing command namespace: `/agenthub:*`

`/agenthub:connect` is not the protocol-level tool name. The stable tool name is `wallet_connect`.

## Claude Plugin Wrapper Files

The repository now carries the Claude wrapper in two layers:

- `<repo-root>/.claude-plugin/marketplace.json`
- `agenthub-plugin/.claude-plugin/plugin.json`
- `agenthub-plugin/.mcp.json`
- `agenthub-plugin/commands/connect.md`
- `agenthub-plugin/commands/faucet.md`
- `agenthub-plugin/commands/run.md`

These files are not the MCP server. They let Claude Code install the plugin and auto-load the bundled MCP runtime.

## Prerequisites

1. Build the plugin:

```powershell
cd agenthub-plugin
npm install
npm run build
```

2. Decide which Gateway environment Claude should use:
   - Default local Gateway: `http://127.0.0.1:8080`
   - Override with `AGENTHUB_GATEWAY_URL=<your-gateway-url>` when needed

## Local Plugin Install

Claude Code can add a marketplace directly from a local path. For the current dev workflow, the monorepo root is the marketplace source and `agenthub-plugin/` is the plugin package:

```powershell
claude plugin marketplace add .\
claude plugin install agenthub
```

After install, restart Claude Code once so the bundled `.mcp.json` is loaded. The current command entries should then include `/agenthub:connect`, `/agenthub:faucet`, and `/agenthub:run`.

For the intended product flow, replace the local marketplace source with your published GitHub repo:

```powershell
claude plugin marketplace add <github-repo>
claude plugin install agenthub
```

## Gateway URL Behavior

The plugin reads `AGENTHUB_GATEWAY_URL` as the Gateway API base URL.

Current defaults:

- Default local Gateway: `http://127.0.0.1:8080`
- Override with `AGENTHUB_GATEWAY_URL=<your-gateway-url>` when needed

If you want Claude Code to use local Dev C auth during testing, start Claude from a shell that already has:

```powershell
$env:AGENTHUB_GATEWAY_URL = "http://127.0.0.1:8080"
claude
```

## Generate A Claude Code MCP Config Snippet

From `agenthub-plugin/`:

```powershell
$env:AGENTHUB_GATEWAY_URL = "http://127.0.0.1:8080"
$env:AGENTHUB_WALLET_PATH = "<repo-root>\\.tmp-agenthub-wallet.json"
npm run claude:config
```

Example output:

```json
{
  "mcpServers": {
    "agenthub": {
      "command": "node",
      "args": [
        "<repo-root>\\agenthub-plugin\\dist\\index.js"
      ],
      "cwd": "<repo-root>\\agenthub-plugin",
      "env": {
        "AGENTHUB_GATEWAY_URL": "http://127.0.0.1:8080",
        "AGENTHUB_WALLET_PATH": "<repo-root>\\.tmp-agenthub-wallet.json"
      }
    }
  }
}
```

Replace `<repo-root>` with your local repository absolute path. Use this JSON as the starting point for Claude Code MCP registration. If your local Claude Code build expects a different outer config envelope, keep the `command`, `args`, `cwd`, and `env` values unchanged.

## Validation Goal

Claude Code integration is considered minimally working when all of the following are true:

1. Claude Code can register the `agenthub` MCP server
2. Claude Code can discover `wallet_connect`
3. Claude Code can invoke `wallet_connect`
4. The invocation completes:
   - challenge
   - sign
   - verify
   - JWT cache

`wallet_status` should also be discoverable after install and should return the current local wallet state plus whether a JWT is cached in session memory.

`wallet_faucet` should be discoverable after install. It calls Gateway `POST /v1/consumer/faucet`; Gateway requests Solana devnet SOL and transfers devnet USDC from its server-side faucet wallet only when `AGENTHUB_DEVNET_USDC_FAUCET_SECRET_KEY` is configured on Gateway.

`match_capability` should be discoverable after install. It requires `wallet_connect` to have completed first, then calls the protected Gateway `POST /v1/consumer/match` endpoint.

`run_agent_task` should be discoverable after install as a protocol-level tool. By default it now uses the real SVM x402 client:

- it requires `wallet_connect` to have completed first
- it loads the Wallet Bridge SDK signer
- it wraps `fetch` with `@x402/fetch`
- it reports a receipt to `POST /v1/consumer/receipts`
- it maps weather agents to `{ city }` payloads
- if receipt reporting fails after a paid execution succeeded, it still returns the agent result and exposes the receipt failure as `receiptError`

For explicit mock fallback, start Claude Code with:

```powershell
$env:AGENTHUB_X402_MODE = "mock"
claude
```

Real mode depends on an x402 Provider endpoint and a wallet funded with devnet SOL plus devnet USDC.

## Intended End-State

The target user flow is:

1. Install the AgentHub Claude plugin wrapper
2. Let the plugin bundle load `.mcp.json`
3. Restart Claude Code
4. Call `/agenthub:connect`
5. Claude Code invokes `wallet_connect`
6. `wallet_connect` talks to the remote Gateway `public-auth` API
7. Call `/agenthub:faucet`
8. Claude Code invokes `wallet_status` and `wallet_faucet`
9. Call `/agenthub:run <task>`
10. Claude Code invokes `wallet_status`, `match_capability`, and, after confirmation, `run_agent_task`
11. For local fallback without a paid Provider, run Claude with `AGENTHUB_X402_MODE=mock`

## Relationship Between Entrypoints

- Claude plugin command: install layer
- `wallet_connect`, `wallet_status`, `wallet_faucet`, `match_capability`, `run_agent_task`: formal protocol-level tools
- `npm run start`: formal process entry for the built MCP server
- `npm run smoke:connect`: development-only local validation
- `/agenthub:connect`: Claude Code user-facing plugin command
- `/agenthub:faucet`: Claude Code user-facing command that calls `wallet_status` and `wallet_faucet`
- `/agenthub:run`: Claude Code user-facing command that orchestrates `wallet_status`, `match_capability`, and `run_agent_task`
