import { access, writeFile } from "node:fs/promises";
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
  return path.join(os.homedir(), "Desktop");
}

/** Write start-desktop.bat next to the package (or reuse scripts/). */
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

/**
 * Create a Windows .lnk on the user Desktop that runs the bat launcher.
 * No-ops with a message on non-Windows.
 */
export async function installDesktopShortcut(options: {
  pkgRoot: string;
  workspace: string;
}): Promise<{ shortcutPath: string; batPath: string }> {
  if (process.platform !== "win32") {
    throw new Error("Desktop shortcut install is currently Windows-only");
  }
  const batPath = await ensureDesktopBat(options.pkgRoot);
  const shortcutPath = path.join(desktopDir(), "Easy Sprite.lnk");
  const workDir = options.pkgRoot;
  const ps = `
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut(${JSON.stringify(shortcutPath)})
$sc.TargetPath = ${JSON.stringify(batPath)}
$sc.WorkingDirectory = ${JSON.stringify(workDir)}
$sc.WindowStyle = 1
$sc.Description = "Easy Sprite — compose pixel characters"
$sc.Save()
`;
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let err = "";
    child.stderr.on("data", (c) => {
      err += String(c);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(err.trim() || `powershell exited ${code}`));
    });
  });
  if (!(await exists(shortcutPath))) {
    throw new Error(`Shortcut was not created at ${shortcutPath}`);
  }
  return { shortcutPath, batPath };
}
