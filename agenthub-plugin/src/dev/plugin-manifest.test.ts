import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const pluginRoot = join(process.cwd());
const repoRoot = join(pluginRoot, "..");

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

test("plugin marketplace, wrapper, and MCP runtime stay on the same version", async () => {
  const packageJson = await readJson<{ version: string }>(join(pluginRoot, "package.json"));
  const pluginManifest = await readJson<{ version: string }>(
    join(pluginRoot, ".claude-plugin", "plugin.json"),
  );
  const marketplaceManifest = await readJson<{
    metadata: { version: string };
    plugins: Array<{ version: string }>;
  }>(join(repoRoot, ".claude-plugin", "marketplace.json"));
  const runtimeSource = await readFile(join(pluginRoot, "src", "index.ts"), "utf8");

  assert.equal(pluginManifest.version, packageJson.version);
  assert.equal(marketplaceManifest.metadata.version, packageJson.version);
  assert.equal(marketplaceManifest.plugins[0]?.version, packageJson.version);
  assert.match(runtimeSource, new RegExp(`version:\\s*"${packageJson.version}"`));
});

test("Claude commands use the /agenthub prefix and current MCP tool namespace", async () => {
  const connectCommand = await readFile(join(pluginRoot, "commands", "connect.md"), "utf8");
  const faucetCommand = await readFile(join(pluginRoot, "commands", "faucet.md"), "utf8");
  const runCommand = await readFile(join(pluginRoot, "commands", "run.md"), "utf8");

  for (const command of [connectCommand, faucetCommand, runCommand]) {
    assert.ok(!command.includes("/ah:"));
    assert.ok(!command.includes("mcp__plugin_ah_agenthub__"));
    assert.ok(command.includes("/agenthub:"));
    assert.ok(command.includes("mcp__plugin_agenthub_agenthub__"));
  }
});
