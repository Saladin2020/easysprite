import { Cell, type Pt, type Rgba, polyLen, shade, shape, tint, trimPoly } from "./cell.js";
import { ankleOf, cutArms, footBox, torsoCx, type Arm, type Draw, type Leg, type Rig } from "./rig.js";

const WHITE: Rgba = [250, 248, 242, 255];
const CREAM: Rgba = [236, 230, 214, 255];
const LEATHER: Rgba = [110, 72, 42, 255];
const GOLD: Rgba = [214, 170, 80, 255];

export type ShirtKind =
  | "blazer"
  | "farmer"
  | "apron"
  | "hoodie"
  | "tank"
  | "tshirt"
  | "dress"
  | "mohom"
  | "armor"
  | "cardigan";

const SLEEVES: Record<ShirtKind, "long" | "short" | "none"> = {
  blazer: "long",
  farmer: "short",
  apron: "short",
  hoodie: "long",
  tank: "none",
  tshirt: "short",
  dress: "short",
  mohom: "long",
  armor: "long",
  cardigan: "long",
};

export function drawShirt(kind: ShirtKind, main: Rgba, accent: Rgba): Draw {
  const cloth = kind === "apron" ? accent : main;
  const sh = shade(cloth, 0.78);
  const mainSh = shade(main, 0.75);
  const neck = shade(main, 0.6);
  const sleeveCol = kind === "armor" ? shade(main, 0.7) : cloth;
  const sleeves = SLEEVES[kind];

  const sleeveOf = (a: Arm): Pt[] | null => {
    if (sleeves === "none") return null;
    return trimPoly(a.pts, sleeves === "long" ? Math.max(1, polyLen(a.pts) - 2.5) : 2);
  };

  const torso = (t: Cell, r: Rig) => {
    const { x, y, w, h } = r.torso;
    const cx = torsoCx(r);
    const longHem = kind === "blazer" || kind === "hoodie" || kind === "cardigan" || kind === "mohom";
    const len = longHem ? h + 1 : h;
    const front = r.view === "front";
    const back = r.view === "back";
    const side = r.view === "side";

    if (kind === "dress") {
      const rows = Math.round(r.scale * 6) + 3;
      for (let i = 0; i < rows; i++) {
        const g = Math.floor(i / 2);
        t.rect(x - g, r.hipY - 2 + i, w + 2 * g, 1, i === rows - 1 ? sh : main);
      }
    }
    if (kind === "tank") {
      if (side) t.rect(cx - 1, y, 2, 2, main);
      else {
        t.rect(cx - 4, y, 2, 2, main);
        t.rect(cx + 2, y, 2, 2, main);
      }
      t.round(x, y + 2, w, len - 2, 2, main);
    } else {
      t.round(x, y, w, len, 2, cloth);
    }
    if (side) t.rect(x, y + 2, 1, len - 3, sh);
    else t.rect(x + w - 2, y + 2, 2, len - 3, sh);
    t.rect(x + 1, y + len - 1, w - 2, 1, sh);

    switch (kind) {
      case "blazer":
        if (front) {
          t.rect(cx - 3, y, 6, 1, WHITE);
          t.rect(cx - 2, y + 1, 4, 1, WHITE);
          t.rect(cx - 1, y + 1, 2, Math.min(5, h - 3), accent);
          t.set(cx - 3, y + 1, mainSh);
          t.set(cx - 2, y + 2, mainSh);
          t.set(cx + 2, y + 1, mainSh);
          t.set(cx + 1, y + 2, mainSh);
          t.set(cx - 2, y + h - 4, WHITE);
          t.set(cx - 2, y + h - 2, WHITE);
        } else if (back) {
          t.rect(cx - 3, y, 6, 1, WHITE);
          t.rect(cx - 1, y + 3, 2, len - 4, mainSh);
        } else {
          t.rect(x + w - 4, y, 3, 1, WHITE);
          t.rect(x + w - 1, y + 1, 1, 4, accent);
        }
        break;
      case "farmer":
      case "tshirt":
        if (side) t.rect(x + w - 4, y, 3, 1, neck);
        else t.rect(cx - 2, y, 4, 1, neck);
        if (kind === "farmer") {
          if (front) {
            t.rect(x + 2, y + 3, 3, 3, mainSh);
            t.set(x + 3, y + 3, accent);
          } else if (side) t.rect(x + w - 4, y + 3, 2, 2, mainSh);
        } else if (front) {
          t.rect(cx - 1, y + 3, 3, 2, accent);
        }
        break;
      case "apron":
        if (front) {
          t.rect(cx - 3, y, 1, 2, main);
          t.rect(cx + 2, y, 1, 2, main);
          t.rect(cx - 3, y + 2, 6, 3, main);
          t.rect(x + 1, y + 5, w - 2, h - 2, main);
          t.rect(cx - 2, y + h - 2, 4, 1, mainSh);
          t.rect(x + w - 2, y + 5, 1, h - 2, mainSh);
        } else if (back) {
          t.rect(cx - 3, y, 1, 6, main);
          t.rect(cx + 2, y, 1, 6, main);
          t.rect(x, y + 6, w, 1, main);
          t.rect(cx - 2, y + 6, 4, 2, main);
          t.set(cx - 1, y + 7, mainSh);
        } else {
          t.rect(x + w - 5, y, 1, 3, main);
          t.rect(x + w - 3, y + 2, 4, h + 1, main);
          t.rect(x, y + 6, w - 3, 1, main);
          t.rect(x + w, y + 3, 1, h - 1, mainSh);
        }
        break;
      case "hoodie": {
        const str = tint(accent, 0.2);
        if (front) {
          t.rect(x, y, 3, 2, sh);
          t.rect(x + w - 3, y, 3, 2, sh);
          t.rect(cx - 2, y + 1, 1, 3, str);
          t.rect(cx + 1, y + 1, 1, 3, str);
          t.rect(cx - 3, y + h - 4, 6, 3, sh);
          t.rect(cx - 2, y + h - 3, 4, 1, shade(main, 0.65));
        } else if (back) {
          t.round(cx - 4, y - 1, 8, 5, 2, sh);
          t.rect(cx - 2, y + 1, 4, 1, shade(main, 0.6));
        } else {
          t.round(x - 1, y - 1, 5, 5, 2, sh);
          t.rect(x + w - 3, y + 1, 1, 3, str);
        }
        break;
      }
      case "dress":
        t.rect(x, y + h - 3, w, 1, accent);
        if (front) t.rect(cx - 2, y, 4, 1, WHITE);
        else if (side) t.rect(x + w - 4, y, 3, 1, WHITE);
        else t.rect(cx - 1, y + h - 4, 2, 2, accent);
        break;
      case "mohom": {
        if (front) {
          t.rect(cx - 2, y, 4, 1, neck);
          t.rect(cx, y + 1, 1, h - 3, neck);
          for (let by = y + 2; by < y + h - 3; by += 2) t.set(cx + 1, by, CREAM);
        } else if (side) {
          t.rect(x + w - 4, y, 3, 1, neck);
          t.rect(x + w - 2, y + 1, 1, h - 3, neck);
        }
        // pha khao ma: checked sash at the waist
        const sy = y + h - 3;
        for (let px = x; px < x + w; px++) {
          for (let row = 0; row < 2; row++) t.set(px, sy + row, (px + row) % 2 ? accent : tint(accent, 0.55));
        }
        if (front) t.rect(x + w - 3, sy + 2, 2, 2, accent);
        break;
      }
      case "armor":
        t.rect(cx - 1, y + 1, 2, h - 3, tint(main, 0.35));
        t.rect(x, y + h - 2, w, 1, LEATHER);
        if (!back) t.set(side ? x + w - 2 : cx, y + h - 2, GOLD);
        break;
      case "cardigan":
        if (front) {
          t.rect(cx - 1, y, 2, len, CREAM);
          t.set(cx - 2, y + 3, accent);
          t.set(cx - 2, y + 6, accent);
          t.rect(x + 1, y + h - 4, 3, 2, sh);
          t.rect(x + w - 4, y + h - 4, 3, 2, sh);
        } else if (side) {
          t.rect(x + w - 2, y, 1, len, CREAM);
        }
        t.rect(x, y + len - 1, w, 1, shade(main, 0.65));
        break;
      case "tank":
        break;
    }
  };

  return (c, r) => {
    for (const a of r.arms.filter((x) => x.behind)) {
      const s = sleeveOf(a);
      if (s) shape(c, (t) => t.poly(s, r.armW, shade(sleeveCol, 0.85)));
    }
    shape(c, (t) => torso(t, r));
    cutArms(c, r);
    for (const a of r.arms.filter((x) => !x.behind)) {
      const s = sleeveOf(a);
      if (s) shape(c, (t) => t.poly(s, r.armW, sleeveCol));
    }
    if (kind === "armor" && r.view !== "back") {
      const near = r.arms.filter((a) => !a.behind);
      for (const a of r.view === "side" ? near.slice(-1) : near) {
        const [sx, sy] = a.pts[0]!;
        shape(c, (t) => {
          t.round(sx - 2, sy - 1, 5, 3, 1, main);
          t.set(sx - 1, sy - 1, tint(main, 0.4));
        });
      }
    }
  };
}

