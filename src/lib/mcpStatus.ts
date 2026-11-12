import {
  MCP_PROMPTS,
  MCP_SERVER_NAME,
  MCP_TOOLS,
  MCP_VERSION,
  OPERATOR_COMPOSE_NOTE,
  cursorMcpConfigAbsolute,
  httpMcpUrl,
} from "../shared/mcpCatalog.js";
import { mcpHttpState, probeMcpHttp } from "./mcpHttpControl.js";

export async function getMcpStatus(workspaceRoot: string) {
  const managed = mcpHttpState();
  const probe = await probeMcpHttp(managed.host, managed.port);
  const cursorConfig = cursorMcpConfigAbsolute(workspaceRoot);
  return {
    name: MCP_SERVER_NAME,
    version: MCP_VERSION,
    workspaceRoot,
    tools: MCP_TOOLS,
    prompts: MCP_PROMPTS,
    stdio: {
      label: "stdio",
      for: "One User MCP — works in this project and every other Cursor window",
      command: "npm run mcp",
      cursorConfigPath: "~/.cursor/mcp.json",
      homeEnv: "EASYSPRITE_HOME",
      homeEnvValue: process.env.EASYSPRITE_HOME ?? workspaceRoot,
      cursorConfig,
      cursorConfigAbsolute: cursorConfig,
    },
    http: {
      label: "streamable-http",
      for: "Grok bot / remote MCP clients",
      command: "npm run mcp:http",
      host: managed.host,
      port: managed.port,
      url: httpMcpUrl(managed.host, managed.port),
      discoveryUrl: `http://${managed.host}:${managed.port}/`,
      online: probe.online,
      managed,
      discovery: probe.discovery ?? null,
      error: probe.online ? null : probe.error ?? null,
    },
    flow: [
      "workspace_info",
      "list_parts",
      "compose_character",
      "export_character",
    ],
    note: OPERATOR_COMPOSE_NOTE,
  };
}
