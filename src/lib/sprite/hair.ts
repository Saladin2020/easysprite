import { type Cell, type Rgba, shade, shape, tint } from "./cell.js";
import { cutArms, type Draw } from "./rig.js";

export type HairStyle =
  | "messy"
  | "bob"
  | "long"
  | "spiky"
  | "bun"
  | "ponytail"
  | "twintails"
  | "crop"
  | "curly"
  | "balding";

/** Fringe length per column across the forehead; eye columns stay ≤ 2. */
const BANGS: Record<HairStyle, number[]> = {
  messy: [3, 2, 1, 2, 1, 2, 3, 2, 1, 3, 2, 1, 2, 1, 2, 3],
  bob: [3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3],
  long: [3, 3, 2, 2, 1, 1, 1, 0, 0, 1, 1, 1, 2, 2, 3, 3],
  spiky: [3, 1, 2, 1, 2, 1, 3, 1, 1, 3, 1, 2, 1, 2, 1, 3],
  bun: [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
  ponytail: [3, 3, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 0, 0, 1, 2],
  twintails: [3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3],
  crop: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
  curly: [2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 2],
  balding: [],
};

const bang = (style: HairStyle, i: number, n: number) =>
  BANGS[style][Math.round((i * 15) / Math.max(1, n - 1))] ?? 0;

function topExtras(t: Cell, style: HairStyle, x: number, y: number, w: number, col: Rgba): void {
  if (style === "spiky") {
    for (let sx = x + 1; sx < x + w - 2; sx += 4) {
      t.rect(sx, y - 3, 3, 2, col);
      t.set(sx + 1, y - 4, col);
    }
  } else if (style === "messy") {
    t.rect(x + 4, y - 2, 2, 1, col);
    t.rect(x + w - 7, y - 2, 3, 1, col);
  } else if (style === "bun") {
    t.round(x + Math.floor(w / 2) - 4, y - 5, 9, 6, 3, col);
  } else if (style === "curly") {
    for (let bx = x - 3; bx < x + w + 1; bx += 4) t.round(bx, y - 5, 5, 4, 2, col);
  }
}

export function drawHairFront(style: HairStyle, col: Rgba): Draw {
  const hl = tint(col, 0.3);
  const sh = shade(col, 0.72);
  const tie = shade(col, 0.5);
  return (c, r) => {
    const { x, y, w, h } = r.head;
    const sy = (n: number) => Math.round((n * h) / 16);
    const capH = Math.round(h * 0.44);
    const cx = x + Math.floor(w / 2);

    if (r.view === "front") {
      shape(c, (t) => {
        if (style === "balding") {
          t.rect(x - 1, y + sy(4), 3, sy(7), col);
          t.rect(x + w - 2, y + sy(4), 3, sy(7), col);
          t.rect(x - 1, y + sy(4), 3, 1, hl);
          return;
        }
        topExtras(t, style, x, y, w, col);
        if (style === "curly") {
          t.round(x - 3, y - 3, w + 6, capH + 4, 5, col);
          t.round(x - 4, y + 2, 5, sy(10), 2, col);
          t.round(x + w - 1, y + 2, 5, sy(10), 2, col);
        } else {
          t.round(x - 1, y - 1, w + 2, style === "crop" ? capH - 1 : capH, 4, col);
        }
        const n = w - 2;
        for (let i = 0; i < n; i++) {
          const len = bang(style, i, n);
          if (len) t.rect(x + 1 + i, y + capH - 1, 1, len, col);
        }
        const lockLen = sy(
          { bob: 12, long: 18, ponytail: 7, twintails: 8, crop: 3, curly: 0, messy: 8, spiky: 8, bun: 8, balding: 0 }[style],
        );
        const lockW = style === "bob" ? 3 : 2;
        if (lockLen) {
          t.rect(x + 1 - lockW, y + 3, lockW, lockLen, col);
          t.rect(x + w - 1, y + 3, lockW, lockLen, col);
          if (lockLen > 4) {
            t.rect(x + 1 - lockW, y + 1 + lockLen, lockW, 2, sh);
            t.rect(x + w - 1, y + 1 + lockLen, lockW, 2, sh);
          }
        }
        if (style === "twintails") {
          t.round(x - 6, y + sy(3), 5, sy(14), 2, col);
          t.round(x + w + 1, y + sy(3), 5, sy(14), 2, col);
          t.rect(x - 6, y + sy(3) + 1, 5, 1, tie);
          t.rect(x + w + 1, y + sy(3) + 1, 5, 1, tie);
        }
        t.rect(x + 3, y, 5, 1, hl);
        t.rect(x + 4, y + 1, 2, 1, hl);
      });
    } else if (r.view === "back") {
      shape(c, (t) => {
        if (style === "balding") {
          t.round(x - 1, y + sy(5), w + 2, sy(8), 3, col);
          t.rect(x + 2, y + sy(5), w - 4, 1, hl);
          return;
        }
        topExtras(t, style, x, y, w, col);
        if (style === "curly") {
          t.round(x - 3, y - 3, w + 6, sy(17), 5, col);
        } else {
          const cover = sy(style === "bob" ? 16 : style === "crop" ? 11 : 13);
          const wide = style === "bob" ? 2 : 1;
          t.round(x - wide, y - 1, w + 2 * wide, cover, 4, col);
          if (style === "messy" || style === "spiky") {
            for (let i = 0; i < w; i += 2) t.rect(x + i, y + cover - 2, 1, 2 + ((i / 2) % 2), col);
          }
        }
        const below = r.torso.y + r.torso.h + 2;
        if (style === "long") t.round(x, y + sy(8), w, below - (y + sy(8)), 3, col);
        if (style === "ponytail") {
          t.round(cx - 2, y + sy(9), 5, sy(13), 2, col);
          t.rect(cx - 2, y + sy(10), 5, 1, tie);
        }
        if (style === "twintails") {
          t.round(x - 5, y + sy(3), 5, sy(14), 2, col);
          t.round(x + w, y + sy(3), 5, sy(14), 2, col);
        }
        for (const lx of [x + 4, cx, x + w - 5]) t.rect(lx, y + 3, 1, sy(8), sh);
        t.rect(x + 3, y + 1, 6, 1, hl);
      });
    } else {
      // side view, facing right: back of the head is on the left
      shape(c, (t) => {
        if (style === "balding") {
          t.round(x - 1, y + sy(5), 8, sy(8), 2, col);
          t.rect(x, y + sy(5), 5, 1, hl);
          return;
        }
        topExtras(t, style, x, y, w - 2, col);
        if (style === "curly") {
          t.round(x - 3, y - 3, w + 1, capH + 4, 5, col);
          t.round(x - 3, y + 2, 10, sy(11), 3, col);
        } else {
          t.round(x - 1, y - 1, w + 1, style === "crop" ? capH - 1 : capH, 4, col);
          const backW = style === "bob" ? 7 : style === "long" ? 6 : style === "crop" ? 5 : 5;
          const backH = sy(style === "bob" ? 16 : style === "crop" ? 9 : 13);
          t.round(x - 1, y + 2, backW, backH, 2, col);
        }
        const below = r.torso.y + r.torso.h + 1;
        if (style === "long") t.round(x - 2, y + sy(10), 6, below - (y + sy(10)), 2, col);
        if (style === "bun") t.round(x - 4, y, 7, 7, 3, col);
        if (style === "ponytail") {
          t.round(x - 4, y + sy(2), 5, 4, 1, col);
          t.round(x - 5, y + sy(4), 4, sy(11), 1, col);
          t.rect(x - 4, y + sy(3), 1, 3, tie);
        }
        if (style === "twintails") {
          t.round(x - 4, y + sy(3), 5, sy(14), 2, col);
          t.rect(x - 4, y + sy(3) + 1, 5, 1, tie);
        }
        for (let i = 0; i < 6; i++) {
          const len = Math.min(2, bang(style, 10 + i, 16));
          if (len) t.rect(x + w - 6 + i, y + capH - 1, 1, len, col);
        }
        t.rect(x + 4, y, 6, 1, hl);
        t.rect(x + 1, y + 6, 1, sy(6), sh);
      });
    }
    cutArms(c, r);
  };
}

export function drawHairBack(style: HairStyle, col: Rgba): Draw {
  const sh = shade(col, 0.72);
  return (c, r) => {
    if (r.view !== "front") return;
    const { x, y, w, h } = r.head;
    const sy = (n: number) => Math.round((n * h) / 16);
    shape(c, (t) => {
      switch (style) {
        case "bob":
          t.round(x - 2, y + 1, w + 4, sy(15), 4, sh);
          break;
        case "long": {
          const below = r.torso.y + r.torso.h + 2;
          t.round(x - 2, y + 1, w + 4, sy(12), 4, sh);
          t.round(x - 1, y + sy(8), w + 2, below - (y + sy(8)), 3, sh);
          break;
        }
        case "curly":
          t.round(x - 3, y - 1, w + 6, sy(15), 5, sh);
          break;
        case "crop":
        case "balding":
        case "twintails":
          break;
        default:
          t.round(x - 1, y, w + 2, sy(12), 4, sh);
      }
    });
  };
}
