import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";
import { resolveOutDir } from "./workspace.js";

const execFileAsync = promisify(execFile);

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function powershellEscape(value: string): string {
  return value.replace(/'/g, "''");
}

async function pickWindows(startDir: string, title: string): Promise<string | null> {
  const script = `
Add-Type -AssemblyName System.Windows.Forms | Out-Null
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = '${powershellEscape(title)}'
$dialog.ShowNewFolderButton = $true
$start = '${powershellEscape(startDir)}'
if ($start -and (Test-Path -LiteralPath $start)) { $dialog.SelectedPath = $start }
$form = New-Object System.Windows.Forms.Form
$form.TopMost = $true
$form.ShowInTaskbar = $false
$form.WindowState = 'Minimized'
$form.Opacity = 0
[void]$form.Show()
$form.Activate()
$result = $dialog.ShowDialog($form)
$form.Close()
$form.Dispose()
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
  Write-Output $dialog.SelectedPath
}
`;
  const { stdout } = await execFileAsync(
    "powershell.exe",
    ["-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-Command", script],
    { windowsHide: true, maxBuffer: 1024 * 1024 },
  );
  const chosen = stdout.trim();
  return chosen || null;
}

async function pickMac(startDir: string, title: string): Promise<string | null> {
  const script = `
set defaultFolder to POSIX file "${startDir.replace(/\\/g, "/").replace(/"/g, '\\"')}"
try
  set chosen to choose folder with prompt "${title.replace(/"/g, '\\"')}" default location defaultFolder
  return POSIX path of chosen
on error
  return ""
end try
`;
  const { stdout } = await execFileAsync("osascript", ["-e", script], {
    maxBuffer: 1024 * 1024,
  });
  const chosen = stdout.trim().replace(/\/$/, "");
  return chosen || null;
}

async function pickLinux(startDir: string, title: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      "zenity",
      ["--file-selection", "--directory", `--title=${title}`, `--filename=${startDir}${path.sep}`],
      { maxBuffer: 1024 * 1024 },
    );
    const chosen = stdout.trim();
    return chosen || null;
  } catch {
    return null;
  }
}

/** Open a native folder dialog on the machine running the API. */
export async function pickFolder(options: {
  workspaceRoot: string;
  startDir?: string;
  title?: string;
}): Promise<string | null> {
  const title = options.title ?? "Choose folder";
  let start = resolveOutDir(options.workspaceRoot, options.startDir, ".");
  if (!(await exists(start))) start = options.workspaceRoot;

  if (process.platform === "win32") return pickWindows(start, title);
  if (process.platform === "darwin") return pickMac(start, title);
  return pickLinux(start, title);
}
