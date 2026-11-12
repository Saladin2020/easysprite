import type {
  AnimFrame,
  CharacterProject,
  Direction,
  ExportPresetId,
  PartMeta,
} from "./types";
import { ANIM_PRESETS } from "./types";
import { drawCharacterFrame, renderSheetGrid } from "./compositor";

export interface ExportFile {
  filename: string;
  pngBase64?: string;
  json?: unknown;
}

export interface ExportBundle {
  preset: ExportPresetId;
  files: ExportFile[];
  primaryPathHint: string;
}

function canvasToBase64(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

function projectMeta(project: CharacterProject) {
  return {
    id: project.id,
    name: project.name,
    selections: project.selections,
    colors: project.colors ?? {},
  };
}

async function buildNative(
  parts: PartMeta[],
  project: CharacterProject,
  frameSize: number,
  directions: Direction[],
  frames: AnimFrame[],
  baseName: string,
): Promise<ExportBundle> {
  const canvas = await renderSheetGrid(parts, project, frameSize, directions, frames);
  const atlas = {
    format: "easysprite.native",
    frameSize,
    columns: frames.length,
    rows: directions.length,
    directions,
    frames,
    project: projectMeta(project),
  };
  return {
    preset: "native",
    primaryPathHint: `${baseName}.png`,
    files: [
      { filename: `${baseName}.png`, pngBase64: canvasToBase64(canvas) },
      { filename: `${baseName}.json`, json: atlas },
    ],
  };
}

async function buildRpgMaker(
  parts: PartMeta[],
  project: CharacterProject,
  frameSize: number,
  baseName: string,
): Promise<ExportBundle> {
  // MV/MZ plays columns 0-1-2-1: step, passing, step; rows = down, left, right, up
  const frames: AnimFrame[] = ["walk0", "walk1", "walk2"];
  const directions: Direction[] = ["front", "left", "right", "back"];
  const canvas = await renderSheetGrid(parts, project, frameSize, directions, frames);
  const atlas = {
    format: "rpgmaker_mv",
    frameSize,
    columns: 3,
    rows: 4,
    directions: ["down", "left", "right", "up"],
    frames: ["left_step", "idle", "right_step"],
    project: projectMeta(project),
  };
  return {
    preset: "rpgmaker_mv",
    primaryPathHint: `rpgmaker/${baseName}.png`,
    files: [
      { filename: `rpgmaker/${baseName}.png`, pngBase64: canvasToBase64(canvas) },
      { filename: `rpgmaker/${baseName}.json`, json: atlas },
    ],
  };
}

async function buildGodot(
  parts: PartMeta[],
  project: CharacterProject,
  frameSize: number,
  directions: Direction[],
  frames: AnimFrame[],
  baseName: string,
): Promise<ExportBundle> {
  const canvas = await renderSheetGrid(parts, project, frameSize, directions, frames);
  const framesMeta: Record<string, { frame: { x: number; y: number; w: number; h: number } }> = {};
  directions.forEach((dir, row) => {
    frames.forEach((fr, col) => {
      framesMeta[`${dir}_${fr}`] = {
        frame: {
          x: col * frameSize,
          y: row * frameSize,
          w: frameSize,
          h: frameSize,
        },
      };
    });
  });

  const atlas = {
    format: "godot_atlas",
    textures: [
      {
        image: `${baseName}.png`,
        size: { w: canvas.width, h: canvas.height },
        sprites: framesMeta,
      },
    ],
    animations: Object.fromEntries(
      ANIM_PRESETS.map((anim) => [
        anim.id,
        {
          directions,
          frames: anim.frames.filter((f) => frames.includes(f)),
          speed: Math.round(1000 / anim.ms),
          loop: anim.loop,
        },
      ]),
    ),
    project: projectMeta(project),
  };

  return {
    preset: "godot",
    primaryPathHint: `godot/${baseName}.png`,
    files: [
      { filename: `godot/${baseName}.png`, pngBase64: canvasToBase64(canvas) },
      { filename: `godot/${baseName}.json`, json: atlas },
    ],
  };
}

async function buildFrames(
  parts: PartMeta[],
  project: CharacterProject,
  frameSize: number,
  directions: Direction[],
  frames: AnimFrame[],
  baseName: string,
): Promise<ExportBundle> {
  const files: ExportFile[] = [];
  const index: Array<{ direction: Direction; frame: AnimFrame; file: string }> = [];

  for (const dir of directions) {
    for (const fr of frames) {
      const canvas = document.createElement("canvas");
      canvas.width = frameSize;
      canvas.height = frameSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unsupported");
      ctx.clearRect(0, 0, frameSize, frameSize);
      ctx.imageSmoothingEnabled = false;
      await drawCharacterFrame(ctx, parts, project, dir, fr, 0, 0, 1);
      const file = `frames/${baseName}/${dir}_${fr}.png`;
      files.push({ filename: file, pngBase64: canvasToBase64(canvas) });
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

  return {
    preset: "frames",
    primaryPathHint: `frames/${baseName}/`,
    files,
  };
}

export async function renderExport(options: {
  preset: ExportPresetId;
  parts: PartMeta[];
  project: CharacterProject;
  frameSize: number;
  directions: Direction[];
  frames: AnimFrame[];
  baseName: string;
}): Promise<ExportBundle> {
  const { preset, parts, project, frameSize, directions, frames, baseName } = options;
  switch (preset) {
    case "rpgmaker_mv":
      return buildRpgMaker(parts, project, frameSize, baseName);
    case "godot":
      return buildGodot(parts, project, frameSize, directions, frames, baseName);
    case "frames":
      return buildFrames(parts, project, frameSize, directions, frames, baseName);
    case "native":
    default:
      return buildNative(parts, project, frameSize, directions, frames, baseName);
  }
}
