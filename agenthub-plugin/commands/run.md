---
description: Match an AgentHub provider agent and run a task through the formal MCP tools
argument-hint: <task description>
allowed-tools: [
  "mcp__plugin_agenthub_agenthub__wallet_status",
  "mcp__plugin_agenthub_agenthub__match_capability",
  "mcp__plugin_agenthub_agenthub__run_agent_task"
]
---

# AgentHub Run

Use this command when the user wants AgentHub to find an agent and run a task.

## Goal

Map the Claude-facing `/agenthub:run` command to the formal MCP tools without adding a Claude-only execution path.

## Steps

1. Read the user's task description from the command arguments or ask for one if it is missing.

2. Check wallet state by calling `wallet_status`.
   - If no wallet is connected, tell the user to run `/agenthub:connect` first.
   - If no AgentHub JWT is cached, tell the user to run `/agenthub:connect` again in the current Claude session.

3. Match an agent by calling `match_capability`.
   - Pass the task description as `task`.
   - Include `maxPriceUsdc` or `tags` only if the user explicitly provided them.

4. Present the top match and alternatives before running.
   - Show agent name, agent ID, price in USDC, rating, tags, and reason.
   - Ask for confirmation before payment or execution.

5. After the user confirms, call `run_agent_task`.
   - Use the selected agent's `agentId`.
   - Use the selected agent's `endpointUrl`.
   - Pass the original task description as `task`.

6. Report the result.
   - Show the agent result.
   - Show receipt ID if available.
   - Show transaction signature.
   - Show explorer link if available.
   - If `receiptError` is present, tell the user execution succeeded but receipt reporting failed.

## Current Limits

- `run_agent_task` uses real SVM x402 by default.
- `AGENTHUB_X402_MODE=mock` is only a local development fallback.
- Weather agents receive `{ city }` payloads extracted from prompts like `weather in Shanghai`.
- Gateway receipt reporting is currently hackathon-mode: it writes the receipt record without chain-side verification, and `payment_verified` remains `false`.

## Rules

- Never describe `/agenthub:run` as a protocol-level tool name.
- Never bypass `match_capability` for matching.
- Never bypass `run_agent_task` for execution.
- Always ask for user confirmation before calling `run_agent_task`.
