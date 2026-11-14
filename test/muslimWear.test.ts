import { readFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { demoProjects } from "../src/lib/demoProjects.js";
import { normalizeSelections } from "../src/lib/compose.js";
import { loadParts } from "../src/lib/workspace.js";
import type { PartMeta } from "../src/shared/types.js";
import { tempWorkspace } from "./helpers.js";

let root: string;
let cleanup: () => Promise<void>;
beforeAll(async () => {
  ({ root, cleanup } = await tempWorkspace());
});
afterAll(() => cleanup());

async function part(slot: string, id: string): Promise<{ meta: PartMeta; png: PNG }> {
  const dir = path.join(root, "parts", slot, id);
  const meta = JSON.parse(await readFile(path.join(dir, "part.json"), "utf8")) as PartMeta;
  const png = PNG.sync.read(await readFile(path.join(dir, meta.sheet)));
  return { meta, png };
}

const alphaAt = (png: PNG, col: number, row: number, x: number, y: number) =>
  png.data[((row * 48 + y) * png.width + col * 48 + x) * 4 + 3]!;

const NEW_PARTS: Array<[string, string]> = [
  ["hair_front", "hair_hijab_front"],
  ["hair_front", "hair_hijab_shawl_front"],
  ["hair_front", "hair_tudung_sarung_front"],
  ["hair_front", "hair_tudung_school_front"],
  ["accessory", "acc_kopiah"],
  ["accessory", "acc_songkok"],
  ["shirt", "shirt_jubah"],
  ["shirt", "shirt_baju_melayu"],
  ["shirt", "shirt_baju_kurung"],
  ["pants", "pants_kain_pelekat"],
];

describe("Muslim community wear", () => {
  it.each(NEW_PARTS.flatMap(([slot, id]) => [[slot, id], [slot, `side_${id}`]]))(
    "%s/%s fits every human body type, recolors and fills every frame",
    async (slot, id) => {
      const { meta, png } = await part(slot, id);
      expect(meta.slot).toBe(slot);
      expect(meta.bodyTypes).toEqual(["adult", "child", "elder", "stocky"]);
      expect(meta.recolor?.enabled).toBe(true);
      expect(png.width).toBe(meta.columns * 48);
      expect(png.height).toBe(meta.rows * 48);
      for (let row = 0; row < meta.rows; row++) {
        for (let col = 0; col < meta.columns; col++) {
          let n = 0;
          for (let y = 0; y < 48 && !n; y++) for (let x = 0; x < 48 && !n; x++) n += alphaAt(png, col, row, x, y) ? 1 : 0;
          expect(n, `${id} cell ${col},${row}`).toBeGreaterThan(0);
        }
      }
    },
  );

  it.each(["hair_hijab_front", "hair_hijab_shawl_front", "hair_tudung_sarung_front", "hair_tudung_school_front"])(
    "%s leaves the eyes open in front view and covers the whole head from behind",
    async (id) => {
      const { png } = await part("hair_front", id);
      // adult idle, front row 0: head box x 15..32, y 7..22, eyes around y 15
      const eyeRow = 15;
      expect(alphaAt(png, 0, 0, 19, eyeRow)).toBe(0);
      expect(alphaAt(png, 0, 0, 28, eyeRow)).toBe(0);
      // ears are covered (the body draws them just outside the head box)
      expect(alphaAt(png, 0, 0, 14, eyeRow)).toBe(255);
      expect(alphaAt(png, 0, 0, 33, eyeRow)).toBe(255);
      // back row 2: the face area is cloth
      expect(alphaAt(png, 0, 2, 23, eyeRow)).toBe(255);
    },
  );

  it("demo presets use only real parts and never invent a hair_back for hijab or shaved heads", async () => {
    const parts = await loadParts(root);
    const ids = ["hijab_teacher", "roti_seller", "mak_yah", "tadika_girl", "kopiah_boy", "songkok_groom", "pak_cik_jubah", "pelekat_fisher", "temple_monk"];
    const demos = demoProjects();
    for (const id of ids) {
      for (const p of demos.filter((d) => d.id === id || d.id === `side_${id}`)) {
        const n = normalizeSelections(parts, p.selections, p.colors);
        expect(n.warnings, p.id).toEqual([]);
        if (/hijab|tudung|shaved/.test(p.selections.hair_front ?? "")) expect(p.selections.hair_back, p.id).toBeUndefined();
      }
    }
  });
});
