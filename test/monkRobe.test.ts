import { readFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PartMeta } from "../src/shared/types.js";
import { tempWorkspace } from "./helpers.js";

let root: string;
let cleanup: () => Promise<void>;
beforeAll(async () => {
  ({ root, cleanup } = await tempWorkspace());
});
afterAll(() => cleanup());

const NEW_PARTS: Array<[slot: string, id: string]> = [
  ["shirt", "shirt_monk_robe"],
  ["pants", "pants_sabong"],
  ["hair_front", "hair_shaved_front"],
];

async function part(slot: string, id: string): Promise<{ meta: PartMeta; png: PNG }> {
  const dir = path.join(root, "parts", slot, id);
  const meta = JSON.parse(await readFile(path.join(dir, "part.json"), "utf8")) as PartMeta;
  const png = PNG.sync.read(await readFile(path.join(dir, meta.sheet)));
  return { meta, png };
}

/** Opaque pixels of one 48px cell (row = direction index for the adult body group). */
function cellAlpha(png: PNG, col: number, row: number): (x: number, y: number) => number {
  return (x, y) => png.data[((row * 48 + y) * png.width + col * 48 + x) * 4 + 3]!;
}

describe("monk robe parts", () => {
  it.each(NEW_PARTS.flatMap(([slot, id]) => [[slot, id], [slot, `side_${id}`]]))(
    "%s/%s exists for every human body type with a recolor base",
    async (slot, id) => {
      const { meta, png } = await part(slot, id);
      expect(meta.slot).toBe(slot);
      expect(meta.bodyTypes).toEqual(["adult", "child", "elder", "stocky"]);
      expect(meta.recolor?.enabled).toBe(true);
      expect(png.width).toBe(meta.columns * 48);
      expect(png.height).toBe(meta.rows * 48);
      if (id.startsWith("side_")) expect(meta.view).toBe("side");
      else expect(meta.view).toBeUndefined();
    },
  );

  it("robe hangs to the shins but leaves the feet free (side idle)", async () => {
    const { png } = await part("shirt", "side_shirt_monk_robe");
    const a = cellAlpha(png, 0, 0); // idle, facing right, adult
    const rowsWithCloth = (y: number) => Array.from({ length: 48 }, (_, x) => a(x, y)).some((v) => v > 0);
    expect(rowsWithCloth(38)).toBe(true); // below the knee
    expect(rowsWithCloth(46)).toBe(false); // sole row belongs to the shoes/feet
  });

  it("front view leaves the monk's right shoulder bare and covers the left", async () => {
    const { png } = await part("shirt", "shirt_monk_robe");
    const a = cellAlpha(png, 0, 0); // idle, front, adult
    let top = 48;
    for (let y = 0; y < 48 && top === 48; y++) for (let x = 0; x < 48; x++) if (a(x, y) > 0) top = y;
    const row = Array.from({ length: 48 }, (_, x) => a(x, top));
    const filled = row.flatMap((v, x) => (v > 0 ? [x] : []));
    // the robe's top edge sits on the screen-right shoulder only
    expect(Math.min(...filled)).toBeGreaterThan(24);
  });

  it("shaved head is a translucent cap so skin shows through", async () => {
    const { png } = await part("hair_front", "hair_shaved_front");
    const a = cellAlpha(png, 0, 0);
    const alphas = new Set<number>();
    for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (a(x, y)) alphas.add(a(x, y));
    expect(alphas.size).toBeGreaterThan(0);
    expect(Math.max(...alphas)).toBeLessThan(255);
  });
});
