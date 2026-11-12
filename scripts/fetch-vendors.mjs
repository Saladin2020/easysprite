#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vendorRoot = path.join(root, "vendor");

const REPOS = [
  {
    dir: "universal-lpc-generator",
    url: "https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator.git",
    why: "Modular LPC part library (closest open pack to RPG Maker / Stardew chibi sheets)",
  },
  {
    dir: "pixygoat",
    url: "https://github.com/FosselDev/pixygoat.git",
    why: "Part catalog UX + multi-animation preview + paperdoll export",
  },
  {
    dir: "pixeldoll",
    url: "https://github.com/Shilo/PixelDoll.git",
    why: "Paperdoll layering + engine export patterns",
  },
  {
    dir: "spritebrew",
    url: "https://github.com/GAlbanese09/spritebrew.git",
    why: "Multi-format sprite sheet export ideas",
  },
  {
    dir: "pixabots",
    url: "https://github.com/pablostanley/pixabots.git",
    why: "Compact layered character composer UI",
  },
];

mkdirSync(vendorRoot, { recursive: true });

function run(cmd, args, cwd, env = process.env) {
  const res = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    shell: false,
    env,
  });
  if (res.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} failed with code ${res.status}`);
  }
}

function cloneRepo(url, target) {
  const env = {
    ...process.env,
    GIT_HTTP_VERSION: "1.1",
    GIT_TERMINAL_PROMPT: "0",
  };
  const parent = path.dirname(target);
  try {
    run(
      "git",
      [
        "-c",
        "http.version=HTTP/1.1",
        "-c",
        "http.postBuffer=524288000",
        "clone",
        "--depth",
        "1",
        "--single-branch",
        url,
        target,
      ],
      parent,
      env,
    );
  } catch (err) {
    // ZIP fallback for huge repos / flaky HTTP2
    const zipUrl = url.replace(/\.git$/, "") + "/archive/refs/heads/master.zip";
    const zipPath = `${target}.zip`;
    console.log(`    git clone failed, trying ZIP: ${zipUrl}`);
    run("curl.exe", ["-L", "--http1.1", "-o", zipPath, zipUrl], parent, env);
    mkdirSync(target, { recursive: true });
    run(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `Expand-Archive -Path '${zipPath}' -DestinationPath '${parent}' -Force; $d = Get-ChildItem '${parent}' -Directory | Where-Object { $_.Name -like '*Character-Generator*' -or $_.Name -like '*master*' } | Select-Object -First 1; if ($d -and $d.FullName -ne '${target}') { if (Test-Path '${target}') { Remove-Item '${target}' -Recurse -Force }; Rename-Item $d.FullName '${target}' }; Remove-Item '${zipPath}' -Force`,
      ],
      parent,
      env,
    );
    if (!existsSync(path.join(target, "README.md")) && !existsSync(target)) {
      throw err;
    }
  }
}

const report = [];

for (const repo of REPOS) {
  const target = path.join(vendorRoot, repo.dir);
  console.log(`\n==> ${repo.dir}`);
  console.log(`    ${repo.why}`);

  try {
    if (existsSync(path.join(target, ".git"))) {
      console.log("    already cloned — fetch/pull");
      run("git", ["-C", target, "fetch", "--depth", "1"], root);
      run("git", ["-C", target, "pull", "--ff-only"], root);
      report.push({ ...repo, status: "updated" });
    } else {
      cloneRepo(repo.url, target);
      report.push({ ...repo, status: "cloned" });
    }
  } catch (err) {
    console.error(`    FAILED: ${err instanceof Error ? err.message : err}`);
    report.push({ ...repo, status: "failed", error: String(err) });
  }
}

writeFileSync(
  path.join(vendorRoot, "fetch-report.json"),
  `${JSON.stringify({ fetchedAt: new Date().toISOString(), repos: report }, null, 2)}\n`,
);

console.log("\nDone. See vendor/REFERENCES.md");
const failed = report.filter((r) => r.status === "failed");
if (failed.length) process.exitCode = 1;
