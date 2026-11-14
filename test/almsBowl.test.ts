import { readFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_FRAMES } from "../src/shared/types.js";
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

function cellAlpha(png: PNG, col: number, row: number): (x: number, y: number) => number {
  return (x, y) => png.data[((row * 48 + y) * png.width + col * 48 + x) * 4 + 3]!;
}

function opaque(a: (x: number, y: number) => number): { count: number; xs: number[]; ys: number[] } {
  const xs: number[] = [];
  const ys: number[] = [];
  let count = 0;
  for (let y = 0; y < 48; y++) {
    for (let x = 0; x < 48; x++) {
      if (a(x, y) > 0) {
        count++;
        xs.push(x);
        ys.push(y);
      }
    }
  }
  return { count, xs, ys };
}

const NEW_FACES: Array<[string, string]> = [
  ["face", "face_frown"],
  ["face", "face_surprise"],
  ["face", "face_wink"],
];

describe("alms bowl (บาตร)", () => {
  it.each([
    ["accessory", "acc_alms_bowl"],
    ["accessory", "side_acc_alms_bowl"],
  ])("%s/%s exists for every human body type with a recolor base", async (slot, id) => {
    const { meta, png } = await part(slot, id);
    expect(meta.slot).toBe(slot);
    expect(meta.bodyTypes).toEqual(["adult", "child", "elder", "stocky"]);
    expect(meta.recolor?.enabled).toBe(true);
    expect(meta.recolor?.base.toLowerCase()).toBe("#2a221c");
    expect(png.width).toBe(meta.columns * 48);
    expect(png.height).toBe(meta.rows * 48);
    expect(meta.columns).toBe(DEFAULT_FRAMES.length);
    if (id.startsWith("side_")) expect(meta.view).toBe("side");
    else expect(meta.view).toBeUndefined();
  });

  it("paints the bowl in every animation frame (front and side idle rows)", async () => {
    const front = await part("accessory", "acc_alms_bowl");
    const side = await part("accessory", "side_acc_alms_bowl");
    // row 0 = front (top-down) / right (side), adult
    for (let col = 0; col < DEFAULT_FRAMES.length; col++) {
      expect(opaque(cellAlpha(front.png, col, 0)).count, `top-down frame ${DEFAULT_FRAMES[col]}`).toBeGreaterThan(8);
      expect(opaque(cellAlpha(side.png, col, 0)).count, `side frame ${DEFAULT_FRAMES[col]}`).toBeGreaterThan(8);
    }
  });

  it("sits in front of the waist on front idle, and ahead of the torso on the side", async () => {
    const front = opaque(cellAlpha((await part("accessory", "acc_alms_bowl")).png, 0, 0));
    const side = opaque(cellAlpha((await part("accessory", "side_acc_alms_bowl")).png, 0, 0));
    const midX = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const midY = (ys: number[]) => ys.reduce((a, b) => a + b, 0) / ys.length;
    expect(midX(front.xs)).toBeGreaterThan(18);
    expect(midX(front.xs)).toBeLessThan(30);
    expect(midY(front.ys)).toBeGreaterThan(22); // waist, not the head
    expect(midY(front.ys)).toBeLessThan(42);
    expect(midX(side.xs)).toBeGreaterThan(24); // ahead of the body when facing right
    expect(midY(side.ys)).toBeGreaterThan(20);
    expect(midY(side.ys)).toBeLessThan(42);
  });
});

describe("extra generic faces", () => {
  it.each(NEW_FACES.flatMap(([slot, id]) => [[slot, id], [slot, `side_${id}`]]))(
    "%s/%s exists for every human body type",
    async (slot, id) => {
      const { meta, png } = await part(slot, id);
      expect(meta.slot).toBe(slot);
      expect(meta.bodyTypes).toEqual(["adult", "child", "elder", "stocky"]);
      expect(png.width).toBe(meta.columns * 48);
      expect(png.height).toBe(meta.rows * 48);
      if (id.startsWith("side_")) expect(meta.view).toBe("side");
      else expect(meta.view).toBeUndefined();
    },
  );

  it("frown turns the mouth down, unlike smile", async () => {
    const frown = cellAlpha((await part("face", "face_frown")).png, 0, 0);
    const smile = cellAlpha((await part("face", "face_smile")).png, 0, 0);
    // Find the lowest opaque row of each mouth region (y 20–40, x 16–32)
    const lowest = (a: (x: number, y: number) => number) => {
      for (let y = 40; y >= 20; y--) for (let x = 16; x < 32; x++) if (a(x, y) > 0) return y;
      return -1;
    };
    // Corners of a frown sit lower than the centre; smile is the opposite.
    const corners = (a: (x: number, y: number) => number) => {
      const hits: Array<[number, number]> = [];
      for (let y = 20; y < 40; y++) for (let x = 16; x < 32; x++) if (a(x, y) > 0) hits.push([x, y]);
      const mid = 24;
      const left = hits.filter(([x]) => x < mid);
      const right = hits.filter(([x]) => x > mid);
      const avg = (pts: Array<[number, number]>) => pts.reduce((s, p) => s + p[1], 0) / pts.length;
      return { left: avg(left), right: avg(right), centre: avg(hits.filter(([x]) => x >= mid - 1 && x <= mid + 1)) };
    };
    expect(lowest(frown)).toBeGreaterThan(0);
    expect(lowest(smile)).toBeGreaterThan(0);
    const f = corners(frown);
    const s = corners(smile);
    expect(f.left).toBeGreaterThan(f.centre - 0.2);
    expect(s.left).toBeLessThan(s.centre + 0.2);
  });

  it("surprise opens a round mouth", async () => {
    const a = cellAlpha((await part("face", "face_surprise")).png, 0, 0);
    // 2×2 open mouth plus lip corners: pixels on both y=19 and y=20 around the centre.
    const rows = [19, 20].map((y) => [22, 23, 24, 25].filter((x) => a(x, y) > 0).length);
    expect(rows[0]).toBeGreaterThanOrEqual(2);
    expect(rows[1]).toBeGreaterThanOrEqual(2);
    expect(rows[0]! + rows[1]!).toBeGreaterThanOrEqual(5);
  });

  it("wink closes only the screen-left eye", async () => {
    const a = cellAlpha((await part("face", "face_wink")).png, 0, 0);
    const left: number[] = [];
    const right: number[] = [];
    for (let y = 12; y < 28; y++) {
      for (let x = 14; x < 24; x++) if (a(x, y) > 0) left.push(y);
      for (let x = 24; x < 34; x++) if (a(x, y) > 0) right.push(y);
    }
    const span = (ys: number[]) => Math.max(...ys) - Math.min(...ys);
    expect(left.length).toBeGreaterThan(0);
    expect(right.length).toBeGreaterThan(0);
    expect(span(left)).toBeLessThan(span(right));
  });
});