// ---------------------------------------------------------------------------

export type PantsKind = "pants" | "shorts" | "skirt" | "jeans" | "sarong" | "fisherman" | "sabong";

export function drawPants(kind: PantsKind, col: Rgba): Draw {
  const sh = shade(col, 0.78);
  const hl = tint(col, 0.22);
  return (c, r) => {
    const { x, w } = r.torso;
    const hy = r.hipY;

    if (kind === "skirt") {
      shape(c, (t) => {
        const rows = Math.round(r.scale * 7) + 1;
        for (let i = 0; i < rows; i++) {
          const g = Math.floor(i / 3);
          t.rect(x - g, hy - 3 + i, w + 2 * g, 1, i === rows - 1 ? sh : col);
        }
        for (let px = x + 2; px < x + w - 1; px += 3) t.rect(px, hy, 1, rows - 4, sh);
      });
      cutArms(c, r);
      return;
    }

    const len = (l: Leg) => polyLen(l.pts);
    const legPts = (l: Leg) => {
      if (kind === "shorts") return trimPoly(l.pts, Math.max(2, 3 * r.scale));
      if (kind === "fisherman" || kind === "sarong") return trimPoly(l.pts, Math.max(1, len(l) - 1.5));
      if (kind === "sabong") return trimPoly(l.pts, Math.max(2, len(l) - shinGap(r)));
      return l.pts;
    };
    const legW = kind === "fisherman" ? r.legW + 2 : kind === "sarong" || kind === "sabong" ? r.legW + 1 : r.legW;

    if (kind === "sabong") {
      shape(c, (t) => {
        t.rect(x, hy - 3, w, 4, col);
        for (const l of r.legs) t.poly(legPts(l), legW, col);
        const bottom = Math.max(...r.legs.map((l) => legPts(l).at(-1)![1]));
        fillSkirtRows(t, hy, bottom, col, sh, shade(col, 0.62));
        // rolled waist fold (the robe is tucked, not belted)
        t.rect(x, hy - 3, w, 1, hl);
        t.rect(x, hy - 2, w, 1, sh);
      });
      cutArms(c, r);
      return;
    }

    if (kind === "sarong") {
      shape(c, (t) => {
        t.rect(x, hy - 3, w, 4, col);
        for (const l of r.legs) t.poly(legPts(l), legW, col);
        const bottom = Math.max(...r.legs.map((l) => legPts(l).at(-1)![1]));
        for (let yy = hy; yy <= bottom; yy++) {
          let lo = 99;
          let hi = -1;
          for (let xx = 0; xx < 48; xx++) {
            if (t.alpha(xx, yy) === 0) continue;
            lo = Math.min(lo, xx);
            hi = Math.max(hi, xx);
          }
          if (hi >= lo) {
            t.rect(lo, yy, hi - lo + 1, 1, yy >= bottom - 1 ? GOLD : col);
            if ((yy - hy) % 3 === 2 && yy < bottom - 1) t.rect(lo + 1, yy, hi - lo - 1, 1, sh);
          }
        }
        t.rect(x, hy - 3, w, 1, GOLD);
      });
      cutArms(c, r);
      return;
    }

    for (const l of r.legs.filter((x) => x.behind)) shape(c, (t) => t.poly(legPts(l), legW, sh));
    shape(c, (t) => {
      t.rect(x - (kind === "fisherman" ? 1 : 0), hy - 3, w + (kind === "fisherman" ? 2 : 0), 4, col);
      t.rect(x, hy - 3, w, 1, sh);
      for (const l of r.legs.filter((x) => !x.behind)) {
        const pts = legPts(l);
        t.poly(pts, legW, col);
        const [ex, ey] = pts.at(-1)!;
        if (kind === "jeans") {
          t.rect(ex - 1, ey, r.legW, 1, hl);
          t.line([pts[0]![0] + 1, hy + 1], [ex + 1, ey - 2], 1, hl);
        }
        if (kind === "fisherman") t.rect(ex - 2, ey, legW, 1, sh);
      }
      if (kind === "fisherman" && r.view === "front") t.rect(torsoCx(r) - 1, hy - 2, 2, 3, sh);
    });
    cutArms(c, r);
  };
}

