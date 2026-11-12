import type { AnimFrame, Build, CharacterProject, Direction, PartMeta, PartSlot } from "./types";
import { isSpecies } from "./types";
import { partSheetUrl } from "./api";
import { recolorImageData } from "./recolor";

const imageCache = new Map<string, HTMLImageElement>();
const tintCache = new Map<string, HTMLCanvasElement>();
const TINT_CACHE_MAX = 200;

function tintedSheet(img: HTMLImageElement, part: PartMeta, tint: string): CanvasImageSource {
  const recolor = part.recolor!;
  const key = `${img.src}|${recolor.base}|${recolor.tolerance ?? ""}|${tint}`;
  const hit = tintCache.get(key);
  if (hit) return hit;

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return img;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  recolorImageData(data, recolor.base, tint, recolor.tolerance);
  ctx.putImageData(data, 0, 0);

  tintCache.set(key, canvas);
  if (tintCache.size > TINT_CACHE_MAX) {
    const oldest = tintCache.keys().next().value;
    if (oldest !== undefined) tintCache.delete(oldest);
  }
  return canvas;
}

export async function loadPartImage(part: PartMeta): Promise<HTMLImageElement> {
  const url = partSheetUrl(part.slot, part.id);
  const cached = imageCache.get(url);
  if (cached?.complete) return cached;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      imageCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

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

/** Whether a part can be worn by the selected body (human clothes never go on animals). */
export function fitsBuild(part: PartMeta, build: Build | undefined): boolean {
  if (part.slot === "body" || !build) return true;
  if (part.bodyTypes) return part.bodyTypes.includes(build);
  return !isSpecies(build);
}

export function frameCol(part: PartMeta, frame: AnimFrame): number {
  const idx = part.frames.indexOf(frame);
  return idx >= 0 ? idx : 0;
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

export async function drawCharacterFrame(
  ctx: CanvasRenderingContext2D,
  parts: PartMeta[],
  project: Pick<CharacterProject, "selections" | "colors">,
  direction: Direction,
  frame: AnimFrame,
  destX: number,
  destY: number,
  scale = 1,
): Promise<void> {
  const bodyType = bodyTypeOf(parts, project);
  const selected = parts
    .filter((p) => project.selections[p.slot] === p.id && fitsBuild(p, bodyType))
    .sort((a, b) => a.zIndex - b.zIndex);

  // Load every layer first so a frame is never painted with some layers missing.
  const images = await Promise.all(selected.map((part) => loadPartImage(part)));

  ctx.imageSmoothingEnabled = false;
  selected.forEach((part, i) => {
    const img = images[i]!;
    const tint = tintForPart(part, project.colors);
    const source = tint ? tintedSheet(img, part, tint) : img;
    ctx.drawImage(
      source,
      frameCol(part, frame) * part.frameSize,
      directionRow(part, direction, bodyType) * part.frameSize,
      part.frameSize,
      part.frameSize,
      destX,
      destY,
      part.frameSize * scale,
      part.frameSize * scale,
    );
  });
}

export async function renderSheetGrid(
  parts: PartMeta[],
  project: CharacterProject,
  frameSize: number,
  directions: Direction[],
  frames: AnimFrame[],
): Promise<HTMLCanvasElement> {
  const columns = frames.length;
  const rows = directions.length;
  const canvas = document.createElement("canvas");
  canvas.width = frameSize * columns;
  canvas.height = frameSize * rows;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      await drawCharacterFrame(
        ctx,
        parts,
        project,
        directions[r]!,
        frames[c]!,
        c * frameSize,
        r * frameSize,
        1,
      );
    }
  }
  return canvas;
}

/** @deprecated use renderExport */
export async function renderFullSheet(
  parts: PartMeta[],
  project: CharacterProject,
  frameSize: number,
  directions: Direction[],
  frames: AnimFrame[],
): Promise<{ canvas: HTMLCanvasElement; atlas: object }> {
  const canvas = await renderSheetGrid(parts, project, frameSize, directions, frames);
  return {
    canvas,
    atlas: {
      frameSize,
      columns: frames.length,
      rows: directions.length,
      directions,
      frames,
      project: {
        id: project.id,
        name: project.name,
        selections: project.selections,
        colors: project.colors ?? {},
      },
    },
  };
}

export function defaultColorsForConfig(
  slots: Array<{ id: PartSlot; recolorDefault?: string }>,
): Partial<Record<PartSlot, string>> {
  const out: Partial<Record<PartSlot, string>> = {};
  for (const slot of slots) {
    if (slot.recolorDefault) out[slot.id] = slot.recolorDefault;
  }
  return out;
}
