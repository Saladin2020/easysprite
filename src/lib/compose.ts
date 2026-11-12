import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";
import {
  ANIM_PRESETS,
  type AnimFrame,
  type Build,
  type CharacterProject,
  type Direction,
  type ExportPresetId,
  type PartMeta,
  type PartSlot,
  isSpecies,
} from "../shared/types.js";
import { encodePng } from "./png.js";
import { recolorRgba } from "./recolor.js";
import { assertSafeId, loadConfig, loadParts, partSheetPath, resolveOutDir, saveProject } from "./workspace.js";

export function directionRow(part: PartMeta, direction: Direction, bodyType?: Build): number {
  const idx = Math.max(0, part.directions.indexOf(direction));
  const group = bodyType && part.bodyTypes ? Math.max(0, part.bodyTypes.indexOf(bodyType)) : 0;
  return group * part.directions.length + idx;
}

export function bodyTypeOf(
  parts: PartMeta[],
  project: Pick<CharacterProject, "selections">,
): Build | undefined {
  return parts.find((p) => p.slot === "body" && project.selections.body === p.id)?.bodyType;
}

export function fitsBuild(part: PartMeta, build: Build | undefined): boolean {
  if (part.slot === "body" || !build) return true;
  if (part.bodyTypes) return part.bodyTypes.includes(build);
  return !isSpecies(build);
}

export function frameCol(part: PartMeta, frame: AnimFrame): number {
  const idx = part.frames.indexOf(frame);
  return idx >= 0 ? idx : 0;
}

interface DecodedSheet {
  width: number;
  height: number;
  /** RGBA */
  data: Uint8Array;
}

const sheetCache = new Map<string, DecodedSheet>();

async function loadSheet(root: string, part: PartMeta): Promise<DecodedSheet> {
  const file = partSheetPath(root, part);
  const cached = sheetCache.get(file);
  if (cached) return cached;
  const buf = await readFile(file);
  const png = PNG.sync.read(buf);
  const decoded: DecodedSheet = {
    width: png.width,
    height: png.height,
    data: new Uint8Array(png.data.buffer, png.data.byteOffset, png.data.byteLength),
  };
  sheetCache.set(file, decoded);
  return decoded;
}

function tintedCopy(sheet: DecodedSheet, part: PartMeta, tint: string): DecodedSheet {
  const data = new Uint8Array(sheet.data);
  recolorRgba(data, part.recolor!.base, tint, part.recolor!.tolerance ?? 70);
  return { width: sheet.width, height: sheet.height, data };
}

function blitCell(
  dest: Uint8Array,
  destW: number,
  destX: number,
  destY: number,
  src: DecodedSheet,
  sx: number,
  sy: number,
  size: number,
): void {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const si = ((sy + y) * src.width + (sx + x)) * 4;
      const a = src.data[si + 3]!;
      if (a === 0) continue;
      const di = ((destY + y) * destW + (destX + x)) * 4;
      if (a === 255) {
        dest[di] = src.data[si]!;
        dest[di + 1] = src.data[si + 1]!;
        dest[di + 2] = src.data[si + 2]!;
        dest[di + 3] = 255;
      } else {
        const inv = 255 - a;
        dest[di] = Math.round((src.data[si]! * a + dest[di]! * inv) / 255);
        dest[di + 1] = Math.round((src.data[si + 1]! * a + dest[di + 1]! * inv) / 255);
        dest[di + 2] = Math.round((src.data[si + 2]! * a + dest[di + 2]! * inv) / 255);
        dest[di + 3] = Math.min(255, a + Math.round((dest[di + 3]! * inv) / 255));
      }
    }
  }
}

function tintForPart(
  part: PartMeta,
  colors: CharacterProject["colors"] | undefined,
): string | null {
  if (!part.recolor?.enabled) return null;
  const chosen = colors?.[part.slot];
  if (!chosen || chosen.toLowerCase() === part.recolor.base.toLowerCase()) return null;
  return chosen;
}

export function selectedLayers(
  parts: PartMeta[],
  project: Pick<CharacterProject, "selections">,
): PartMeta[] {
  const build = bodyTypeOf(parts, project);
  return parts
    .filter((p) => project.selections[p.slot] === p.id && fitsBuild(p, build))
    .sort((a, b) => a.zIndex - b.zIndex);
}

