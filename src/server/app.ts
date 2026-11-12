import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { serveStatic } from "@hono/node-server/serve-static";
import type { CharacterProject, ExportPresetId } from "../shared/types.js";
import { exportProject } from "../lib/compose.js";
import { pickFolder } from "../lib/folderPicker.js";
import { startMcpHttp, stopMcpHttp } from "../lib/mcpHttpControl.js";
import { getMcpStatus } from "../lib/mcpStatus.js";
import { openPath } from "../lib/openPath.js";
import { buildShowcase } from "../lib/showcase.js";
import { DEV_UI_ORIGINS, checkRequest } from "../shared/requestGuard.js";
import {
  allowDir,
  deleteProjects,
  getWorkspaceSummary,
  loadParts,
  loadProjects,
  partSheetPath,
  resolveOutDir,
  saveProject,
} from "../lib/workspace.js";

export interface CreateAppOptions {
  workspaceRoot: string;
  webRoot?: string;
  dev?: boolean;
  /** Interface the server listens on; non-loopback hosts require `token`. */
  host?: string;
  token?: string;
}

const TOKEN_COOKIE = "easysprite_token";
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function tokenPage(): string {
  return `<!doctype html><meta charset="utf-8"><title>Easy Sprite</title>
<body style="font-family:system-ui;background:#1a1410;color:#f3e7d3;padding:2rem">
<h1>Easy Sprite token required</h1>
<p>Paste the token printed in the terminal that started Easy Sprite.</p>
<form method="get"><input name="token" autocomplete="off" style="width:22rem"> <button>Open</button></form>
</body>`;
}

function safeRelPath(input: string): string {
  const cleaned = input.replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = cleaned.split("/").filter((p) => p && p !== "." && p !== "..");
  return parts.join("/");
}

