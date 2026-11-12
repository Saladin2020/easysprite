import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import os from "node:os";
import path from "node:path";

const launcher = path.join(os.homedir(), ".cursor", "easysprite-mcp.mjs");
const transport = new StdioClientTransport({
  command: "node",
  args: [launcher],
  env: { ...process.env, EASYSPRITE_HOME: process.cwd() },
});

const client = new Client({ name: "smoke-launcher", version: "0.0.1" });
await client.connect(transport);
const tools = await client.listTools();
console.log("ok", tools.tools.map((t) => t.name).join(", "));
await client.close();
process.exit(0);