export async function renderSheetPixels(
  root: string,
  parts: PartMeta[],
  project: CharacterProject,
  directions: Direction[],
  frames: AnimFrame[],
  frameSize: number,
): Promise<{ width: number; height: number; pixels: Uint8Array }> {
  const build = bodyTypeOf(parts, project);
  const layers = selectedLayers(parts, project);
  if (!layers.length) throw new Error("No drawable parts selected (need at least a body)");

  const sheets = await Promise.all(
    layers.map(async (part) => {
      const sheet = await loadSheet(root, part);
      const tint = tintForPart(part, project.colors);
      return tint ? tintedCopy(sheet, part, tint) : sheet;
    }),
  );

  const width = frameSize * frames.length;
  const height = frameSize * directions.length;
  const pixels = new Uint8Array(width * height * 4);

  directions.forEach((direction, row) => {
    frames.forEach((frame, col) => {
      const dx = col * frameSize;
      const dy = row * frameSize;
      layers.forEach((part, i) => {
        blitCell(
          pixels,
          width,
          dx,
          dy,
          sheets[i]!,
          frameCol(part, frame) * part.frameSize,
          directionRow(part, direction, build) * part.frameSize,
          part.frameSize,
        );
      });
    });
  });

  return { width, height, pixels };
}

function projectMeta(project: CharacterProject) {
  return {
    id: project.id,
    name: project.name,
    selections: project.selections,
    colors: project.colors ?? {},
  };
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 48) || "character"
  );
}

export interface ExportFile {
  filename: string;
  png?: Buffer;
  json?: unknown;
}

export async function buildExportFiles(options: {
  root: string;
  parts: PartMeta[];
  project: CharacterProject;
  preset: ExportPresetId;
  baseName?: string;
}): Promise<{ preset: ExportPresetId; files: ExportFile[]; primary: string }> {
  const { root, parts, project, preset } = options;
  const config = await loadConfig(root);
  // Prefer id over display name — Thai names slugify to junk (e.g. "ลุง… (MCP)" → "mcp").
  const baseName =
    slugify(options.baseName || "") ||
    slugify(project.id) ||
    slugify(project.name) ||
    "character";
  const frameSize = config.frameSize;

  const writeGrid = async (directions: Direction[], frames: AnimFrame[], prefix: string) => {
    const { width, height, pixels } = await renderSheetPixels(
      root,
      parts,
      project,
      directions,
      frames,
      frameSize,
    );
    return {
      png: encodePng(width, height, pixels),
      width,
      height,
      prefix,
      directions,
      frames,
    };
  };

  if (preset === "rpgmaker_mv") {
    const grid = await writeGrid(
      ["front", "left", "right", "back"],
      ["walk0", "walk1", "walk2"],
      `rpgmaker/${baseName}`,
    );
    return {
      preset,
      primary: `${grid.prefix}.png`,
      files: [
        { filename: `${grid.prefix}.png`, png: grid.png },
        {
          filename: `${grid.prefix}.json`,
          json: {
            format: "rpgmaker_mv",
            frameSize,
            columns: 3,
            rows: 4,
            directions: ["down", "left", "right", "up"],
            frames: ["left_step", "idle", "right_step"],
            project: projectMeta(project),
          },
        },
      ],
    };
  }

  if (preset === "frames") {
    const files: ExportFile[] = [];
    const index: Array<{ direction: Direction; frame: AnimFrame; file: string }> = [];
    for (const dir of config.directions) {
      for (const fr of config.frames) {
        const { pixels } = await renderSheetPixels(root, parts, project, [dir], [fr], frameSize);
        const file = `frames/${baseName}/${dir}_${fr}.png`;
        files.push({ filename: file, png: encodePng(frameSize, frameSize, pixels) });
        index.push({ direction: dir, frame: fr, file });
      }
    }
    files.push({
      filename: `frames/${baseName}/atlas.json`,
      json: {
        format: "easysprite.frames",
        frameSize,
        frames: index,
        project: projectMeta(project),
      },
    });
    return { preset, primary: `frames/${baseName}/`, files };
  }

  const grid = await writeGrid(config.directions, config.frames, preset === "godot" ? `godot/${baseName}` : baseName);
  if (preset === "godot") {
    const sprites: Record<string, { frame: { x: number; y: number; w: number; h: number } }> = {};
    config.directions.forEach((dir, row) => {
      config.frames.forEach((fr, col) => {
        sprites[`${dir}_${fr}`] = {
          frame: { x: col * frameSize, y: row * frameSize, w: frameSize, h: frameSize },
        };
      });
    });
    return {
      preset,
      primary: `${grid.prefix}.png`,
      files: [
        { filename: `${grid.prefix}.png`, png: grid.png },
        {
          filename: `${grid.prefix}.json`,
          json: {
            format: "godot_atlas",
            textures: [
              {
                image: `${baseName}.png`,
                size: { w: grid.width, h: grid.height },
                sprites,
              },
            ],
            animations: Object.fromEntries(
              ANIM_PRESETS.map((anim) => [
                anim.id,
                {
                  directions: config.directions,
                  frames: anim.frames.filter((f) => config.frames.includes(f)),
                  speed: Math.round(1000 / anim.ms),
                  loop: anim.loop,
                },
              ]),
            ),
            project: projectMeta(project),
          },
        },
      ],
    };
  }

  return {
    preset: "native",
    primary: `${grid.prefix}.png`,
    files: [
      { filename: `${grid.prefix}.png`, png: grid.png },
      {
        filename: `${grid.prefix}.json`,
        json: {
          format: "easysprite.native",
          frameSize,
          columns: config.frames.length,
          rows: config.directions.length,
          directions: config.directions,
          frames: config.frames,
          project: projectMeta(project),
        },
      },
    ],
  };
}

