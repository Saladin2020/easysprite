import { access, chmod, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

export function desktopDir(): string {
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Desktop");
  }
  if (process.platform === "linux") {
    return process.env.XDG_DESKTOP_DIR?.trim() || path.join(os.homedir(), "Desktop");
  }
  return path.join(os.homedir(), "Desktop");
}

export async function ensureDesktopBat(pkgRoot: string): Promise<string> {
  const batPath = path.join(pkgRoot, "scripts", "start-desktop.bat");
  const contents = `@echo off
setlocal
title Easy Sprite
cd /d "%~dp0.."
if defined EASYSPRITE_HOME (
  set "WS=%EASYSPRITE_HOME%"
) else (
  set "WS=%cd%"
)
echo.
echo  Easy Sprite — desktop launcher
echo  Workspace: %WS%
echo  Close this window to stop the server.
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js not found. Install Node 20+ then try again.
  pause
  exit /b 1
)
if exist "node_modules\\tsx\\dist\\cli.mjs" (
  node "node_modules\\tsx\\dist\\cli.mjs" src\\cli.ts desktop --workspace "%WS%"
) else if exist "dist\\cli.js" (
  node dist\\cli.js desktop --workspace "%WS%"
) else (
  npx --yes tsx src/cli.ts desktop --workspace "%WS%"
)
echo.
pause
`;
  await writeFile(batPath, contents, "utf8");
  return batPath;
}

export async function ensureDesktopShell(pkgRoot: string): Promise<string> {
  const shPath = path.join(pkgRoot, "scripts", "start-desktop.sh");
  const contents = `#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
WS="\${EASYSPRITE_HOME:-$PWD}"
echo ""
echo " Easy Sprite — desktop launcher"
echo " Workspace: $WS"
echo " Close this terminal to stop the server."
echo ""
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found. Install Node 20+ then try again."
  exit 1
fi
if [[ -f node_modules/tsx/dist/cli.mjs ]]; then
  exec node node_modules/tsx/dist/cli.mjs src/cli.ts desktop --workspace "$WS"
elif [[ -f dist/cli.js ]]; then
  exec node dist/cli.js desktop --workspace "$WS"
else
  exec npx --yes tsx src/cli.ts desktop --workspace "$WS"
fi
`;
  await writeFile(shPath, contents, "utf8");
  await chmod(shPath, 0o755);
  return shPath;
}

async function run(cmd: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    child.stderr.on("data", (c) => {
      err += String(c);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(err.trim() || `${cmd} exited ${code}`));
    });
  });
}

async function installWindows(pkgRoot: string): Promise<{ shortcutPath: string; launcherPath: string }> {
  const batPath = await ensureDesktopBat(pkgRoot);
  const shortcutPath = path.join(desktopDir(), "Easy Sprite.lnk");
  const ps = `
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut(${JSON.stringify(shortcutPath)})
$sc.TargetPath = ${JSON.stringify(batPath)}
$sc.WorkingDirectory = ${JSON.stringify(pkgRoot)}
$sc.WindowStyle = 1
$sc.Description = "Easy Sprite — compose pixel characters"
$sc.Save()
`;
  await run("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps]);
  if (!(await exists(shortcutPath))) throw new Error(`Shortcut was not created at ${shortcutPath}`);
  return { shortcutPath, launcherPath: batPath };
}

async function installMac(pkgRoot: string): Promise<{ shortcutPath: string; launcherPath: string }> {
  const shPath = await ensureDesktopShell(pkgRoot);
  const commandPath = path.join(desktopDir(), "Easy Sprite.command");
  const body = `#!/bin/bash
cd ${JSON.stringify(pkgRoot)}
exec ${JSON.stringify(shPath)}
`;
  await writeFile(commandPath, body, "utf8");
  await chmod(commandPath, 0o755);
  // Clear quarantine if present (best-effort)
  try {
    await run("xattr", ["-d", "com.apple.quarantine", commandPath]);
  } catch {
    // ignore
  }
  return { shortcutPath: commandPath, launcherPath: shPath };
}

async function installLinux(pkgRoot: string): Promise<{ shortcutPath: string; launcherPath: string }> {
  const shPath = await ensureDesktopShell(pkgRoot);
  const icon = path.join(pkgRoot, "web", "public", "icon-512.png");
  const desk = desktopDir();
  await mkdir(desk, { recursive: true });
  const shortcutPath = path.join(desk, "Easy Sprite.desktop");
  const contents = `[Desktop Entry]
Type=Application
Version=1.0
Name=Easy Sprite
Comment=Compose modular pixel-art characters
Exec=${JSON.stringify(shPath)}
Path=${pkgRoot}
Icon=${(await exists(icon)) ? icon : ""}
Terminal=true
Categories=Graphics;Development;
StartupNotify=true
`;
  await writeFile(shortcutPath, contents, "utf8");
  await chmod(shortcutPath, 0o755);
  // Also install into applications menu when possible
  try {
    const apps = path.join(os.homedir(), ".local", "share", "applications");
    await mkdir(apps, { recursive: true });
    await writeFile(path.join(apps, "easysprite.desktop"), contents, "utf8");
  } catch {
    // ignore
  }
  return { shortcutPath, launcherPath: shPath };
}

/**
 * Create a Desktop launcher for the current OS (Windows / macOS / Linux).
 * iOS uses the web UI / PWA — no native desktop shortcut API.
 */
export async function installDesktopShortcut(options: {
  pkgRoot: string;
  workspace: string;
}): Promise<{ shortcutPath: string; launcherPath: string; platform: string }> {
  const { pkgRoot } = options;
  if (process.platform === "win32") {
    const r = await installWindows(pkgRoot);
    return { ...r, platform: "windows" };
  }
  if (process.platform === "darwin") {
    const r = await installMac(pkgRoot);
    return { ...r, platform: "macos" };
  }
  if (process.platform === "linux") {
    const r = await installLinux(pkgRoot);
    return { ...r, platform: "linux" };
  }
  throw new Error(
    `Desktop shortcut is not supported on ${process.platform}. On iPhone/iPad open the web UI in Safari → Share → Add to Home Screen.`,
  );
}
