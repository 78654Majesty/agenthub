---
description: Explain and trigger AgentHub connect through the formal wallet_connect MCP tool
allowed-tools: ["mcp__plugin_agenthub_agenthub__wallet_connect"]
---

# AgentHub Connect

Use this command when the user wants to connect AgentHub inside Claude Code.

## Goal

Map the Claude-facing entry to the formal MCP tool without introducing a Claude-only implementation path.

## Steps

1. Confirm that the installed plugin has loaded the bundled `agenthub` MCP runtime.
   - No manual setup command or user-level MCP config write is required in the current product path.

2. Explain the boundary clearly.
   - Claude command entry: `/agenthub:connect`
   - Formal MCP tool: `wallet_connect`

3. Trigger the actual AgentHub connection by calling `wallet_connect`.

4. Report the structured result in user-facing language.
   - Wallet pubkey
   - Whether JWT cache succeeded
   - Network
   - Whether the wallet was newly created

## Rules

- Never describe `/agenthub:connect` as the protocol-level tool name.
- Never bypass `wallet_connect` with an ad hoc shell or HTTP flow.
- Keep the user-facing explanation short and concrete.
