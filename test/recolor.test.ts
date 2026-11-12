import { describe, expect, it } from "vitest";
import { recolorRgba } from "../src/lib/recolor.js";

const px = (...rgba: number[][]) => new Uint8Array(rgba.flat());

describe("recolorRgba", () => {
  it("maps the base colour to the target colour", () => {
    const buf = px([200, 60, 60, 255]);
    recolorRgba(buf, "#c83c3c", "#3c3cc8");
    expect(buf[2]!).toBeGreaterThan(buf[0]!); // now blue-dominant
    expect(buf[3]).toBe(255);
  });

  it("keeps darker shades darker than the main tone", () => {
    const buf = px([200, 60, 60, 255], [120, 36, 36, 255]);
    recolorRgba(buf, "#c83c3c", "#3c8c3c");
    expect(buf[5]!).toBeLessThan(buf[1]!); // shade green < main green
  });

  it("leaves unrelated hues and transparent pixels alone", () => {
    const buf = px([40, 160, 220, 255], [200, 60, 60, 0]);
    recolorRgba(buf, "#c83c3c", "#3c3cc8");
    expect([...buf]).toEqual([40, 160, 220, 255, 200, 60, 60, 0]);
  });

  it("is a no-op when base and target match", () => {
    const buf = px([200, 60, 60, 255]);
    recolorRgba(buf, "#c83c3c", "#C83C3C");
    expect([...buf]).toEqual([200, 60, 60, 255]);
  });
});
