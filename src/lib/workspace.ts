import { readFileSync } from "node:fs";
import { access, mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_CONFIG,
  type CharacterProject,
  type EasySpriteConfig,
  type PartMeta,
  type WorkspaceSummary,
} from "../shared/types.js";
import { demoProjects } from "./demoProjects.js";
import { writeSampleParts } from "./sampleParts.js";

const CONFIG_NAME = "easysprite.config.json";
/** Folders the user picked in the native dialog; writes outside the workspace must be under one. */
const ALLOWED_DIRS_NAME = "easysprite.allowed-dirs.json";
const SAFE_ID = /^[a-z0-9_-]+$/;

/** Project ids become file names, so only allow `a-z 0-9 _ -`. */
export function assertSafeId(id: unknown, label = "project id"): string {
  if (typeof id !== "string" || !SAFE_ID.test(id)) {
    throw new Error(`Invalid ${label} ${JSON.stringify(id)} (use a-z, 0-9, _ or -)`);
  }
  return id;
}

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

export function resolveWorkspace(cwd = process.cwd()): string {
  return path.resolve(cwd);
}

export async function initWorkspace(cwd = process.cwd(), options?: { forceSamples?: boolean }): Promise<string> {
  const root = resolveWorkspace(cwd);
  const partsDir = path.join(root, "parts");
  const projectsDir = path.join(root, "projects");
  const exportsDir = path.join(root, "exports");

  await mkdir(partsDir, { recursive: true });
  await mkdir(projectsDir, { recursive: true });
  await mkdir(exportsDir, { recursive: true });

  const configPath = path.join(root, CONFIG_NAME);
  if (!(await exists(configPath)) || options?.forceSamples) {
    await writeFile(configPath, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`);
  }

  const hasParts = (await readdir(partsDir)).length > 0;
  if (!hasParts || options?.forceSamples) {
    await writeSampleParts(root);
  }

  // Seed demo characters on first run (empty projects/) or when samples are forced.
  const hasProjects = (await readdir(projectsDir)).some((f) => f.endsWith(".json"));
  if (!hasProjects || options?.forceSamples) {
    for (const demo of demoProjects()) {
      await writeFile(path.join(projectsDir, `${demo.id}.json`), `${JSON.stringify(demo, null, 2)}\n`);
    }
  }

  return root;
}

export async function loadConfig(root: string): Promise<EasySpriteConfig> {
  const configPath = path.join(root, CONFIG_NAME);
  if (!(await exists(configPath))) {
    return DEFAULT_CONFIG;
  }
  const raw = await readFile(configPath, "utf8");
  const parsed = JSON.parse(raw) as Partial<EasySpriteConfig>;
  const slots = (parsed.slots?.length ? parsed.slots : DEFAULT_CONFIG.slots).map((slot) => {
    const fallback = DEFAULT_CONFIG.slots.find((s) => s.id === slot.id);
    return {
      ...fallback,
      ...slot,
      recolorDefault: slot.recolorDefault ?? fallback?.recolorDefault,
    };
  });
  return {
    ...DEFAULT_CONFIG,
    ...parsed,
    slots,
    directions: parsed.directions?.length ? parsed.directions : DEFAULT_CONFIG.directions,
    frames: parsed.frames?.length ? parsed.frames : DEFAULT_CONFIG.frames,
  };
}

export async function loadParts(root: string): Promise<PartMeta[]> {
  const partsRoot = path.join(root, "parts");
  if (!(await exists(partsRoot))) return [];

  const parts: PartMeta[] = [];
  const slots = await readdir(partsRoot, { withFileTypes: true });

  for (const slotDir of slots) {
    if (!slotDir.isDirectory()) continue;
    const slotPath = path.join(partsRoot, slotDir.name);
    const partDirs = await readdir(slotPath, { withFileTypes: true });

    for (const partDir of partDirs) {
      if (!partDir.isDirectory()) continue;
      const metaPath = path.join(slotPath, partDir.name, "part.json");
      if (!(await exists(metaPath))) continue;
      const meta = JSON.parse(await readFile(metaPath, "utf8")) as PartMeta;
      parts.push(meta);
    }
  }

  return parts.sort((a, b) => a.zIndex - b.zIndex || a.name.localeCompare(b.name));
}

export async function loadProjects(
  root: string,
  dir?: string,
): Promise<CharacterProject[]> {
  const projectsDir = resolveOutDir(root, dir, "projects");
  if (!(await exists(projectsDir))) return [];

  const files = (await readdir(projectsDir)).filter((f) => f.endsWith(".json"));
  const projects: CharacterProject[] = [];

  for (const file of files) {
    try {
      const raw = await readFile(path.join(projectsDir, file), "utf8");
      const parsed = JSON.parse(raw) as CharacterProject;
      if (!parsed?.id || !parsed?.selections) continue;
      projects.push(parsed);
    } catch {
      // skip corrupt JSON
    }
  }

  return projects.sort((a, b) => a.name.localeCompare(b.name, "th"));
}

/** Delete saved project JSON files from a projects folder. */
export async function deleteProjects(
  root: string,
  ids: string[],
  dir?: string,
): Promise<{ deleted: string[]; missing: string[]; dir: string }> {
  const projectsDir = resolveOutDir(root, dir, "projects");
  const deleted: string[] = [];
  const missing: string[] = [];
  for (const id of ids) {
    const slug = id.trim();
    if (!SAFE_ID.test(slug)) {
      missing.push(id);
      continue;
    }
    const file = path.join(projectsDir, `${slug}.json`);
    try {
      await unlink(file);
      deleted.push(slug);
    } catch {
      missing.push(slug);
    }
  }
  return { deleted, missing, dir: projectsDir };
}

/** Resolve a folder without access checks (absolute stays absolute; relative is under the workspace). */
export function resolvePath(root: string, dir: string | undefined, fallbackRel: string): string {
  const raw = (dir ?? "").trim() || fallbackRel;
  return path.isAbsolute(raw) ? path.normalize(raw) : path.resolve(root, raw);
}

function isInside(base: string, target: string): boolean {
  const norm = (p: string) => (process.platform === "win32" ? path.resolve(p).toLowerCase() : path.resolve(p));
  const rel = path.relative(norm(base), norm(target));
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/** Workspace + folders picked in the dialog + `EASYSPRITE_ALLOWED_DIRS` (path-delimiter separated). */
export function allowedRoots(root: string): string[] {
  const roots = [path.resolve(root)];
  try {
    const saved = JSON.parse(readFileSync(path.join(root, ALLOWED_DIRS_NAME), "utf8")) as unknown;
    if (Array.isArray(saved)) roots.push(...saved.filter((d): d is string => typeof d === "string"));
  } catch {
    // no picked folders yet
  }
  const env = process.env.EASYSPRITE_ALLOWED_DIRS;
  if (env) roots.push(...env.split(path.delimiter).filter(Boolean));
  return roots;
}

/** Remember a folder the user explicitly picked so later saves/exports may use it. */
export async function allowDir(root: string, dir: string): Promise<void> {
  const resolved = path.resolve(dir);
  if (allowedRoots(root).some((r) => isInside(r, resolved))) return;
  const file = path.join(root, ALLOWED_DIRS_NAME);
  let saved: string[] = [];
  try {
    saved = JSON.parse(await readFile(file, "utf8")) as string[];
  } catch {
    saved = [];
  }
  await writeFile(file, `${JSON.stringify([...saved, resolved], null, 2)}\n`);
}

/** Resolve a folder for reading/writing projects or exports; must be inside an allowed root. */
export function resolveOutDir(root: string, dir: string | undefined, fallbackRel: string): string {
  const resolved = resolvePath(root, dir, fallbackRel);
  if (!allowedRoots(root).some((r) => isInside(r, resolved))) {
    throw new Error(
      `Folder not allowed: ${resolved}. Use the workspace, pick it with Browse, or add it to EASYSPRITE_ALLOWED_DIRS.`,
    );
  }
  return resolved;
}

export async function saveProject(
  root: string,
  project: CharacterProject,
  dir?: string,
): Promise<{ project: CharacterProject; path: string }> {
  assertSafeId(project.id);
  const projectsDir = resolveOutDir(root, dir, "projects");
  await mkdir(projectsDir, { recursive: true });
  const next: CharacterProject = {
    ...project,
    updatedAt: new Date().toISOString(),
  };
  const outPath = path.join(projectsDir, `${project.id}.json`);
  await writeFile(outPath, `${JSON.stringify(next, null, 2)}\n`);
  return { project: next, path: outPath };
}

export function partSheetPath(root: string, part: PartMeta): string {
  return path.join(root, "parts", part.slot, part.id, part.sheet);
}

export async function getWorkspaceSummary(root: string): Promise<WorkspaceSummary> {
  const [config, parts, projects] = await Promise.all([
    loadConfig(root),
    loadParts(root),
    loadProjects(root),
  ]);

  return {
    root,
    config,
    parts,
    projects,
    projectsDir: path.join(root, "projects"),
    exportsDir: path.join(root, "exports"),
  };
}
