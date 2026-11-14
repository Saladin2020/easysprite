import { Cell, type Pt, type Rgba, polyLen, shade, shape, tint, trimPoly } from "./cell.js";
import { cutArms, torsoCx, type Arm, type Draw, type Leg, type Rig } from "./rig.js";

// ---------------------------------------------------------------------------
// Muslim community wear (southern Thai / Thai-Malay): hijab and tudung, kopiah and
// songkok caps, jubah (thobe), baju melayu, baju kurung and kain pelekat.
// Everything is a normal layered part, so it mixes with the rest of the library.

const GOLD: Rgba = [214, 170, 80, 255];
const GOLD_DK: Rgba = [168, 124, 52, 255];

/** Fill each row between the leftmost and rightmost painted pixel (turns two legs into one hanging cloth). */
function fillRows(t: Cell, top: number, bottom: number, paint: (lo: number, hi: number, yy: number) => void): void {
  for (let yy = top; yy <= bottom; yy++) {
    let lo = 99;
    let hi = -1;
    for (let xx = 0; xx < 48; xx++) {
      if (t.alpha(xx, yy) === 0) continue;
      lo = Math.min(lo, xx);
      hi = Math.max(hi, xx);
    }
    if (hi >= lo) paint(lo, hi, yy);
  }
}

const eraseEllipse = (t: Cell, cx: number, cy: number, rx: number, ry: number) => {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if (((x - cx) * (x - cx)) / (rx * rx) + ((y - cy) * (y - cy)) / (ry * ry) <= 1) t.erase(x, y);
    }
  }
};

// ---------------------------------------------------------------------------
// Hijab / tudung (hair_front slot). Covers hair, ears and neck in every direction,
// leaves an oval face opening, and drapes over the shoulders and chest.

export type HijabStyle = "wrap" | "shawl" | "sarung" | "school";

/** How far below the top of the torso the drape reaches. */
const DRAPE: Record<HijabStyle, (r: Rig) => number> = {
  wrap: (r) => Math.round(r.torso.h * 0.45),
  shawl: (r) => Math.round(r.torso.h * 0.6),
  sarung: (r) => Math.round(r.torso.h * 0.5),
  school: (r) => r.torso.h - 1,
};

export function drawHijab(style: HijabStyle, col: Rgba): Draw {
  const sh = shade(col, 0.8);
  const deep = shade(col, 0.66);
  const hl = tint(col, 0.28);
  return (c, r) => {
    const { x, y, w, h } = r.head;
    const sy = (n: number) => Math.round((n * h) / 16);
    const front = r.view === "front";
    const back = r.view === "back";
    const side = r.view === "side";
    const cx = torsoCx(r);
    const drapeBottom = r.torso.y + DRAPE[style](r);
    const tw = r.torso.w;

    shape(c, (t) => {
      // the head wrap: a little larger than the head so it reads as cloth, not a helmet
      t.round(x - 2, y - 2, w + 4, h + 3, 5, col);
      if (style === "sarung" && !back) {
        // tudung sarung: the stiff forehead "awning" (ซุ้ม) above the face
        if (side) t.rect(x + w - 6, y + sy(3), 8, 2, sh);
        else t.round(x + 1, y + sy(3), w - 2, 2, 1, sh);
      }

      // drape over neck, shoulders and chest
      const dTop = y + h - 1;
      if (side) {
        // wraps the neck and falls over the shoulder and chest (not down the back like hair)
        t.round(x, dTop - 3, w - 1, drapeBottom - dTop + 4, 3, col);
        if (style === "shawl") t.round(x - 1, dTop - 1, 4, drapeBottom - dTop + 2, 1, sh);
      } else {
        const half = Math.floor(tw / 2) + (style === "school" ? 3 : 2);
        for (let yy = dTop; yy <= drapeBottom; yy++) {
          const k = (yy - dTop) / Math.max(1, drapeBottom - dTop);
          const hw = Math.round(Math.min(half, Math.floor(w / 2) - 1 + k * 6));
          // rounded hem: the last two rows pull in
          const pull = yy === drapeBottom ? 2 : yy === drapeBottom - 1 ? 1 : 0;
          t.rect(cx - hw + pull, yy, hw * 2 - 2 * pull, 1, col);
        }
      }

      if (!back) {
        // face opening: an oval that frames brows, eyes, cheeks and mouth (the outline then traces it)
        const fy = y + h * 0.62;
        const ry = h * 0.42;
        if (side) eraseEllipse(t, x + w - 2.5, fy, 4.8, ry);
        else eraseEllipse(t, x + (w - 1) / 2, fy, w / 2 - 2.4, ry);
      }

      // folds and shading
      if (front) {
        // wrap seam under the chin
        t.rect(cx - 3, y + h, 6, 1, sh);
        t.rect(x - 1, y + sy(4), 1, sy(9), sh);
        t.rect(x + w, y + sy(4), 1, sy(9), deep);
        if (style === "shawl") {
          // pashmina end thrown over one shoulder
          t.line([cx + 2, y + h + 1], [cx + Math.floor(tw / 2) + 1, drapeBottom], 1, deep);
          t.rect(cx + Math.floor(tw / 2) - 1, drapeBottom - 1, 3, 3, sh);
        }
        if (style === "school") t.rect(cx - 4, drapeBottom - 1, 8, 1, sh);
        t.rect(x + 2, y - 1, 5, 1, hl);
      } else if (back) {
        t.rect(cx - 1, y + 3, 2, h - 3, sh);
        t.rect(x + 1, y + h - 1, w - 2, 1, sh);
        t.rect(x + 3, y - 1, 6, 1, hl);
        if (style === "shawl") t.rect(cx + 2, y + h, 2, drapeBottom - y - h, deep);
      } else {
        t.rect(x - 1, y + 3, 1, h - 2, sh);
        t.rect(x + 2, y + h, 4, 1, sh);
        t.rect(x + 3, y - 1, 6, 1, hl);
      }
    });
    cutArms(c, r);
  };
}

