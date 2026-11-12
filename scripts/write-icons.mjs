/**
 * Bake favicon / PWA PNGs from a tiny pixel lantern (no extra deps beyond pngjs).
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "web", "public");

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const HEX = {
  bg: [20, 14, 10, 255],
  wood: [46, 32, 20, 255],
  night: [26, 20, 32, 255],
  amber: [244, 174, 61, 255],
  hi: [255, 210, 122, 255],
  core: [255, 233, 176, 255],
  roof: [122, 74, 30, 255],
  rib: [196, 86, 31, 255],
  wick: [229, 128, 108, 255],
  star: [255, 233, 184, 255],
  white: [255, 255, 255, 255],
};

/** 32×32 lantern matching favicon.svg */
const GRID = [
  "................................",
  "................................",
  ".WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW.",
  ".WNNNNNNNNNNNNNNNNNNNNNNNNNNNNW.",
  ".WN............AA............NW.",
  ".WN............AA............NW.",
  ".WN........RRRRRRRRRR........NW.",
  ".WN......AAAAAAAAAAAAAA......NW.",
  ".WN......AAhhhhhhhhhhAA......NW.",
  ".WN......AAhhCCCCCChhAA......NW.",
  ".WN......AAhhCCCCCChhAA......NW.",
  ".WN......AAAAAAAAAAAAAA......NW.",
  ".WN......AAhhCCCCCChhAA......NW.",
  ".WN......AAhhCCCCCChhAA......NW.",
  ".WN......AAAAAAAAAAAAAA......NW.",
  ".WN......AAhhCCCCCChhAA......NW.",
  ".WN......AAhhCCCCCChhAA......NW.",
  ".WN......AAAAAAAAAAAAAA......NW.",
  ".WN........RRRRRRRRRR........NW.",
  ".WN............KK............NW.",
  ".WN............KK............NW.",
  ".WN.S......................S.NW.",
  ".WN..........................NW.",
  ".WN......................s...NW.",
  ".WNNNNNNNNNNNNNNNNNNNNNNNNNNNNW.",
  ".WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW.",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
];

const MAP = {
  ".": "bg",
  W: "wood",
  N: "night",
  A: "amber",
  h: "hi",
  C: "core",
  R: "roof",
  K: "wick",
  S: "star",
  s: "white",
};

function paintGrid(scale) {
  const size = 32 * scale;
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < 32; y++) {
    const row = GRID[y];
    for (let x = 0; x < 32; x++) {
      const key = MAP[row[x]] || "bg";
      const [r, g, b, a] = HEX[key];
      for (let oy = 0; oy < scale; oy++) {
        for (let ox = 0; ox < scale; ox++) {
          const i = ((y * scale + oy) * size + (x * scale + ox)) * 4;
          rgba[i] = r;
          rgba[i + 1] = g;
          rgba[i + 2] = b;
          rgba[i + 3] = a;
        }
      }
    }
  }
  return { size, rgba };
}

await mkdir(outDir, { recursive: true });
const docs = path.join(root, "docs", "assets");
await mkdir(docs, { recursive: true });

for (const [name, scale] of [
  ["favicon-32.png", 1],
  ["apple-touch-icon.png", Math.ceil(180 / 32)],
  ["icon-192.png", 6],
  ["icon-512.png", 16],
]) {
  const { size, rgba } = paintGrid(scale);
  // apple-touch wants exactly 180 — crop/center from nearest scale if needed
  let png;
  if (name === "apple-touch-icon.png" && size !== 180) {
    const out = Buffer.alloc(180 * 180 * 4);
    // nearest-neighbor resample to 180
    for (let y = 0; y < 180; y++) {
      for (let x = 0; x < 180; x++) {
        const sx = Math.min(size - 1, Math.floor((x / 180) * size));
        const sy = Math.min(size - 1, Math.floor((y / 180) * size));
        const si = (sy * size + sx) * 4;
        const di = (y * 180 + x) * 4;
        out[di] = rgba[si];
        out[di + 1] = rgba[si + 1];
        out[di + 2] = rgba[si + 2];
        out[di + 3] = rgba[si + 3];
      }
    }
    png = encodePng(180, 180, out);
  } else {
    png = encodePng(size, size, rgba);
  }
  await writeFile(path.join(outDir, name), png);
  if (name === "icon-512.png") {
    await writeFile(path.join(docs, "icon-512.png"), png);
  }
  console.log("wrote", name);
}

await writeFile(
  path.join(outDir, "favicon.ico"),
  // tiny trick: many browsers accept PNG renamed — keep SVG as primary; write 32 PNG copy as ico fallback note
  await (await import("node:fs/promises")).readFile(path.join(outDir, "favicon-32.png")),
);

console.log("icons ready in web/public");
