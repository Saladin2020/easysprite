// Starts the MCP through scripts/easysprite-mcp.mjs (the same file Cursor runs from ~/.cursor).
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";

const launcher = process.env.EASYSPRITE_LAUNCHER ?? path.resolve("scripts", "easysprite-mcp.mjs");
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [launcher],
  env: { ...process.env, EASYSPRITE_HOME: process.cwd() },
});

const client = new Client({ name: "smoke-launcher", version: "0.0.1" });
await client.connect(transport);
const tools = await client.listTools();
console.log("ok", tools.tools.map((t) => t.name).join(", "));
await client.close();
process.exit(0);