// ---------------------------------------------------------------------------

export type ShoeKind = "dark" | "boots" | "sandals" | "sneakers";

export function drawShoes(kind: ShoeKind, col: Rgba): Draw {
  const sole = kind === "sneakers" ? WHITE : shade(col, 0.6);
  const hl = tint(col, 0.3);
  return (c, r) => {
    const one = (l: Leg, base: Rgba) => {
      const f = footBox(r, l);
      if (kind === "sandals") {
        c.rect(f.x, f.y + f.h - 1, f.w, 1, sole);
        c.rect(f.x + 1, f.y + 1, f.w - 2, 1, base);
        return;
      }
      shape(c, (t) => {
        if (kind === "boots") {
          const [ax] = ankleOf(l);
          const sx = ax - Math.floor((r.legW - 1) / 2);
          t.rect(sx, f.y - 3, r.legW, 3, base);
          t.rect(sx, f.y - 3, r.legW, 1, hl);
        }
        t.rect(f.x, f.y, f.w, f.h, base);
        if (r.view === "side") t.erase(f.x + f.w - 1, f.y);
        t.rect(f.x, f.y + f.h - 1, f.w, 1, sole);
        if (kind === "sneakers") t.rect(f.x + 1, f.y, f.w - 2, 1, WHITE);
        else t.set(f.x + 1, f.y, hl);
      });
    };
    for (const l of r.legs.filter((x) => x.behind)) one(l, shade(col, 0.8));
    for (const l of r.legs.filter((x) => !x.behind)) one(l, col);
  };
}

