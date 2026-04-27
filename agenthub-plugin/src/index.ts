import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerTools } from "./tools";

async function main() {
  const server = new McpServer({
    name: "agenthub-plugin",
    version: "0.1.1",
  });

  registerTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("AgentHub MCP server failed to start:", error);
  process.exit(1);
});
