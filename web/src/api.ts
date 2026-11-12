import type { CharacterProject, WorkspaceSummary } from "./types";
import type { ExportFile } from "./exportPresets";

export async function fetchWorkspace(): Promise<WorkspaceSummary> {
  const res = await fetch("/api/workspace");
  if (!res.ok) throw new Error("Failed to load workspace");
  return res.json();
}

export interface McpStatus {
  name: string;
  version: string;
  workspaceRoot: string;
  tools: Array<{ name: string; title: string; description: string }>;
  prompts: Array<{
    name: string;
    title: string;
    description: string;
    body?: string;
  }>;
  stdio: {
    label: string;
    for: string;
    command: string;
    cursorConfigPath: string;
    homeEnv: string;
    homeEnvValue: string;
    cursorConfig: unknown;
    cursorConfigAbsolute: unknown;
  };
  http: {
    label: string;
    for: string;
    command: string;
    host: string;
    port: number;
    url: string;
    discoveryUrl: string;
    online: boolean;
    managed: { running: boolean; pid: number | null; startedAt: string | null };
    discovery: unknown;
    error: string | null;
  };
  flow: string[];
  note: string;
}

export async function fetchMcpStatus(): Promise<McpStatus> {
  const res = await fetch("/api/mcp");
  if (!res.ok) throw new Error("Failed to load MCP status");
  return res.json();
}

export async function startMcpHttp(): Promise<McpStatus> {
  const res = await fetch("/api/mcp/http/start", { method: "POST" });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  const data = (await res.json()) as { status: McpStatus };
  return data.status;
}

export async function stopMcpHttp(): Promise<McpStatus> {
  const res = await fetch("/api/mcp/http/stop", { method: "POST" });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  const data = (await res.json()) as { status: McpStatus };
  return data.status;
}

export function partSheetUrl(slot: string, id: string): string {
  return `/api/parts/${encodeURIComponent(slot)}/${encodeURIComponent(id)}/sheet.png`;
}

export async function saveProject(
  project: CharacterProject,
  dir?: string,
): Promise<CharacterProject & { path: string }> {
  const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...project, dir }),
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = (await res.json()) as { error?: string };
      if (err.error) detail = err.error;
    } catch {
      // ignore
    }
    throw new Error(`Failed to save project: ${detail}`);
  }
  return res.json();
}

export async function listProjectsFromDir(dir?: string): Promise<{
  dir: string;
  count: number;
  projects: CharacterProject[];
}> {
  const q = dir?.trim() ? `?dir=${encodeURIComponent(dir.trim())}` : "";
  const res = await fetch(`/api/projects${q}`);
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = (await res.json()) as { error?: string };
      if (err.error) detail = err.error;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return res.json();
}

export async function deleteProjectsApi(payload: {
  ids?: string[];
  prefix?: string;
  dir?: string;
}): Promise<{ deleted: string[]; missing: string[]; dir: string }> {
  const res = await fetch("/api/projects", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = (await res.json()) as { error?: string };
      if (err.error) detail = err.error;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return res.json();
}

export async function openLocalPath(target: string): Promise<{ path: string }> {
  const res = await fetch("/api/open-path", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: target }),
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = (await res.json()) as { error?: string };
      if (err.error) detail = err.error;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return res.json();
}

export async function buildShowcase(payload: {
  projectIds?: string[];
  projectsDir?: string;
  dir?: string;
  title?: string;
  columns?: number;
  scale?: number;
  draft?: CharacterProject;
  includeDraft?: boolean;
}): Promise<{
  ok: boolean;
  dir: string;
  htmlPath: string;
  sheetPath: string;
  manifestPath: string;
  paths: string[];
  count: number;
  skipped: string[];
  projectsDir: string;
}> {
  const res = await fetch("/api/showcase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = (await res.json()) as { error?: string };
      if (err.error) detail = err.error;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return res.json();
}

export async function browseFolder(options?: {
  startDir?: string;
  title?: string;
}): Promise<string | null> {
  const res = await fetch("/api/browse-folder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options ?? {}),
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = (await res.json()) as { error?: string };
      if (err.error) detail = err.error;
    } catch {
      // ignore
    }
    throw new Error(`Folder picker failed: ${detail}`);
  }
  const data = (await res.json()) as { ok?: boolean; path?: string; cancelled?: boolean };
  if (!data.ok || !data.path) return null;
  return data.path;
}

export async function exportBundle(payload: {
  preset: string;
  files: ExportFile[];
  dir?: string;
}): Promise<{ path: string; paths: string[]; dir: string }> {
  const res = await fetch("/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = (await res.json()) as { error?: string };
      if (err.error) detail = err.error;
    } catch {
      // ignore
    }
    throw new Error(`Failed to export: ${detail}`);
  }
  return res.json();
}