// ---------------------------------------------------------------------------
// Thai Buddhist monk robe (จีวร / chiwon) and its helpers

/** How much shin the robe hem leaves visible above the ankle. */
const shinGap = (r: Rig): number => Math.max(2, Math.round(3 * r.scale));

/** Fill each row between the leftmost and rightmost painted pixel: turns two legs into one hanging cloth. */
function fillSkirtRows(t: Cell, top: number, bottom: number, col: Rgba, pleat: Rgba, hem: Rgba): void {
  for (let yy = top; yy <= bottom; yy++) {
    let lo = 99;
    let hi = -1;
    for (let xx = 0; xx < 48; xx++) {
      if (t.alpha(xx, yy) === 0) continue;
      lo = Math.min(lo, xx);
      hi = Math.max(hi, xx);
    }
    if (hi < lo) continue;
    t.rect(lo, yy, hi - lo + 1, 1, yy === bottom ? hem : col);
    if (yy < bottom) for (let px = lo + 2; px < hi - 1; px += 3) t.set(px, yy, pleat);
  }
}

/**
 * Full-length saffron robe: drapes over the left shoulder, leaves the right shoulder and arm bare,
 * and hangs to the shins so it works with no pants (or over `pants_sabong`).
 */
export function drawMonkRobe(col: Rgba): Draw {
  const sh = shade(col, 0.8);
  const deep = shade(col, 0.62);
  const hl = tint(col, 0.28);
  return (c, r) => {
    const { x, y, w } = r.torso;
    const hy = r.hipY;
    const front = r.view === "front";
    const back = r.view === "back";
    const side = r.view === "side";
    const drop = shinGap(r);
    const shins = (l: Leg): Pt[] => trimPoly(l.pts, Math.max(2, polyLen(l.pts) - drop));
    // Arm wrapped in the robe: the monk's left. Front view: screen right; back: screen left; side (facing right): far arm.
    const draped = (a: Arm, i: number) => (side ? a.behind : front ? i === 1 : i === 0);
    const sleeve = (a: Arm): Pt[] => trimPoly(a.pts, Math.max(2, polyLen(a.pts) * 0.55));

    r.arms.forEach((a, i) => {
      if (a.behind && draped(a, i)) shape(c, (t) => t.poly(sleeve(a), r.armW + 1, sh));
    });

    shape(c, (t) => {
      // upper robe + hanging cloth over both legs
      t.round(x, y, w, hy - y + 2, 2, col);
      for (const l of r.legs) t.poly(shins(l), r.legW + 2, col);
      const bottom = Math.max(...r.legs.map((l) => shins(l).at(-1)![1]));
      fillSkirtRows(t, hy - 1, bottom, col, sh, deep);

      // bare right shoulder: a diagonal opening from one armpit up to the opposite shoulder
      const rows = Math.max(4, Math.round((hy - y) * 0.5));
      for (let i = 0; i < rows; i++) {
        const bare = Math.round((w - 4) * (1 - i / rows));
        if (bare <= 0) continue;
        for (let k = 0; k < bare; k++) {
          // front: monk's right = screen left; back: screen right; side: front of chest (screen right)
          const px = front ? x + k : x + w - 1 - k;
          if (front || back || k < bare - 1) t.erase(px, y + i);
        }
        // fold line along the opening edge
        const ex = front ? x + bare : x + w - 1 - bare;
        t.set(ex, y + i, i === 0 ? hl : deep);
      }

      // over-shoulder band (the folded sanghati) and a drape line down the body
      if (front) {
        t.rect(x + w - 3, y, 2, 1, hl);
        t.line([x + w - 3, y + 1], [x + 1, hy - 1], 1, sh);
      } else if (back) {
        t.rect(x + 1, y, 3, 1, hl);
        t.line([x + 2, y + 1], [x + w - 2, hy - 1], 1, sh);
        t.rect(x + 3, y + 2, 1, hy - y - 3, sh);
      } else {
        t.rect(x, y, 3, 1, hl);
        t.rect(x, y + 1, 1, hy - y, sh);
      }
      // tucked waist roll
      t.rect(x, hy - 2, w, 1, sh);
    });
    cutArms(c, r);

    r.arms.forEach((a, i) => {
      if (!a.behind && draped(a, i)) {
        shape(c, (t) => {
          const s = sleeve(a);
          t.poly(s, r.armW + 1, col);
          const [ex, ey] = s.at(-1)!;
          t.set(ex, ey, deep);
        });
      }
    });
  };
}

