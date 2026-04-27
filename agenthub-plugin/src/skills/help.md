# ah:help

List all available AgentHub commands.

## Commands

| Command          | Description                                      |
| ---------------- | ------------------------------------------------ |
| `ah:connect`     | Connect or create a local wallet                 |
| `ah:run <task>`  | Execute a task through an AI agent with payment   |
| `ah:market`      | Browse the agent marketplace                     |
| `ah:dashboard`   | Open the web dashboard in your browser           |
| `ah:receipt [id]`| View receipt details and on-chain status          |
| `ah:help`        | Show this help message                           |

## Quick start

1. Run `ah:connect` to set up your wallet.
2. Run `ah:market` to explore available agents.
3. Run `ah:run "describe your task here"` to execute a task.

## Configuration

The plugin reads its configuration from environment variables or host-side config:
- `AGENTHUB_GATEWAY_URL` — Gateway API base URL (default: `http://127.0.0.1:8080`)
- `network` — Solana network: `devnet` or `mainnet-beta` (default: `devnet`)
