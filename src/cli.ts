#!/usr/bin/env node
import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { Command } from "commander";
import open from "open";
import { createApp, defaultWebRoot } from "./server/app.js";
import { installDesktopShortcut } from "./lib/desktopShortcut.js";
import { initWorkspace, resolveWorkspace } from "./lib/workspace.js";

const program = new Command();
const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function defaultWorkspace(cliValue?: string): string {
  const fromCli = cliValue?.trim();
  if (fromCli) return resolveWorkspace(fromCli);
  const fromEnv = process.env.EASYSPRITE_HOME?.trim() || process.env.EASYSPRITE_WORKSPACE?.trim();
  if (fromEnv) return resolveWorkspace(fromEnv);
  return resolveWorkspace(process.cwd());
}

program
  .name("easysprite")
  .description("Compose modular pixel-art character sprites locally")
  .version("0.1.0");

program
  .command("init")
  .description("Create parts/projects/exports folders and sample parts")
  .option("--force-samples", "Regenerate sample parts even if parts exist")
  .action(async (opts: { forceSamples?: boolean }) => {
    const root = await initWorkspace(process.cwd(), { forceSamples: opts.forceSamples });
    console.log(`Initialized Easy Sprite workspace at ${root}`);
    console.log("  parts/     modular sprite sheets");
    console.log("  projects/  saved character selections");
    console.log("  exports/   exported sheets");
  });

program
  .command("mcp")
  .description("Start the MCP server (stdio by default; use --http for remote clients)")
  .option("--http", "Serve Streamable HTTP instead of stdio")
  .option("-p, --port <port>", "HTTP port", "8790")
  .option("--host <host>", "HTTP host", "127.0.0.1")
  .option("--workspace <path>", "Workspace directory", process.cwd())
  .action(async (opts: { http?: boolean; port: string; host: string; workspace: string }) => {
    const { startMcp } = await import("./mcp/server.js");
    await startMcp({
      workspace: resolveWorkspace(opts.workspace),
      http: Boolean(opts.http),
      host: opts.host,
      port: Number(opts.port),
    });
  });

program
  .command("showcase")
  .description("Build an HTML + PNG cast showcase into a folder")
  .option("--workspace <path>", "Workspace directory", process.cwd())
  .option("--dir <path>", "Output folder (default: exports/showcase)")
  .option("--projects-dir <path>", "Folder of project JSON (default: projects/)")
  .option("--ids <ids>", "Comma-separated project ids (default: all)")
  .option("--title <title>", "Showcase title")
  .option("--columns <n>", "Grid columns", "5")
  .option("--open", "Open the HTML showcase after building")
  .action(
    async (opts: {
      workspace: string;
      dir?: string;
      projectsDir?: string;
      ids?: string;
      title?: string;
      columns: string;
      open?: boolean;
    }) => {
      const { buildShowcase } = await import("./lib/showcase.js");
      const root = resolveWorkspace(opts.workspace);
      const result = await buildShowcase(root, {
        dir: opts.dir,
        projectsDir: opts.projectsDir,
        title: opts.title,
        columns: Number(opts.columns),
        projectIds: opts.ids
          ? opts.ids.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean)
          : undefined,
      });
      console.log(`Showcase ${result.count} characters → ${result.dir}`);
      console.log(`  Source ${result.projectsDir}`);
      console.log(`  HTML   ${result.htmlPath}`);
      console.log(`  Sheet  ${result.sheetPath}`);
      if (result.skipped.length) {
        console.log(`  Skipped missing ids: ${result.skipped.join(", ")}`);
      }
      if (opts.open) {
        const { openPath } = await import("./lib/openPath.js");
        await openPath(result.htmlPath);
      }
    },
  );