export async function writeExportFiles(
  root: string,
  files: ExportFile[],
  dir?: string,
): Promise<{ dir: string; paths: string[] }> {
  const outDir = resolveOutDir(root, dir, "exports");
  await mkdir(outDir, { recursive: true });
  const paths: string[] = [];
  for (const file of files) {
    const rel = file.filename.replace(/\\/g, "/").replace(/^\/+/, "");
    if (!rel || rel.split("/").some((p) => p === "..")) throw new Error(`Invalid filename ${file.filename}`);
    const outPath = path.join(outDir, rel);
    await mkdir(path.dirname(outPath), { recursive: true });
    if (file.png) await writeFile(outPath, file.png);
    else if (file.json !== undefined) await writeFile(outPath, `${JSON.stringify(file.json, null, 2)}\n`);
    else throw new Error(`Nothing to write for ${rel}`);
    paths.push(outPath);
  }
  return { dir: outDir, paths };
}

export function normalizeSelections(
  parts: PartMeta[],
  selections: Partial<Record<PartSlot, string | null>>,
  colors?: CharacterProject["colors"],
): { selections: CharacterProject["selections"]; colors: CharacterProject["colors"]; warnings: string[] } {
  const warnings: string[] = [];
  const next: CharacterProject["selections"] = { ...selections };
  const nextColors: CharacterProject["colors"] = { ...(colors ?? {}) };

  if (next.hair_front && !next.hair_back) {
    const backId = next.hair_front.replace(/_front$/, "_back");
    if (parts.some((p) => p.id === backId)) next.hair_back = backId;
  }

  for (const [slot, id] of Object.entries(next) as Array<[PartSlot, string | null]>) {
    if (!id) continue;
    const part = parts.find((p) => p.id === id);
    if (!part) {
      warnings.push(`Unknown part id "${id}" in slot ${slot}`);
      next[slot] = null;
      continue;
    }
    if (part.slot !== slot) {
      warnings.push(`Part "${id}" belongs to ${part.slot}, not ${slot}`);
      next[slot] = null;
    }
  }

  const build = bodyTypeOf(parts, { selections: next });
  for (const [slot, id] of Object.entries(next) as Array<[PartSlot, string | null]>) {
    if (!id || slot === "body") continue;
    const part = parts.find((p) => p.id === id);
    if (part && !fitsBuild(part, build)) {
      warnings.push(`Part "${id}" does not fit body type "${build}" — cleared`);
      next[slot] = null;
    }
  }

  if (!next.body) warnings.push("No body selected — export will fail until a body is set");

  return { selections: next, colors: nextColors, warnings };
}

export async function composeAndSave(
  root: string,
  input: {
    id: string;
    name: string;
    selections: Partial<Record<PartSlot, string | null>>;
    colors?: CharacterProject["colors"];
    dir?: string;
  },
): Promise<{ project: CharacterProject; path: string; warnings: string[] }> {
  const parts = await loadParts(root);
  const { selections, colors, warnings } = normalizeSelections(parts, input.selections, input.colors);
  const project: CharacterProject = {
    id: slugify(input.id),
    name: input.name,
    updatedAt: new Date().toISOString(),
    selections,
    colors,
  };
  const saved = await saveProject(root, project, input.dir);
  return { project: saved.project, path: saved.path, warnings };
}

export async function exportProject(
  root: string,
  options: {
    projectId?: string;
    project?: CharacterProject;
    preset?: ExportPresetId;
    dir?: string;
    baseName?: string;
  },
): Promise<{ paths: string[]; dir: string; preset: ExportPresetId; warnings: string[] }> {
  const parts = await loadParts(root);
  let project = options.project;
  if (!project && options.projectId) {
    const file = path.join(root, "projects", `${assertSafeId(options.projectId)}.json`);
    project = JSON.parse(await readFile(file, "utf8")) as CharacterProject;
  }
  if (!project) throw new Error("project or projectId required");

  const normalized = normalizeSelections(parts, project.selections, project.colors);
  project = { ...project, selections: normalized.selections, colors: normalized.colors };
  const preset = options.preset ?? "native";
  const bundle = await buildExportFiles({
    root,
    parts,
    project,
    preset,
    baseName: options.baseName,
  });
  const written = await writeExportFiles(root, bundle.files, options.dir);
  return {
    paths: written.paths,
    dir: written.dir,
    preset,
    warnings: normalized.warnings,
  };
}

/** Clear decoded sheet cache (tests / after regenerating samples). */
export function clearSheetCache(): void {
  sheetCache.clear();
}