// ---------------------------------------------------------------------------
// Kopiah (white knitted cap) and songkok (black velvet cap): accessory slot, like acc_cap.

export type CapKind = "kopiah" | "songkok";

export function drawMuslimCap(kind: CapKind, col: Rgba): Draw {
  const sh = shade(col, 0.82);
  const hl = tint(col, 0.35);
  return (c, r) => {
    const { x, y, w } = r.head;
    const side = r.view === "side";
    shape(c, (t) => {
      if (kind === "kopiah") {
        // low, round skullcap with an openwork knit band
        const cx0 = side ? x + 1 : x + 1;
        const cw = side ? w - 2 : w - 2;
        t.round(cx0, y - 3, cw, 6, 3, col);
        for (let px = cx0 + 1; px < cx0 + cw - 1; px += 2) t.set(px, y + 1, sh);
        for (let px = cx0 + 2; px < cx0 + cw - 1; px += 2) t.set(px, y, sh);
        t.rect(cx0 + 2, y + 2, cw - 4, 1, sh);
        t.rect(cx0 + 3, y - 2, 3, 1, hl);
      } else {
        // songkok: taller, flat-topped oval of black velvet, a little narrower than the head
        const cx0 = side ? x : x + 1;
        const cw = side ? w - 1 : w - 2;
        t.rect(cx0, y - 3, cw, 6, col);
        t.rect(cx0 + 1, y - 4, cw - 2, 1, col);
        t.rect(cx0, y + 2, cw, 1, sh);
        t.rect(cx0 + 2, y - 3, cw - 4, 1, hl);
        t.rect(side ? cx0 + 1 : cx0 + cw - 3, y - 2, 1, 4, sh);
      }
    });
    cutArms(c, r);
  };
}

// ---------------------------------------------------------------------------
// Long garments: jubah (thobe), baju kurung, baju melayu (+ samping).

export type RobeKind = "jubah" | "kurung" | "melayu";

const longSleeve = (a: Arm): Pt[] => trimPoly(a.pts, Math.max(1, polyLen(a.pts) - 1.5));