async function runServe(opts: {
  port: string;
  host: string;
  open: boolean;
  dev?: boolean;
  workspace: string;
}): Promise<void> {
  const workspaceRoot = defaultWorkspace(opts.workspace);
  await initWorkspace(workspaceRoot);

  const port = Number(opts.port);
  const host = opts.host;
  const webRoot = defaultWebRoot();
  const hasWebBuild = await pathExists(path.join(webRoot, "index.html"));
  const useDev = Boolean(opts.dev) || !hasWebBuild;

  if (!opts.dev && !hasWebBuild) {
    console.log("web/dist missing — starting in --dev mode (Vite).");
    console.log("Tip: npm run build  for a single-port production UI.");
  }

  const app = createApp({
    workspaceRoot,
    webRoot,
    dev: useDev,
  });

  serve({ fetch: app.fetch, hostname: host, port }, async (info) => {
    const apiUrl = `http://${host}:${info.port}`;
    console.log(`Easy Sprite API  ${apiUrl}`);
    console.log(`Workspace        ${workspaceRoot}`);

    if (useDev) {
      const webDir = path.join(pkgRoot, "web");
      const viteBin = path.join(pkgRoot, "node_modules", "vite", "bin", "vite.js");
      console.log("Starting Vite UI on http://127.0.0.1:5173 ...");
      const child = spawn(
        process.execPath,
        [viteBin, "--config", "vite.config.ts", "--host", "127.0.0.1", "--port", "5173"],
        {
          cwd: webDir,
          stdio: "inherit",
          env: {
            ...process.env,
            EASYSPRITE_API: apiUrl,
          },
        },
      );
      child.on("error", (err) => {
        console.error("Failed to start Vite:", err.message);
        console.error(`Try manually: npx vite --config web/vite.config.ts`);
      });
      child.on("exit", (code) => {
        if (code) process.exitCode = code;
      });
      if (opts.open) {
        setTimeout(() => {
          void open("http://127.0.0.1:5173");
        }, 1200);
      }
    } else {
      const uiUrl = apiUrl;
      console.log(`Web UI           ${uiUrl}`);
      if (opts.open) {
        void open(uiUrl);
      }
    }
  });
}

program
  .command("serve")
  .description("Start local web UI and API")
  .option("-p, --port <port>", "Port", "8787")
  .option("--host <host>", "Host", "127.0.0.1")
  .option("--no-open", "Do not open the browser")
  .option("--dev", "Run API only and expect Vite on :5173")
  .option("--workspace <path>", "Workspace directory")
  .action(async (opts) => {
    await runServe({
      port: opts.port,
      host: opts.host,
      open: opts.open,
      dev: opts.dev,
      workspace: opts.workspace,
    });
  });

program
  .command("desktop")
  .description("Run Easy Sprite as a desktop app (opens browser; optional Desktop shortcut)")
  .option("-p, --port <port>", "Port", "8787")
  .option("--host <host>", "Host", "127.0.0.1")
  .option("--no-open", "Do not open the browser")
  .option("--dev", "Force Vite dev UI")
  .option("--workspace <path>", "Workspace directory (default: EASYSPRITE_HOME or cwd)")
  .option("--install-shortcut", "Create/update an Easy Sprite icon on the Windows Desktop")
  .option("--shortcut-only", "Only create the Desktop shortcut (do not start the server)")
  .action(
    async (opts: {
      port: string;
      host: string;
      open: boolean;
      dev?: boolean;
      workspace?: string;
      installShortcut?: boolean;
      shortcutOnly?: boolean;
    }) => {
      const workspace = defaultWorkspace(opts.workspace);
      const wantShortcut = Boolean(opts.installShortcut || opts.shortcutOnly);
      if (wantShortcut) {
        try {
          const { shortcutPath, launcherPath, platform } = await installDesktopShortcut({
            pkgRoot,
            workspace,
          });
          console.log(`Platform          ${platform}`);
          console.log(`Desktop shortcut  ${shortcutPath}`);
          console.log(`Launcher          ${launcherPath}`);
          if (platform !== "windows" && platform !== "macos" && platform !== "linux") {
            console.log("iOS/iPadOS: open the web UI in Safari → Share → Add to Home Screen");
          }
        } catch (err) {
          console.error(err instanceof Error ? err.message : String(err));
          process.exitCode = 1;
          return;
        }
      }

      if (opts.shortcutOnly) return;

      console.log("Starting Easy Sprite for desktop use…");
      console.log("Close this terminal window (or Ctrl+C) to stop.");
      await runServe({
        port: opts.port,
        host: opts.host,
        open: opts.open,
        dev: opts.dev,
        workspace,
      });
    },
  );

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
