import { type Cell, type Rgba, rgba, shade, shape } from "./cell.js";
import { cutArms, footBox, type Draw, type Leg, type Post, type Rig } from "./rig.js";

const SHADOW: Rgba = [24, 14, 10, 64];
const EYE: Rgba = [34, 24, 22, 255];
const WHITE: Rgba = [250, 248, 242, 255];
const BLUSH: Rgba = [236, 146, 136, 255];
const MOUTH: Rgba = [150, 70, 62, 255];
const LIPS: Rgba = [200, 82, 96, 255];
const BEARD: Rgba = [92, 62, 40, 255];
const BROW_GREY: Rgba = [214, 210, 204, 255];
const WRINKLE: Rgba = [70, 36, 24, 90];
const FRAME: Rgba = [44, 42, 52, 255];
const SWEAT: Rgba = [130, 190, 245, 255];
const ZZZ: Rgba = [214, 230, 255, 255];

export function drawBody(skin: Rgba): Draw {
  const dark = shade(skin, 0.82);
  const deep = shade(skin, 0.68);
  return (c, r) => {
    if (!r.lie) {
      const rx = (r.body === "stocky" ? 9 : r.body === "child" ? 7 : 8) - Math.min(3, r.lift);
      c.ellipse(24, 44, rx, 1.6, SHADOW);
    }

    const leg = (t: Cell, l: Leg, col: Rgba) => {
      t.poly(l.pts, r.legW, col);
      const f = footBox(r, l);
      t.rect(f.x, f.y, f.w, f.h, col);
    };

    for (const l of r.legs.filter((x) => x.behind)) shape(c, (t) => leg(t, l, dark));
    for (const a of r.arms.filter((x) => x.behind)) shape(c, (t) => t.poly(a.pts, r.armW, dark));

    shape(c, (t) => {
      for (const l of r.legs.filter((x) => !x.behind)) leg(t, l, skin);
      const { x, y, w, h } = r.torso;
      t.round(x, y, w, h, 2, skin);
      if (r.view === "side") t.rect(x, y + 1, 1, h - 2, dark);
      else t.rect(x + w - 2, y + 1, 2, h - 2, dark);
    });

    shape(c, (t) => {
      const { x, y, w, h } = r.head;
      const earY = y + Math.round(h / 2);
      if (r.view !== "side") {
        t.rect(x - 2, earY, 2, 3, skin);
        t.rect(x + w, earY, 2, 3, skin);
        t.set(x - 1, earY + 1, deep);
        t.set(x + w, earY + 1, deep);
      }
      t.round(x, y, w, h, 4, skin);
      t.rect(x + 3, y + h - 1, w - 6, 1, dark);
      if (r.view === "side") {
        t.rect(x + 5, earY, 2, 3, dark);
        t.set(x + 5, earY + 1, deep);
      } else {
        t.rect(x + w - 1, y + 5, 1, h - 8, dark);
      }
    });

    for (const a of r.arms.filter((x) => !x.behind)) shape(c, (t) => t.poly(a.pts, r.armW, skin));
  };
}

export const bodyPost: Post = (c, r) => {
  if (r.lie) c.ellipse(25, 42, 17, 2.2, SHADOW, true);
};

// ---------------------------------------------------------------------------

export type FaceStyle =
  | "neutral"
  | "smile"
  | "blink"
  | "lashes"
  | "mustache"
  | "beard"
  | "elder"
  | "glasses";

type Eyes = "open" | "closed" | "half" | "x" | "squint" | "angry";

function eyesFor(r: Rig, style: FaceStyle): Eyes {
  switch (r.pose) {
    case "sleep":
      return "closed";
    case "ko":
      return "x";
    case "hurt":
    case "fall":
      return "squint";
    case "tired":
      return "half";
    case "attackUp":
    case "attackHit":
      return "angry";
    default:
      return style === "blink" ? "half" : "open";
  }
}

function mouthFor(r: Rig, style: FaceStyle): "line" | "smile" | "open" | "small" {
  if (r.pose === "sleep") return "small";
  if (r.pose === "hurt" || r.pose === "fall" || r.pose === "ko" || r.pose === "attackHit") return "open";
  if (r.pose === "tired") return r.phase ? "open" : "small";
  if (r.pose === "cheer" || (r.pose === "jump" && r.phase === 1)) return "smile";
  return style === "smile" || style === "elder" ? "smile" : "line";
}

