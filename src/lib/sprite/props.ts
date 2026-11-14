import { type Cell, type Pt, type Rgba, rgba, shade, shape, tint, trimPoly } from "./cell.js";
import { cutArms, hideBehindBody, holdingHand, torsoCx, type Draw, type Rig } from "./rig.js";

const WOOD: Rgba = [146, 98, 58, 255];
const LEATHER: Rgba = [96, 60, 36, 255];
const GOLD: Rgba = [214, 170, 80, 255];
const LINE: Rgba = [232, 232, 222, 255];
const SWOOSH: Rgba = [255, 255, 255, 170];
const SWOOSH_SOFT: Rgba = [255, 255, 255, 90];
const YELLOW: Rgba = [246, 214, 92, 255];
const LEAF: Rgba = [90, 150, 70, 255];

export type AccKind =
  | "backpack"
  | "basket"
  | "cap"
  | "fishing"
  | "hoe"
  | "sword"
  | "cane"
  | "ngob"
  | "flower"
  | "alms_bowl";

interface Pole {
  butt: Pt;
  tip: Pt;
  /** Which way blades / hooks face horizontally. */
  out: 1 | -1;
}

const lying = (r: Rig) => r.pose === "ko" || r.pose === "sleep";
const clampX = (v: number) => Math.max(0, Math.min(47, v));

function poleFor(r: Rig, baseReach: number, lean: number, mode: "up" | "down"): Pole {
  const reach = Math.round(baseReach * Math.max(0.8, r.scale));
  const ty = r.torso.y;
  const [gx, gy] = holdingHand(r);
  const side = r.view === "side";
  const out: 1 | -1 = side ? 1 : gx >= 24 ? 1 : -1;

  switch (r.pose) {
    case "carry":
      if (side) return { butt: [r.torso.x - 1, ty + 6], tip: [r.torso.x + reach + 3, ty + 3], out: 1 };
      return { butt: [r.torso.x - 6, ty + 7], tip: [r.torso.x + r.torso.w + 5, ty + 5], out: 1 };
    case "farmUp":
    case "attackUp":
      if (side) return { butt: [gx + 2, gy + 2], tip: [gx - 9, Math.max(0, gy - reach)], out: -1 };
      return { butt: [gx, gy + 3], tip: [gx, Math.max(0, gy - reach)], out: out === 1 ? -1 : 1 };
    case "farmDown":
      if (side) return { butt: [gx - 2, gy - 2], tip: [gx + 8, r.ground + 1], out: 1 };
      return { butt: [gx + out, gy - 4], tip: [24 + out, r.ground + 1], out };
    case "attackHit":
      if (side) return { butt: [gx - 3, gy + 1], tip: [clampX(gx + reach - 3), gy - 2], out: 1 };
      return { butt: [gx - out * 3, gy], tip: [clampX(gx + out * (reach - 3)), gy - 1], out };
    default:
      break;
  }

  if (mode === "down" || lying(r) || r.pose === "sit") {
    if (side) return { butt: [gx, gy - 2], tip: [gx + 6, Math.min(45, gy + reach - 3)], out: 1 };
    return { butt: [gx, gy - 2], tip: [gx + out * 3, Math.min(45, gy + reach)], out };
  }
  // Side view: the tip is anchored ahead of the face so the pole never crosses it.
  if (side) return { butt: [gx, gy + 3], tip: [Math.max(gx + 4, 33 + lean), Math.max(0, gy - reach)], out };
  return { butt: [gx, gy + 3], tip: [gx + out * lean, Math.max(0, gy - reach)], out };
}

const hiddenFromBack = (r: Rig) =>
  r.view === "back" && (r.pose === "farmDown" || r.pose === "carry" || r.pose === "crouch" || r.pose === "attackHit");

function swingTrail(c: Cell, r: Rig): void {
  const [gx, gy] = holdingHand(r);
  const out = r.view === "side" ? 1 : gx >= 24 ? 1 : -1;
  const R = Math.round(12 * Math.max(0.8, r.scale));
  const cx = gx - out * 5;
  for (let a = -75; a <= 35; a += 4) {
    const rad = (a * Math.PI) / 180;
    const px = Math.round(cx + out * Math.cos(rad) * R);
    const py = Math.round(gy + Math.sin(rad) * R);
    if (c.alpha(px, py) === 0) c.set(px, py, SWOOSH);
    const ix = Math.round(cx + out * Math.cos(rad) * (R - 1));
    const iy = Math.round(gy + Math.sin(rad) * (R - 1));
    if (c.alpha(ix, iy) === 0) c.set(ix, iy, SWOOSH_SOFT);
  }
}

