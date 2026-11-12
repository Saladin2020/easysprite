import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", "src/mcp/server.ts"],
  cwd: process.cwd(),
  env: { ...process.env },
});

const client = new Client({ name: "smoke", version: "0.0.1" });
await client.connect(transport);
const tools = await client.listTools();
console.log(
  "tools",
  tools.tools.map((t) => t.name).join(", "),
);
const info = await client.callTool({ name: "workspace_info", arguments: {} });
const text = info.content?.[0]?.text ?? "";
console.log("workspace_ok", text.includes("easysprite") || text.includes("frameSize"));
const listed = await client.callTool({
  name: "list_parts",
  arguments: { slot: "body", query: "animal_dog", limit: 5 },
});
console.log("parts", listed.content?.[0]?.text?.slice(0, 200));
await client.close();
process.exit(0);