export function createApp(options: CreateAppOptions): Hono {
  const app = new Hono();
  const { workspaceRoot, webRoot, dev, host = "127.0.0.1", token } = options;
  const guard = { bindHost: host, token, extraOrigins: dev ? DEV_UI_ORIGINS : [] };

  // No CORS: the UI is same-origin. Block cross-site writes, DNS rebinding, and
  // (when listening beyond loopback) any request without the token.
  app.use("*", async (c, next) => {
    const queryToken = c.req.query("token");
    const provided = c.req.header("x-easysprite-token") ?? queryToken ?? getCookie(c, TOKEN_COOKIE);
    const denied = checkRequest(guard, {
      method: c.req.method,
      host: c.req.header("host"),
      origin: c.req.header("origin"),
      token: provided,
    });
    if (denied) {
      if (denied.status === 401 && c.req.method === "GET" && !c.req.path.startsWith("/api/")) {
        return c.html(tokenPage(), 401);
      }
      return c.json({ error: denied.error }, denied.status);
    }
    if (token && queryToken) {
      setCookie(c, TOKEN_COOKIE, queryToken, {
        httpOnly: true,
        sameSite: "Strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    await next();
  });

  app.get("/api/health", (c) => c.json({ ok: true, workspaceRoot }));

  app.get("/api/workspace", async (c) => {
    const summary = await getWorkspaceSummary(workspaceRoot);
    return c.json(summary);
  });

  app.get("/api/mcp", async (c) => {
    const status = await getMcpStatus(workspaceRoot);
    return c.json(status);
  });

  app.post("/api/mcp/http/start", async (c) => {
    try {
      const state = await startMcpHttp(workspaceRoot);
      const status = await getMcpStatus(workspaceRoot);
      return c.json({ ok: true, state, status });
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : "Failed to start MCP HTTP" },
        500,
      );
    }
  });

  app.post("/api/mcp/http/stop", async (c) => {
    try {
      const state = await stopMcpHttp();
      const status = await getMcpStatus(workspaceRoot);
      return c.json({ ok: true, state, status });
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : "Failed to stop MCP HTTP" },
        500,
      );
    }
  });

  app.post("/api/browse-folder", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as {
      startDir?: string;
      title?: string;
    };
    try {
      const chosen = await pickFolder({
        workspaceRoot,
        startDir: body.startDir,
        title: body.title,
      });
      if (!chosen) return c.json({ ok: false, cancelled: true });
      await allowDir(workspaceRoot, chosen);
      return c.json({ ok: true, path: chosen });
    } catch (err) {
      return c.json(
        {
          error: err instanceof Error ? err.message : "Folder picker failed",
        },
        500,
      );
    }
  });

  app.get("/api/parts/:slot/:id/sheet.png", async (c) => {
    const slot = c.req.param("slot");
    const id = c.req.param("id");
    const parts = await loadParts(workspaceRoot);
    const part = parts.find((p) => p.slot === slot && p.id === id);
    if (!part) return c.json({ error: "Part not found" }, 404);

    const sheet = partSheetPath(workspaceRoot, part);
    try {
      const data = await readFile(sheet);
      return new Response(data, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "no-cache",
        },
      });
    } catch {
      return c.json({ error: "Sheet missing" }, 404);
    }
  });

  app.get("/api/projects", async (c) => {
    const dir = c.req.query("dir") || undefined;
    try {
      const projects = await loadProjects(workspaceRoot, dir);
      const resolved = resolveOutDir(workspaceRoot, dir, "projects");
      return c.json({ ok: true, dir: resolved, count: projects.length, projects });
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : "Failed to list projects" },
        400,
      );
    }
  });

  app.delete("/api/projects", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as {
      ids?: string[];
      dir?: string;
      prefix?: string;
    };
    try {
      let ids = body.ids?.filter(Boolean) ?? [];
      if (body.prefix) {
        const all = await loadProjects(workspaceRoot, body.dir);
        const extra = all.filter((p) => p.id.startsWith(body.prefix!)).map((p) => p.id);
        ids = [...new Set([...ids, ...extra])];
      }
      if (!ids.length) return c.json({ error: "ids or prefix required" }, 400);
      const result = await deleteProjects(workspaceRoot, ids, body.dir);
      return c.json({ ok: true, ...result });
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : "Delete failed" },
        400,
      );
    }
  });

  app.post("/api/open-path", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { path?: string };
    if (!body.path?.trim()) return c.json({ error: "path required" }, 400);
    try {
      const result = await openPath(body.path);
      return c.json(result);
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : "Open failed" },
        400,
      );
    }
  });

  app.put("/api/projects/:id", async (c) => {
    const id = c.req.param("id");
    const body = (await c.req.json()) as CharacterProject & { dir?: string };
    if (!body?.name || !body?.selections) {
      return c.json({ error: "Invalid project payload" }, 400);
    }
    try {
      const { project: saved, path: outPath } = await saveProject(
        workspaceRoot,
        {
          ...body,
          id,
          colors: body.colors ?? {},
        },
        body.dir,
      );
      return c.json({ ...saved, path: outPath });
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : "Save failed" },
        400,
      );
    }
  });

  /** Server-side compose + export (same engine the MCP tools use). */
  app.post("/api/export-project", async (c) => {
    const body = (await c.req.json()) as {
      projectId?: string;
      project?: CharacterProject;
      preset?: ExportPresetId;
      dir?: string;
      baseName?: string;
    };
    try {
      const result = await exportProject(workspaceRoot, body);
      return c.json({ ok: true, ...result });
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : "Export failed" },
        400,
      );
    }
  });

  app.post("/api/showcase", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as {
      projectIds?: string[];
      projectsDir?: string;
      dir?: string;
      title?: string;
      columns?: number;
      scale?: number;
      draft?: CharacterProject;
      includeDraft?: boolean;
    };
    try {
      const result = await buildShowcase(workspaceRoot, body);
      return c.json({ ok: true, ...result });
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : "Showcase failed" },
        400,
      );
    }
  });

  app.post("/api/export", async (c) => {
    const body = (await c.req.json()) as {
      filename?: string;
      pngBase64?: string;
      atlas?: unknown;
      files?: Array<{ filename: string; pngBase64?: string; json?: unknown }>;
      preset?: string;
      dir?: string;
    };

    let exportsDir: string;
    try {
      exportsDir = resolveOutDir(workspaceRoot, body.dir, "exports");
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : "Invalid export folder" },
        400,
      );
    }
    await mkdir(exportsDir, { recursive: true });
    const written: string[] = [];

    const writeOne = async (file: {
      filename: string;
      pngBase64?: string;
      json?: unknown;
    }) => {
      const rel = safeRelPath(file.filename);
      if (!rel) throw new Error("Invalid filename");
      const ext = path.extname(rel).toLowerCase();
      let data: Buffer | string;
      if (ext === ".png" && file.pngBase64) {
        const base64 = file.pngBase64.replace(/^data:image\/png;base64,/, "");
        data = Buffer.from(base64, "base64");
        if (!data.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error(`${rel} is not a PNG`);
      } else if (ext === ".json" && file.json !== undefined && !file.pngBase64) {
        data = `${JSON.stringify(file.json, null, 2)}\n`;
      } else {
        throw new Error(`Only .png (PNG data) or .json (JSON data) exports are allowed: ${rel}`);
      }
      const outPath = path.join(exportsDir, rel);
      await mkdir(path.dirname(outPath), { recursive: true });
      await writeFile(outPath, data);
      written.push(outPath);
    };

    try {
      if (body.files?.length) {
        for (const file of body.files) {
          await writeOne(file);
        }
        return c.json({
          ok: true,
          preset: body.preset ?? "custom",
          dir: exportsDir,
          paths: written,
          path: written[0],
        });
      }

      if (!body.pngBase64 || !body.filename) {
        return c.json({ error: "files[] or filename+pngBase64 required" }, 400);
      }

      await writeOne({
        filename: body.filename,
        pngBase64: body.pngBase64,
      });
      if (body.atlas) {
        const atlasName = body.filename.replace(/\.png$/i, ".json");
        await writeOne({ filename: atlasName, json: body.atlas });
      }

      return c.json({ ok: true, dir: exportsDir, path: written[0], paths: written });
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : "Export failed" },
        400,
      );
    }
  });

  if (!dev && webRoot) {
    app.use("/*", serveStatic({ root: webRoot }));
    app.get("*", async (c) => {
      try {
        const html = await readFile(path.join(webRoot, "index.html"));
        return c.html(html.toString("utf8"));
      } catch {
        return c.text(
          "Web UI not built yet. Run npm run build:web or start with --dev.",
          503,
        );
      }
    });
  } else if (dev) {
    app.get("/", (c) =>
      c.html(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Easy Sprite (dev)</title>
  </head>
  <body style="font-family: system-ui; background:#1a1410; color:#f3e7d3; padding:2rem;">
    <h1>Easy Sprite API is running</h1>
    <p>Workspace: <code>${workspaceRoot}</code></p>
    <p>Open the Vite UI at <a href="http://127.0.0.1:5173" style="color:#f0c36a">http://127.0.0.1:5173</a></p>
    <p>API health: <a href="/api/health" style="color:#f0c36a">/api/health</a></p>
  </body>
</html>`),
    );
  }

  return app;
}

export function defaultWebRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../web/dist");
}