export function drawMuslimTop(kind: RobeKind, main: Rgba, accent: Rgba): Draw {
  const sh = shade(main, 0.8);
  const deep = shade(main, 0.66);
  const hl = tint(main, 0.3);
  const accSh = shade(accent, 0.75);
  return (c, r) => {
    const { x, y, w, h } = r.torso;
    const hy = r.hipY;
    const front = r.view === "front";
    const back = r.view === "back";
    const side = r.view === "side";
    const cx = torsoCx(r);
    const legLen = (l: Leg) => polyLen(l.pts);
    // jubah: to the ankle; kurung: to the knee; melayu: tunic to the upper thigh (+ samping)
    const hang = (l: Leg): Pt[] =>
      kind === "jubah"
        ? trimPoly(l.pts, Math.max(2, legLen(l) - 1))
        : kind === "kurung"
          ? trimPoly(l.pts, Math.max(2, legLen(l) * 0.62))
          : trimPoly(l.pts, Math.max(1, legLen(l) * 0.38));

    for (const a of r.arms.filter((q) => q.behind)) shape(c, (t) => t.poly(longSleeve(a), r.armW, shade(main, 0.72)));

    shape(c, (t) => {
      t.round(x, y, w, hy - y + 2, 2, main);
      for (const l of r.legs) t.poly(hang(l), r.legW + 2, main);
      const bottom = Math.max(...r.legs.map((l) => hang(l).at(-1)![1]));
      fillRows(t, hy - 1, bottom, (lo, hi, yy) => {
        t.rect(lo, yy, hi - lo + 1, 1, yy === bottom ? deep : main);
        if (yy < bottom && kind !== "melayu") for (let px = lo + 2; px < hi - 1; px += 4) t.set(px, yy, sh);
      });

      // shading on the far side
      if (side) t.rect(x, y + 2, 1, hy - y - 1, sh);
      else t.rect(x + w - 2, y + 2, 2, hy - y - 1, sh);

      if (kind === "melayu") {
        // samping: a short songket wrap from the waist to mid-thigh, over the tunic
        const sTop = hy - 2;
        const sBottom = Math.min(bottom + 1, hy + Math.max(3, Math.round(4 * r.scale)));
        fillRows(t, sTop, sBottom, (lo, hi, yy) => {
          for (let px = lo; px <= hi; px++) {
            const motif = (px + yy) % 4 === 0 || (px - yy) % 4 === 0;
            t.set(px, yy, yy === sTop ? GOLD : motif ? GOLD : accent);
          }
          if (yy === sBottom) t.rect(lo, yy, hi - lo + 1, 1, accSh);
        });
        if (front) t.rect(cx - 1, sTop + 1, 2, sBottom - sTop - 1, GOLD_DK);
      } else if (kind === "jubah") {
        if (front) t.rect(cx, y + 2, 1, Math.max(2, h - 4), sh);
        t.rect(x, hy - 2, w, 1, sh);
      } else {
        // baju kurung: no waist seam, a soft side slit line
        if (front) t.rect(x + 1, hy, 1, 2, sh);
      }

      // necklines
      if (front) {
        if (kind === "melayu") {
          // cekak musang stand collar with three gold buttons
          t.rect(cx - 3, y, 6, 1, deep);
          t.rect(cx, y + 1, 1, 4, deep);
          t.set(cx + 1, y + 1, GOLD);
          t.set(cx + 1, y + 3, GOLD);
          t.set(cx + 1, y + 5, GOLD);
        } else if (kind === "jubah") {
          t.rect(cx - 2, y, 4, 1, deep);
          t.rect(cx - 1, y + 1, 1, 3, deep);
          t.set(cx, y + 2, hl);
        } else {
          // kurung: round neck with a short tulang belut piping
          t.rect(cx - 2, y, 4, 1, deep);
          t.rect(cx - 1, y + 1, 2, 1, accent);
        }
      } else if (back) {
        t.rect(cx - 2, y, 4, 1, deep);
      } else {
        t.rect(x + w - 3, y, 3, 1, deep);
        if (kind === "melayu") t.set(x + w - 1, y + 2, GOLD);
      }
      t.rect(x + 1, y, 3, 1, hl);
    });
    cutArms(c, r);

    for (const a of r.arms.filter((q) => !q.behind)) {
      shape(c, (t) => {
        const s = longSleeve(a);
        t.poly(s, r.armW, main);
        const [ex, ey] = s.at(-1)!;
        t.set(ex, ey, kind === "melayu" ? accent : sh);
      });
    }
  };
}

// ---------------------------------------------------------------------------
// Kain pelekat: the checked cotton sarong men wear for everyday, prayer and the beach.

export function drawKainPelekat(col: Rgba, stripe: Rgba): Draw {
  const sh = shade(col, 0.72);
  const check = shade(col, 0.55);
  const hl = tint(col, 0.25);
  return (c, r) => {
    const { x, w } = r.torso;
    const hy = r.hipY;
    const hem = (l: Leg): Pt[] => trimPoly(l.pts, Math.max(1, polyLen(l.pts) - 1.5));
    shape(c, (t) => {
      t.rect(x, hy - 3, w, 4, col);
      for (const l of r.legs) t.poly(hem(l), r.legW + 1, col);
      const bottom = Math.max(...r.legs.map((l) => hem(l).at(-1)![1]));
      fillRows(t, hy - 3, bottom, (lo, hi, yy) => {
        for (let px = lo; px <= hi; px++) {
          const vx = (px - lo) % 4 === 1;
          const hz = (yy - hy) % 4 === 1;
          t.set(px, yy, vx && hz ? check : vx || hz ? sh : col);
          if ((px - lo) % 8 === 3 && !hz) t.set(px, yy, stripe);
        }
        if (yy === bottom) t.rect(lo, yy, hi - lo + 1, 1, check);
      });
      // rolled waist (the sarong is folded and tucked, not belted)
      t.rect(x, hy - 3, w, 1, hl);
      t.rect(x, hy - 2, w, 1, check);
      if (r.view === "front") t.rect(torsoCx(r) - 1, hy - 3, 3, 2, hl);
    });
    cutArms(c, r);
  };
}
