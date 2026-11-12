#!/usr/bin/env node
/**
 * Easy Sprite MCP launcher for Cursor / Claude Desktop (stdio).
 *
 *   node scripts/easysprite-mcp.mjs --install   # copy to ~/.cursor/easysprite-mcp.mjs with this repo as default
 *   node ~/.cursor/easysprite-mcp.mjs           # what the MCP client runs
 *
 * Install folder: EASYSPRITE_HOME, else DEFAULT_HOME below (filled in by --install), else this file's repo.
 * Workspace: EASYSPRITE_WORKSPACE, else the install folder.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_HOME = "";
const here = path.dirname(fileURLToPath(import.meta.url));

if (process.argv.includes("--install")) {
  const repo = path.resolve(here, "..");
  const dest = path.join(os.homedir(), ".cursor", "easysprite-mcp.mjs");
  await mkdir(path.dirname(dest), { recursive: true });
  const src = await readFile(fileURLToPath(import.meta.url), "utf8");
  await writeFile(dest, src.replace('const DEFAULT_HOME = "";', `const DEFAULT_HOME = ${JSON.stringify(repo)};`));
  console.log(`Installed ${dest} (EASYSPRITE_HOME default: ${repo})`);
  process.exit(0);
}

const home = path.resolve(process.env.EASYSPRITE_HOME?.trim() || DEFAULT_HOME || path.resolve(here, ".."));
const tsxCli = path.join(home, "node_modules", "tsx", "dist", "cli.mjs");
const server = path.join(home, "src", "mcp", "server.ts");
if (!existsSync(tsxCli) || !existsSync(server)) {
  console.error(`Easy Sprite not found at ${home}. Set EASYSPRITE_HOME and run npm install there.`);
  process.exit(1);
}

const workspace = process.env.EASYSPRITE_WORKSPACE?.trim() || home;
const child = spawn(process.execPath, [tsxCli, server, "--workspace", workspace, ...process.argv.slice(2)], {
  cwd: home,
  stdio: "inherit",
  env: { ...process.env, EASYSPRITE_WORKSPACE: workspace },
});
child.on("exit", (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