export function drawFace(style: FaceStyle): Draw {
  return (c, r) => {
    if (r.view === "back") return;
    const { x, y, w, h } = r.head;
    const side = r.view === "side";
    const eyeY = y + Math.round(h * 0.5);
    const inset = Math.round(w * 0.22);
    const eyeXs = side ? [x + w - 5] : [x + inset, x + w - 2 - inset];
    const eyes = eyesFor(r, style);
    const small = style === "elder";

    eyeXs.forEach((ex, i) => {
      const right = !side && i === 1;
      switch (eyes) {
        case "closed":
          c.rect(ex, eyeY + 2, 2, 1, EYE);
          break;
        case "half":
          c.rect(ex, eyeY + 1, 2, 2, EYE);
          c.rect(ex, eyeY + 1, 2, 1, shade(EYE, 1.6));
          break;
        case "x": {
          const bx = right ? ex - 1 : ex;
          for (const [dx, dy] of [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]] as const) c.set(bx + dx, eyeY + dy, EYE);
          break;
        }
        case "squint": {
          const pts = right || side ? [[1, 0], [0, 1], [1, 2]] : [[0, 0], [1, 1], [0, 2]];
          for (const [dx, dy] of pts) c.set(ex + dx!, eyeY + dy!, EYE);
          break;
        }
        default:
          c.rect(ex, eyeY + (small ? 1 : 0), 2, small ? 2 : 3, EYE);
          c.set(ex, eyeY + (small ? 1 : 0), WHITE);
          if (eyes === "angry") {
            const inner = right || side ? ex : ex + 1;
            const outer = right || side ? ex + 1 : ex;
            c.set(outer, eyeY - 2, EYE);
            c.set(inner, eyeY - 1, EYE);
          }
      }

      if (style === "lashes" && eyes !== "x") {
        const ox = side ? ex - 1 : right ? ex + 2 : ex - 1;
        c.set(ox, eyes === "closed" ? eyeY + 2 : eyeY, EYE);
      }
      if (style === "elder") {
        c.rect(ex, eyeY - 1, 2, 1, BROW_GREY);
        c.set(side || right ? ex + 2 : ex - 1, eyeY + 2, WRINKLE);
      }
      if (style === "glasses") {
        c.rect(ex - 1, eyeY - 1, 4, 1, FRAME);
        c.rect(ex - 1, eyeY + 3, 4, 1, FRAME);
        c.rect(ex - 1, eyeY, 1, 3, FRAME);
        c.rect(ex + 2, eyeY, 1, 3, FRAME);
      }
    });

    if (style === "glasses") {
      if (side) c.rect(x + 6, eyeY, eyeXs[0]! - 1 - (x + 6), 1, FRAME);
      else c.rect(eyeXs[0]! + 3, eyeY + 1, eyeXs[1]! - eyeXs[0]! - 4, 1, FRAME);
    }

    if (style !== "beard" && style !== "mustache" && eyes !== "x") {
      if (side) c.rect(eyeXs[0]! + 1, eyeY + 3, 2, 1, BLUSH);
      else {
        c.rect(eyeXs[0]! - 2, eyeY + 3, 2, 1, BLUSH);
        c.rect(eyeXs[1]! + 2, eyeY + 3, 2, 1, BLUSH);
      }
    }

    const my = y + h - 3;
    const mx = side ? x + w - 2 : x + Math.floor(w / 2) - 1;
    if (style === "beard") {
      if (side) c.rect(x + w - 8, my - 1, 7, 4, BEARD);
      else {
        c.rect(x + 3, my - 1, w - 6, 3, BEARD);
        c.rect(x + 5, my + 2, w - 10, 1, BEARD);
      }
    }
    if (style === "mustache") c.rect(side ? mx - 2 : mx - 1, my - 1, side ? 3 : 4, 1, BEARD);

    const lip = style === "lashes" ? LIPS : MOUTH;
    const mouth = mouthFor(r, style);
    const mouthCol = style === "beard" ? EYE : lip;
    if (side) {
      c.set(mx, my, mouthCol);
      if (mouth === "open") c.set(mx, my + 1, EYE);
      if (mouth === "smile") c.set(mx - 1, my - 1, mouthCol);
    } else if (mouth === "open") {
      c.rect(mx, my - 1, 2, 2, EYE);
    } else if (mouth === "smile") {
      c.set(mx - 1, my - 1, mouthCol);
      c.rect(mx, my, 2, 1, mouthCol);
      c.set(mx + 2, my - 1, mouthCol);
    } else if (mouth === "small") {
      c.set(mx + 1, my, mouthCol);
    } else {
      c.rect(mx, my, 2, 1, mouthCol);
    }

    if (r.pose === "tired") {
      const sx = side ? x - 2 : x + w + 1;
      const sy = y + 3 + r.phase * 2;
      c.rect(sx, sy + 1, 2, 2, SWEAT);
      c.set(sx, sy, SWEAT);
      c.set(sx, sy + 1, WHITE);
    }

    cutArms(c, r);
  };
}

/** Floating "z" above a sleeping head, drawn upright after rotation. */
export const facePost: Post = (c, r, mirrored) => {
  if (r.pose !== "sleep") return;
  const headLeft = (r.lie === 1) !== mirrored;
  const glyph = (gx: number, gy: number, s: number) => {
    c.rect(gx, gy, s, 1, ZZZ);
    for (let i = 1; i < s - 1; i++) c.set(gx + s - 1 - i, gy + i, ZZZ);
    c.rect(gx, gy + s - 1, s, 1, ZZZ);
  };
  const bx = headLeft ? 12 : 31;
  glyph(bx, 15, 4);
  if (r.phase) glyph(bx + (headLeft ? 5 : -6), 8, 5);
};

export const SKIN = {
  light: rgba("#e8c4a0"),
  tan: rgba("#c9956c"),
  deep: rgba("#8a5a3c"),
};
