import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ANIM_PRESETS,
  type AnimFrame,
  type AnimPresetId,
  type CharacterProject,
  type Direction,
} from "../shared/types.js";
import { encodePng, outlineRect, type Rgba } from "./png.js";
import { renderSheetPixels } from "./compose.js";
import { loadConfig, loadParts, loadProjects, resolveOutDir } from "./workspace.js";

const GRASS_A: Rgba = [95, 166, 90, 255];
const GRASS_B: Rgba = [102, 174, 96, 255];
const FRAME: Rgba = [36, 24, 14, 255];

const SHOWCASE_ANIMS: AnimPresetId[] = ["walk", "wave", "cheer", "idle"];
const SHOWCASE_DIRS: Direction[] = ["front", "right", "back", "left"];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function blitScaled(
  dest: Uint8Array,
  destW: number,
  dx: number,
  dy: number,
  src: Uint8Array,
  srcW: number,
  srcH: number,
  srcStride: number,
  srcX: number,
  srcY: number,
  scale: number,
): void {
  for (let y = 0; y < srcH; y++) {
    for (let x = 0; x < srcW; x++) {
      const si = ((srcY + y) * srcStride + (srcX + x)) * 4;
      const a = src[si + 3]!;
      if (a === 0) continue;
      for (let oy = 0; oy < scale; oy++) {
        for (let ox = 0; ox < scale; ox++) {
          const di = ((dy + y * scale + oy) * destW + (dx + x * scale + ox)) * 4;
          dest[di] = src[si]!;
          dest[di + 1] = src[si + 1]!;
          dest[di + 2] = src[si + 2]!;
          dest[di + 3] = 255;
        }
      }
    }
  }
}

function paintGrass(pixels: Uint8Array, width: number, height: number, tile = 8): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const parity = (Math.floor(x / tile) + Math.floor(y / tile)) & 1;
      const c = parity ? GRASS_A : GRASS_B;
      const i = (y * width + x) * 4;
      pixels[i] = c[0];
      pixels[i + 1] = c[1];
      pixels[i + 2] = c[2];
      pixels[i + 3] = c[3];
    }
  }
}

function presetMeta(id: AnimPresetId) {
  return ANIM_PRESETS.find((p) => p.id === id) ?? ANIM_PRESETS[1]!;
}

/** Grid: columns = frames, rows = directions. Each cell = grass + scaled sprite. */
async function renderAnimGrid(
  root: string,
  parts: Awaited<ReturnType<typeof loadParts>>,
  project: CharacterProject,
  directions: Direction[],
  frames: AnimFrame[],
  frameSize: number,
  scale: number,
  pad: number,
): Promise<{ png: Buffer; cell: number; frameCount: number; dirCount: number }> {
  const { pixels: src, width: srcW } = await renderSheetPixels(
    root,
    parts,
    project,
    directions,
    frames,
    frameSize,
  );
  const cell = frameSize * scale + pad * 2;
  const frameCount = frames.length;
  const dirCount = directions.length;
  const width = cell * frameCount;
  const height = cell * dirCount;
  const pixels = new Uint8Array(width * height * 4);
  paintGrass(pixels, width, height, 8);

  for (let row = 0; row < dirCount; row++) {
    for (let col = 0; col < frameCount; col++) {
      outlineRect(pixels, width, col * cell, row * cell, cell, cell, FRAME);
      blitScaled(
        pixels,
        width,
        col * cell + pad,
        row * cell + pad,
        src,
        frameSize,
        frameSize,
        srcW,
        col * frameSize,
        row * frameSize,
        scale,
      );
    }
  }
  return { png: encodePng(width, height, pixels), cell, frameCount, dirCount };
}