// ---------------------------------------------------------------------------
// Shaved head: a translucent stubble cap so it works on every skin tone.

export function drawShavedHead(col: Rgba): Draw {
  const cap: Rgba = [col[0], col[1], col[2], 64];
  const edge: Rgba = [col[0], col[1], col[2], 110];
  return (c, r) => {
    const { x, y, w, h } = r.head;
    const sy = (n: number) => Math.round((n * h) / 16);
    const t = new Cell();
    if (r.view === "front") {
      t.round(x + 1, y + 1, w - 2, sy(6), 3, cap);
      for (let i = 2; i < w - 2; i++) t.set(x + i, y + sy(6), edge);
    } else if (r.view === "back") {
      t.round(x + 1, y + 1, w - 2, h - sy(4), 3, cap);
    } else {
      t.round(x + 1, y + 1, w - 3, sy(5), 3, cap);
      t.round(x + 1, y + 2, 6, h - sy(5), 2, cap);
    }
    for (let yy = 0; yy < 48; yy++) for (let xx = 0; xx < 48; xx++) if (t.alpha(xx, yy) > 0) c.copyPixel(t, xx, yy);
    // a one-pixel shine so the scalp reads as round
    c.set(x + (r.view === "side" ? 6 : 4), y + 2, [255, 255, 255, 70]);
  };
}
