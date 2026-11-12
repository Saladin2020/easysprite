import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  MCP_DEFAULT_HTTP_HOST,
  MCP_DEFAULT_HTTP_PORT,
  httpMcpUrl,
} from "../shared/mcpCatalog.js";

let child: ChildProcess | null = null;
let startedAt: string | null = null;

export function mcpHttpState() {
  const running = Boolean(child && child.exitCode === null && !child.killed);
  return {
    running,
    pid: running ? child?.pid ?? null : null,
    startedAt,
    host: MCP_DEFAULT_HTTP_HOST,
    port: MCP_DEFAULT_HTTP_PORT,
    url: httpMcpUrl(),
  };
}

export async function probeMcpHttp(
  host = MCP_DEFAULT_HTTP_HOST,
  port = MCP_DEFAULT_HTTP_PORT,
): Promise<{ online: boolean; discovery?: unknown; error?: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 800);
  try {
    const res = await fetch(`http://${host}:${port}/`, { signal: ctrl.signal });
    const discovery = await res.json().catch(() => null);
    return { online: res.ok, discovery };
  } catch (err) {
    return {
      online: false,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function startMcpHttp(workspaceRoot: string): Promise<ReturnType<typeof mcpHttpState>> {
  const existing = await probeMcpHttp();
  if (existing.online) return { ...mcpHttpState(), running: true, pid: null, startedAt };

  if (child && child.exitCode === null) return mcpHttpState();

  const here = path.dirname(fileURLToPath(import.meta.url));
  const serverEntry = path.resolve(here, "../mcp/server.ts");
  const tsxCli = path.resolve(here, "../../node_modules/tsx/dist/cli.mjs");

  child = spawn(
    process.execPath,
    [
      tsxCli,
      serverEntry,
      "--http",
      "--host",
      MCP_DEFAULT_HTTP_HOST,
      "--port",
      String(MCP_DEFAULT_HTTP_PORT),
      "--workspace",
      workspaceRoot,
    ],
    {
      cwd: path.resolve(here, "../.."),
      env: {
        ...process.env,
        EASYSPRITE_WORKSPACE: workspaceRoot,
      },
      stdio: "ignore",
      windowsHide: true,
      detached: false,
    },
  );
  startedAt = new Date().toISOString();
  child.on("exit", () => {
    child = null;
    startedAt = null;
  });

  // Wait briefly for the listener.
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 150));
    const probe = await probeMcpHttp();
    if (probe.online) break;
  }
  return mcpHttpState();
}

export async function stopMcpHttp(): Promise<ReturnType<typeof mcpHttpState>> {
  if (child && child.exitCode === null) {
    child.kill();
    child = null;
    startedAt = null;
  }
  return mcpHttpState();
}