function buildHtml(options: {
  title: string;
  subtitle: string;
  entries: Array<{
    id: string;
    name: string;
    body: string | null;
    anims: Record<
      string,
      { file: string; frames: number; dirs: number; ms: number; label: string }
    >;
  }>;
  columns: number;
  cell: number;
  defaultAnim: AnimPresetId;
  directions: Direction[];
}): string {
  const animButtons = SHOWCASE_ANIMS.map((id) => {
    const p = presetMeta(id);
    const active = id === options.defaultAnim ? " active" : "";
    return `<button type="button" class="anim-btn${active}" data-anim="${id}">${escapeHtml(p.label)}</button>`;
  }).join("\n      ");

  const dirButtons = options.directions
    .map(
      (d, i) =>
        `<button type="button" class="dir-btn${i === 0 ? " active" : ""}" data-dir="${i}" data-dir-name="${d}">${d}</button>`,
    )
    .join("\n      ");

  const cards = options.entries
    .map((e) => {
      const walk = e.anims[options.defaultAnim] ?? Object.values(e.anims)[0]!;
      const animJson = escapeHtml(JSON.stringify(e.anims));
      return `    <figure class="card" data-anims='${animJson}'>
      <div class="stage">
        <div class="strip${walk.frames > 1 ? "" : " still"}" style="--n:${walk.frames};--d:${walk.dirs};--dir:0;background-image:url('${escapeHtml(walk.file)}');animation-duration:${walk.frames * walk.ms}ms"></div>
      </div>
      <figcaption>
        <strong>${escapeHtml(e.name)}</strong>
        <span>${escapeHtml(e.id)}</span>
      </figcaption>
    </figure>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(options.title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;600&family=Silkscreen:wght@400;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #140e0a;
      --wood: #2e2014;
      --line: #1a1008;
      --text: #f7ebd3;
      --muted: #c6ad89;
      --accent: #f4ae3d;
      --leaf: #79c48a;
      --cell: ${options.cell}px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: "IBM Plex Sans Thai", sans-serif;
      color: var(--text);
      background:
        radial-gradient(ellipse 60% 40% at 15% -5%, rgba(244,174,61,.22), transparent 70%),
        linear-gradient(180deg, #1c1a2b 0%, var(--bg) 55%, #0e0a07 100%);
      padding: 2rem 1.25rem 3rem;
    }
    header {
      max-width: 1100px;
      margin: 0 auto 1rem;
      padding: 1rem 1.2rem;
      background: linear-gradient(180deg, #3d2a1a, var(--wood));
      border: 3px solid var(--line);
      box-shadow: 0 6px 0 0 var(--line);
    }
    h1 {
      font-family: "Silkscreen", monospace;
      margin: 0;
      font-size: clamp(1.4rem, 3vw, 2rem);
      color: var(--accent);
      text-shadow: 3px 3px 0 var(--line);
    }
    .sub { margin: .4rem 0 0; color: var(--muted); font-size: .9rem; }
    .toolbar {
      max-width: 1100px;
      margin: 0 auto .75rem;
      display: flex;
      flex-wrap: wrap;
      gap: .45rem;
      align-items: center;
    }
    .toolbar .label {
      font-family: "Silkscreen", monospace;
      font-size: .7rem;
      color: var(--muted);
      margin-right: .25rem;
    }
    .anim-btn, .dir-btn, .play-btn {
      font: inherit;
      cursor: pointer;
      border: 2px solid var(--line);
      background: #3d2a1a;
      color: var(--text);
      padding: .4rem .75rem;
      box-shadow: 0 3px 0 0 var(--line);
    }
    .anim-btn:hover, .dir-btn:hover, .play-btn:hover { background: #563b24; }
    .anim-btn.active, .dir-btn.active {
      background: var(--accent);
      color: #2a1606;
      font-weight: 600;
    }
    .play-btn.paused { color: var(--accent); }
    .grid {
      max-width: 1100px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(${Math.max(1, options.columns)}, minmax(0, 1fr));
      gap: 1rem;
    }
    .card {
      margin: 0;
      background: var(--wood);
      border: 3px solid var(--line);
      box-shadow: 0 4px 0 0 var(--line);
      padding: .7rem;
      text-align: center;
    }
    .stage {
      width: 100%;
      max-width: var(--cell);
      aspect-ratio: 1;
      margin: 0 auto;
      overflow: hidden;
      border: 2px solid var(--line);
      background: #5fa65a;
    }
    .strip {
      width: 100%;
      height: 100%;
      background-repeat: no-repeat;
      background-size: calc(var(--n) * 100%) calc(var(--d) * 100%);
      background-position: 0% calc(var(--dir) * 100% / max(var(--d) - 1, 1));
      image-rendering: pixelated;
      image-rendering: crisp-edges;
      animation-name: showcase-play;
      animation-iteration-count: infinite;
      animation-timing-function: steps(var(--n), jump-none);
    }
    .strip.still { animation: none; }
    body.is-paused .strip { animation-play-state: paused; }
    @keyframes showcase-play {
      from { background-position-x: 0%; }
      to { background-position-x: 100%; }
    }
    figcaption { margin-top: .55rem; }
    figcaption strong { display: block; font-size: .95rem; }
    figcaption span { color: var(--muted); font-size: .72rem; word-break: break-all; }
    footer {
      max-width: 1100px;
      margin: 1.5rem auto 0;
      color: var(--muted);
      font-size: .78rem;
    }
    footer code { color: var(--leaf); }
    @media (max-width: 720px) {
      .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (prefers-reduced-motion: reduce) {
      .strip { animation: none !important; }
    }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(options.title)}</h1>
    <p class="sub">${escapeHtml(options.subtitle)}</p>
  </header>
  <div class="toolbar" role="toolbar" aria-label="Animation">
    <span class="label">Anim</span>
      ${animButtons}
    <button type="button" class="play-btn" id="toggle-play">Pause</button>
  </div>
  <div class="toolbar" role="toolbar" aria-label="Direction">
    <span class="label">Dir</span>
      ${dirButtons}
  </div>
  <div class="grid">
${cards}
  </div>
  <footer>Easy Sprite showcase · ${options.entries.length} characters · animated grids in <code>anim/</code></footer>
  <script>
    (function () {
      var currentAnim = ${JSON.stringify(options.defaultAnim)};
      var currentDir = 0;
      var playBtn = document.getElementById("toggle-play");
      var animButtons = document.querySelectorAll(".anim-btn");
      var dirButtons = document.querySelectorAll(".dir-btn");
      var cards = document.querySelectorAll(".card");

      function applyAll() {
        animButtons.forEach(function (b) {
          b.classList.toggle("active", b.getAttribute("data-anim") === currentAnim);
        });
        dirButtons.forEach(function (b) {
          b.classList.toggle("active", Number(b.getAttribute("data-dir")) === currentDir);
        });
        cards.forEach(function (card) {
          var map = JSON.parse(card.getAttribute("data-anims") || "{}");
          var clip = map[currentAnim];
          if (!clip) return;
          var strip = card.querySelector(".strip");
          if (!strip) return;
          strip.style.setProperty("--n", String(clip.frames));
          strip.style.setProperty("--d", String(clip.dirs));
          strip.style.setProperty("--dir", String(currentDir));
          strip.style.backgroundImage = "url('" + clip.file + "')";
          strip.style.animationDuration = (clip.frames * clip.ms) + "ms";
          strip.classList.toggle("still", clip.frames < 2);
          strip.style.animationName = "none";
          void strip.offsetWidth;
          strip.style.animationName = "";
        });
      }

      animButtons.forEach(function (b) {
        b.addEventListener("click", function () {
          currentAnim = b.getAttribute("data-anim");
          applyAll();
        });
      });
      dirButtons.forEach(function (b) {
        b.addEventListener("click", function () {
          currentDir = Number(b.getAttribute("data-dir")) || 0;
          applyAll();
        });
      });
      playBtn.addEventListener("click", function () {
        var paused = document.body.classList.toggle("is-paused");
        playBtn.textContent = paused ? "Play" : "Pause";
        playBtn.classList.toggle("paused", paused);
      });
    })();
  </script>
</body>
</html>
`;
}

export interface ShowcaseOptions {
  projectIds?: string[];
  /** Folder to read project JSON from (default workspace projects/) */
  projectsDir?: string;
  /** Output folder (default exports/showcase) */
  dir?: string;
  title?: string;
  columns?: number;
  scale?: number;
  pad?: number;
  anim?: AnimPresetId;
  /** Optional unsaved / in-editor character to include */
  draft?: CharacterProject;
  includeDraft?: boolean;
}

export interface ShowcaseResult {
  dir: string;
  htmlPath: string;
  sheetPath: string;
  manifestPath: string;
  paths: string[];
  count: number;
  skipped: string[];
  projectsDir: string;
}

export async function buildShowcase(
  root: string,
  options: ShowcaseOptions = {},
): Promise<ShowcaseResult> {
  const projectsDirResolved = resolveOutDir(root, options.projectsDir, "projects");
  const [config, parts, allProjects] = await Promise.all([
    loadConfig(root),
    loadParts(root),
    loadProjects(root, options.projectsDir),
  ]);

  const wanted = options.projectIds?.map((id) => id.trim()).filter(Boolean);
  const skipped: string[] = [];
  const byId = new Map(allProjects.map((p) => [p.id, p]));

  if (options.includeDraft && options.draft?.id && options.draft.selections) {
    byId.set(options.draft.id, {
      ...options.draft,
      updatedAt: options.draft.updatedAt || new Date().toISOString(),
    });
  }

  let projects: CharacterProject[];
  if (wanted?.length) {
    projects = [];
    for (const id of wanted) {
      const p = byId.get(id);
      if (p) projects.push(p);
      else skipped.push(id);
    }
  } else {
    projects = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "th"));
  }

  if (!projects.length) {
    throw new Error(
      wanted?.length
        ? `No matching projects (${skipped.join(", ") || "empty filter"})`
        : `No projects in ${projectsDirResolved} — save some first`,
    );
  }

  const outDir = resolveOutDir(root, options.dir, path.join("exports", "showcase"));
  const portraitsDir = path.join(outDir, "portraits");
  const animDir = path.join(outDir, "anim");
  await mkdir(portraitsDir, { recursive: true });
  await mkdir(animDir, { recursive: true });

  const scale = Math.max(2, Math.min(8, options.scale ?? 4));
  const pad = Math.max(4, Math.min(24, options.pad ?? 12));
  const columns = Math.max(1, Math.min(8, options.columns ?? Math.min(5, projects.length)));
  const cell = config.frameSize * scale + pad * 2;
  const defaultAnim: AnimPresetId =
    options.anim && SHOWCASE_ANIMS.includes(options.anim) ? options.anim : "walk";
  const directions =
    config.directions?.length > 0 ? ([...config.directions] as Direction[]) : SHOWCASE_DIRS;

  const gap = 8;
  const rows = Math.ceil(projects.length / columns);
  const sheetW = columns * cell + (columns + 1) * gap;
  const sheetH = rows * cell + (rows + 1) * gap;
  const sheetPixels = new Uint8Array(sheetW * sheetH * 4);
  for (let i = 0; i < sheetPixels.length; i += 4) {
    sheetPixels[i] = 32;
    sheetPixels[i + 1] = 22;
    sheetPixels[i + 2] = 14;
    sheetPixels[i + 3] = 255;
  }

  type Entry = {
    id: string;
    name: string;
    body: string | null;
    file: string;
    anims: Record<
      string,
      { file: string; frames: number; dirs: number; ms: number; label: string }
    >;
  };
  const entries: Entry[] = [];
  const paths: string[] = [];

  for (let i = 0; i < projects.length; i++) {
    const project = projects[i]!;
    const anims: Entry["anims"] = {};

    for (const animId of SHOWCASE_ANIMS) {
      const preset = presetMeta(animId);
      const grid = await renderAnimGrid(
        root,
        parts,
        project,
        directions,
        preset.frames,
        config.frameSize,
        scale,
        pad,
      );
      const rel = `anim/${project.id}_${animId}.png`;
      const abs = path.join(outDir, rel);
      await writeFile(abs, grid.png);
      paths.push(abs);
      anims[animId] = {
        file: rel.replace(/\\/g, "/"),
        frames: grid.frameCount,
        dirs: grid.dirCount,
        ms: preset.ms,
        label: preset.label,
      };
    }

    const portraitGrid = await renderAnimGrid(
      root,
      parts,
      project,
      ["front"],
      ["walk0"],
      config.frameSize,
      scale,
      pad,
    );
    const portraitRel = `portraits/${project.id}.png`;
    const portraitAbs = path.join(outDir, portraitRel);
    await writeFile(portraitAbs, portraitGrid.png);
    paths.push(portraitAbs);

    const col = i % columns;
    const row = Math.floor(i / columns);
    const dx = gap + col * (cell + gap);
    const dy = gap + row * (cell + gap);
    const { pixels: src, width: srcW } = await renderSheetPixels(
      root,
      parts,
      project,
      ["front"],
      ["walk0"],
      config.frameSize,
    );
    const cellPix = new Uint8Array(cell * cell * 4);
    paintGrass(cellPix, cell, cell, 8);
    outlineRect(cellPix, cell, 0, 0, cell, cell, FRAME);
    blitScaled(cellPix, cell, pad, pad, src, config.frameSize, config.frameSize, srcW, 0, 0, scale);
    for (let y = 0; y < cell; y++) {
      for (let x = 0; x < cell; x++) {
        const si = (y * cell + x) * 4;
        const di = ((dy + y) * sheetW + (dx + x)) * 4;
        sheetPixels[di] = cellPix[si]!;
        sheetPixels[di + 1] = cellPix[si + 1]!;
        sheetPixels[di + 2] = cellPix[si + 2]!;
        sheetPixels[di + 3] = cellPix[si + 3]!;
      }
    }

    entries.push({
      id: project.id,
      name: project.name,
      body: project.selections.body ?? null,
      file: portraitRel.replace(/\\/g, "/"),
      anims,
    });
  }

  const title = options.title?.trim() || "Easy Sprite Showcase";
  const subtitle = `หมู่บ้านอบอุ่น · ${projects.length} ตัวละคร · ขยับได้ · หันได้ 4 ทิศ`;
  const html = buildHtml({
    title,
    subtitle,
    entries,
    columns,
    cell,
    defaultAnim,
    directions,
  });
  const htmlPath = path.join(outDir, "index.html");
  await writeFile(htmlPath, html, "utf8");
  paths.push(htmlPath);

  const sheetPath = path.join(outDir, "showcase.png");
  await writeFile(sheetPath, encodePng(sheetW, sheetH, sheetPixels));
  paths.push(sheetPath);

  const manifest = {
    title,
    createdAt: new Date().toISOString(),
    workspace: root,
    projectsDir: projectsDirResolved,
    count: projects.length,
    columns,
    scale,
    cell,
    defaultAnim,
    directions,
    animations: SHOWCASE_ANIMS,
    skipped,
    characters: entries,
    files: {
      html: "index.html",
      sheet: "showcase.png",
      portraits: entries.map((e) => e.file),
      anim: entries.flatMap((e) => Object.values(e.anims).map((a) => a.file)),
    },
  };
  const manifestPath = path.join(outDir, "showcase.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  paths.push(manifestPath);

  return {
    dir: outDir,
    htmlPath,
    sheetPath,
    manifestPath,
    paths,
    count: projects.length,
    skipped,
    projectsDir: projectsDirResolved,
  };
}