export function drawAccessory(kind: AccKind, col: Rgba): Draw {
  const sh = shade(col, 0.72);
  const hl = tint(col, 0.3);
  const fruits = [rgba("#d8463c"), rgba("#6aa84f"), rgba("#f0a030")];

  const basket = (t: Cell, bx: number, by: number, w: number, h: number) => {
    t.rect(bx + 1, by - 2, 2, 2, fruits[0]!);
    t.rect(bx + w - 3, by - 2, 2, 2, fruits[1]!);
    if (w > 7) t.rect(bx + Math.floor(w / 2) - 1, by - 2, 2, 2, fruits[2]!);
    t.round(bx, by, w, h, 2, col);
    t.rect(bx, by, w, 1, hl);
    for (let yy = by + 2; yy < by + h - 1; yy += 2) t.rect(bx + 1, yy, w - 2, 1, sh);
  };

  return (c, r) => {
    const { head, torso } = r;
    const front = r.view === "front";
    const back = r.view === "back";
    const side = r.view === "side";
    const hx = head.x + Math.floor(head.w / 2);

    switch (kind) {
      case "cap":
        shape(c, (t) => {
          if (side) {
            t.round(head.x - 1, head.y - 2, head.w + 1, 7, 4, col);
            t.rect(head.x + head.w - 4, head.y + 4, 7, 2, sh);
          } else {
            t.round(head.x - 1, head.y - 2, head.w + 2, 7, 4, col);
            t.set(hx, head.y - 2, hl);
            if (front) t.rect(head.x + 1, head.y + 4, head.w - 2, 2, sh);
            else t.rect(head.x + 6, head.y + 4, head.w - 12, 1, sh);
          }
          t.rect(head.x + 3, head.y - 1, 4, 1, hl);
        });
        break;

      case "ngob":
        shape(c, (t) => {
          const rows = 6;
          const brim = Math.floor(head.w / 2) + 4;
          for (let i = 0; i < rows; i++) {
            const half = Math.max(1, Math.round(1 + (i * (brim - 1)) / (rows - 1)));
            t.rect(hx - half, head.y - 5 + i, half * 2, 1, i === rows - 1 ? sh : col);
            if (i > 0 && i < rows - 1) t.set(hx - half + 1, head.y - 5 + i, hl);
          }
          t.rect(hx - 1, head.y - 3, 2, 1, sh);
        });
        break;

      case "flower": {
        const fx = front ? head.x + head.w - 3 : side ? head.x + 3 : head.x + 2;
        const fy = head.y + 2;
        shape(c, (t) => {
          t.set(fx, fy - 1, col);
          t.set(fx - 1, fy, col);
          t.set(fx + 1, fy, col);
          t.set(fx, fy + 1, col);
          t.set(fx, fy, YELLOW);
          t.set(fx + 1, fy + 2, LEAF);
        });
        break;
      }

      case "backpack":
        shape(c, (t) => {
          const cx = torsoCx(r);
          if (back) {
            t.round(torso.x + 1, torso.y + 1, torso.w - 2, torso.h, 2, col);
            t.rect(torso.x + 1, torso.y + 1, torso.w - 2, 2, sh);
            t.rect(torso.x + 3, torso.y + torso.h - 4, torso.w - 6, 3, sh);
            t.set(cx, torso.y + 3, hl);
          } else if (side) {
            t.round(torso.x - 5, torso.y + 1, 6, torso.h, 2, col);
            t.rect(torso.x - 5, torso.y + 1, 6, 2, sh);
            t.rect(torso.x + 1, torso.y, 6, 1, sh);
            t.rect(torso.x + 6, torso.y, 1, torso.h - 3, sh);
          } else {
            t.rect(cx - 4, torso.y, 2, torso.h - 2, col);
            t.rect(cx + 2, torso.y, 2, torso.h - 2, col);
            t.set(cx - 4, torso.y + 5, hl);
            t.set(cx + 3, torso.y + 5, hl);
          }
        });
        cutArms(c, r);
        break;

      case "basket":
        if (r.pose === "carry") {
          shape(c, (t) => {
            const cx = torsoCx(r);
            if (side) basket(t, torso.x + torso.w - 2, torso.y + 3, 8, 6);
            else if (front) basket(t, cx - 5, torso.y + 4, 10, 6);
            else {
              basket(t, torso.x - 3, torso.y + 4, torso.w + 6, 6);
              hideBehindBody(t, r);
            }
          });
        } else {
          const [gx, gy] = holdingHand(r);
          shape(c, (t) => {
            t.rect(gx, gy, 1, 3, WOOD);
            basket(t, gx - 3, gy + 3, 7, 5);
          });
          cutArms(c, r);
        }
        break;

      case "hoe": {
        const p = poleFor(r, 14, 3, "up");
        shape(c, (t) => {
          t.line(p.butt, p.tip, 1, WOOD);
          const [tx, ty] = p.tip;
          const down = ty > p.butt[1];
          if (down && !side) t.rect(tx - 2, ty - 1, 5, 2, col);
          else if (down) t.rect(tx, ty - 3, 2, 4, col);
          else if (r.pose === "carry" || r.pose === "attackHit") t.rect(tx - 1, ty, 2, 4, col);
          else t.rect(p.out > 0 ? tx : tx - 3, ty, 4, 2, col);
          t.set(tx, ty, hl);
          if (hiddenFromBack(r)) hideBehindBody(t, r);
        });
        cutArms(c, r);
        break;
      }

      case "fishing": {
        const p = poleFor(r, 18, 7, "up");
        shape(c, (t) => {
          t.line(p.butt, p.tip, 1, col);
          t.line(p.butt, trimPoly([p.butt, p.tip], 3)[1]!, 1, WOOD);
          const reel = trimPoly([p.butt, p.tip], 2)[1]!;
          t.rect(reel[0] - (p.out > 0 ? 2 : 0), reel[1], 2, 2, sh);
          if (hiddenFromBack(r)) hideBehindBody(t, r);
        });
        const [tx, ty] = p.tip;
        if (!lying(r)) {
          const lineEnd = r.pose === "farmDown" ? 44 : Math.min(44, ty + 6);
          for (let y = ty + 1; y <= lineEnd; y++) if (c.alpha(tx, y) === 0) c.set(tx, y, LINE);
        }
        cutArms(c, r);
        break;
      }

      case "sword": {
        const p = poleFor(r, 13, 4, "down");
        shape(c, (t) => {
          const [bx, by] = p.butt;
          const [tx, ty] = p.tip;
          const len = Math.hypot(tx - bx, ty - by) || 1;
          const ux = (tx - bx) / len;
          const uy = (ty - by) / len;
          const guard: Pt = [Math.round(bx + ux * 3), Math.round(by + uy * 3)];
          const px = Math.round(-uy);
          const py = Math.round(ux);
          t.line(p.butt, guard, 1, LEATHER);
          t.line([guard[0] + px * 2, guard[1] + py * 2], [guard[0] - px * 2, guard[1] - py * 2], 1, GOLD);
          t.line([Math.round(guard[0] + ux), Math.round(guard[1] + uy)], p.tip, 1, col);
          t.set(tx, ty, hl);
          t.set(bx, by, GOLD);
          if (hiddenFromBack(r)) hideBehindBody(t, r);
        });
        if (r.pose === "attackHit" && !back) swingTrail(c, r);
        cutArms(c, r);
        break;
      }

      case "cane": {
        const [gx, gy] = holdingHand(r);
        const out = side ? 1 : gx >= 24 ? 1 : -1;
        const low = gy > torso.y + 2 && !lying(r);
        shape(c, (t) => {
          if (lying(r) || r.pose === "sit") {
            t.line([gx, gy - 2], [gx + out * 2, Math.min(45, gy + 12)], 1, col);
          } else if (low) {
            t.line([gx, gy - 1], [gx + out, r.ground + 2], 1, col);
            t.rect(out > 0 ? gx : gx - 2, gy - 2, 3, 1, col);
            t.set(gx + out * 2, gy - 1, col);
          } else {
            t.line([gx, gy + 2], [gx, Math.max(1, gy - 11)], 1, col);
            t.rect(out > 0 ? gx : gx - 2, Math.max(0, gy - 12), 3, 1, col);
          }
          t.set(gx, gy - 1, hl);
        });
        cutArms(c, r);
        break;
      }

      case "alms_bowl": {
        // Thai Buddhist alms bowl (บาตร): dark lacquered iron, held at the waist for บิณฑบาต.
        const [hx, hy] = holdingHand(r);
        const cx = torsoCx(r);
        let bx: number;
        let by: number;
        if (lying(r)) {
          bx = side ? torso.x + torso.w + 3 : cx + 8;
          by = r.ground - 3;
        } else if (r.pose === "sit") {
          bx = side ? torso.x + torso.w + 1 : cx;
          by = torso.y + torso.h + 1;
        } else if (r.pose === "carry") {
          bx = side ? torso.x + torso.w + 2 : cx;
          by = torso.y + 6;
        } else if (side) {
          bx = Math.max(torso.x + torso.w + 1, hx + 1);
          by = Math.min(torso.y + torso.h - 1, hy + 1);
        } else {
          // Front and back: centre the bowl on the waist; hideBehindBody covers it from behind.
          bx = cx;
          by = Math.min(torso.y + torso.h - 1, Math.max(torso.y + 5, hy + 1));
        }
        const inner = shade(col, 0.55);
        shape(c, (t) => {
          // hemisphere body + rim; a short saffron wrap stripe sits under the lip
          t.ellipse(bx, by + 1, 5, 3.4, col);
          t.ellipse(bx, by, 5, 2.1, sh);
          t.rect(bx - 4, by - 1, 8, 1, hl);
          t.rect(bx - 3, by, 6, 1, inner);
          t.set(bx - 2, by - 1, tint(col, 0.45));
          // cloth wrap (ผ้าคลุมบาตร) — a 1px saffron band, still reads if the bowl is recoloured
          const wrap: Rgba = [224, 132, 31, 255];
          t.rect(bx - 3, by + 2, 6, 1, wrap);
          t.set(bx + 3, by + 2, shade(wrap, 0.75));
          if (back && !lying(r)) hideBehindBody(t, r);
        });
        cutArms(c, r);
        break;
      }
    }
  };
}
