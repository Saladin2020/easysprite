import { type Cell, type Pt, type Rgba, polyLen, shade, shape, tint, trimPoly } from "./cell.js";
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

export type PantsKind = "pants" | "shorts" | "skirt" | "jeans" | "sarong" | "fisherman";

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
      return l.pts;
    };
    const legW = kind === "fisherman" ? r.legW + 2 : kind === "sarong" ? r.legW + 1 : r.legW;

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
