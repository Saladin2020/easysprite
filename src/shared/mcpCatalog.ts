/** Shared MCP catalog for the server tools and the web UI panel. */
import {
  OPERATOR_COMPOSE_NOTE,
  OPERATOR_PROMPT_DESCRIPTION,
  buildOperatorPrompt,
} from "./operatorPrompt.js";

export const MCP_SERVER_NAME = "easysprite";
export const MCP_VERSION = "0.1.0";
export const MCP_DEFAULT_HTTP_HOST = "127.0.0.1";
export const MCP_DEFAULT_HTTP_PORT = 8790;

export interface McpToolInfo {
  name: string;
  title: string;
  description: string;
}

export const MCP_TOOLS: McpToolInfo[] = [
  {
    name: "workspace_info",
    title: "Workspace info",
    description: "Root, slots, species, anim/export presets, part counts. Call first.",
  },
  {
    name: "list_parts",
    title: "List parts",
    description: "Filter bodies/clothes/animals by slot, query, or bodyType.",
  },
  {
    name: "list_projects",
    title: "List projects",
    description: "Saved character / animal projects.",
  },
  {
    name: "get_project",
    title: "Get project",
    description: "Load one project JSON by id.",
  },
  {
    name: "compose_character",
    title: "Compose character",
    description: "Save selections + colors to a project file.",
  },
  {
    name: "export_character",
    title: "Export character",
    description: "Server-side sheet export (native / rpgmaker_mv / godot / frames).",
  },
  {
    name: "batch_compose",
    title: "Batch compose",
    description: "Compose many characters; optionally export each.",
  },
  {
    name: "build_showcase",
    title: "Build showcase",
    description:
      "Animated HTML cast (Walk/Wave/Cheer + 4 dirs) from a projects folder into an output folder.",
  },
];

export const MCP_PROMPTS = [
  {
    name: "easysprite-operator",
    title: "Easy Sprite operator",
    description: OPERATOR_PROMPT_DESCRIPTION,
    /** Full body agents receive when they fetch the prompt (no request filled in). */
    body: buildOperatorPrompt(),
  },
];

export { OPERATOR_COMPOSE_NOTE };

/**
 * Recommended User MCP entry.
 * Use ${env:USERPROFILE} on Windows — ${userHome} can become /c:/Users/... and fail.
 */
export function cursorMcpConfig(_workspaceRoot?: string) {
  return {
    mcpServers: {
      [MCP_SERVER_NAME]: {
        command: "node",
        args: ["${env:USERPROFILE}\\.cursor\\easysprite-mcp.mjs"],
      },
    },
  };
}

/** @deprecated use cursorMcpConfig — kept for older call sites */
export function cursorMcpConfigAbsolute(workspaceRoot: string) {
  return cursorMcpConfig(workspaceRoot);
}

export function httpMcpUrl(host = MCP_DEFAULT_HTTP_HOST, port = MCP_DEFAULT_HTTP_PORT): string {
  return `http://${host}:${port}/mcp`;
}
