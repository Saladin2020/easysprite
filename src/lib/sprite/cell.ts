import type { Rgba } from "../png.js";

export type { Rgba };
export type Pt = [number, number];

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const CELL = 48;
export const OUTLINE: Rgba = [42, 28, 24, 255];

export function rgba(hex: string, alpha = 255): Rgba {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, alpha];
}

export function shade(c: Rgba, f = 0.78): Rgba {
  return [Math.round(c[0] * f), Math.round(c[1] * f), Math.round(c[2] * f), c[3]];
}

export function tint(c: Rgba, t = 0.25): Rgba {
  return [
    Math.round(c[0] + (255 - c[0]) * t),
    Math.round(c[1] + (255 - c[1]) * t),
    Math.round(c[2] + (255 - c[2]) * t),
    c[3],
  ];
}

export class Cell {
  readonly px = new Uint8Array(CELL * CELL * 4);
  minX = CELL;
  minY = CELL;
  maxX = -1;
  maxY = -1;

  alpha(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= CELL || y >= CELL) return 0;
    return this.px[(y * CELL + x) * 4 + 3]!;
  }

  private grow(x: number, y: number): void {
    if (x < this.minX) this.minX = x;
    if (y < this.minY) this.minY = y;
    if (x > this.maxX) this.maxX = x;
    if (y > this.maxY) this.maxY = y;
  }

  set(x: number, y: number, c: Rgba): void {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= CELL || yi >= CELL) return;
    const i = (yi * CELL + xi) * 4;
    this.px[i] = c[0];
    this.px[i + 1] = c[1];
    this.px[i + 2] = c[2];
    this.px[i + 3] = c[3];
    this.grow(xi, yi);
  }

  erase(x: number, y: number): void {
    if (x < 0 || y < 0 || x >= CELL || y >= CELL) return;
    this.px.fill(0, (y * CELL + x) * 4, (y * CELL + x) * 4 + 4);
  }

  copyPixel(from: Cell, x: number, y: number): void {
    const i = (y * CELL + x) * 4;
    this.px.set(from.px.subarray(i, i + 4), i);
    this.grow(x, y);
  }

  rect(x: number, y: number, w: number, h: number, c: Rgba): void {
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) this.set(x + xx, y + yy, c);
    }
  }

  /** Rect with stair-stepped corners; `r` = corner size in pixels. */
  round(x: number, y: number, w: number, h: number, r: number, c: Rgba): void {
    const rr = Math.min(r, Math.ceil(Math.min(w, h) / 2));
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        const dx = Math.min(xx, w - 1 - xx);
        const dy = Math.min(yy, h - 1 - yy);
        if (dx + dy < rr - 1) continue;
        this.set(x + xx, y + yy, c);
      }
    }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: Rgba, onlyEmpty = false): void {
    for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
      for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) {
        if ((x * x) / (rx * rx) + (y * y) / (ry * ry) > 1) continue;
        if (onlyEmpty && this.alpha(Math.round(cx + x), Math.round(cy + y)) > 0) continue;
        this.set(cx + x, cy + y, c);
      }
    }
  }

  stamp(x: number, y: number, w: number, c: Rgba): void {
    const o = Math.floor((w - 1) / 2);
    this.rect(x - o, y - o, w, w, c);
  }

  line(a: Pt, b: Pt, w: number, c: Rgba): void {
    let [x0, y0] = a;
    const [x1, y1] = b;
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.stamp(x0, y0, w, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  poly(pts: Pt[], w: number, c: Rgba): void {
    if (pts.length === 1) this.stamp(pts[0]![0], pts[0]![1], w, c);
    for (let i = 1; i < pts.length; i++) this.line(pts[i - 1]!, pts[i]!, w, c);
  }

  private remap(fn: (x: number, y: number) => Pt): Cell {
    const out = new Cell();
    for (let y = this.minY; y <= this.maxY; y++) {
      for (let x = this.minX; x <= this.maxX; x++) {
        const s = (y * CELL + x) * 4;
        if (this.px[s + 3] === 0) continue;
        const [nx, ny] = fn(x, y);
        if (nx < 0 || ny < 0 || nx >= CELL || ny >= CELL) continue;
        out.px.set(this.px.subarray(s, s + 4), (ny * CELL + nx) * 4);
        out.grow(nx, ny);
      }
    }
    return out;
  }

  mirrored(): Cell {
    return this.remap((x, y) => [CELL - 1 - x, y]);
  }

  /** Quarter turn: 1 = counter-clockwise (head ends up on the left), -1 = clockwise. */
  rotated(dir: 1 | -1, drop: number): Cell {
    return this.remap((x, y) => (dir === 1 ? [y, CELL - 1 - x + drop] : [CELL - 1 - y, x + drop]));
  }

  blit(dst: Uint8Array, width: number, ox: number, oy: number): void {
    for (let y = 0; y < CELL; y++) {
      const s = y * CELL * 4;
      dst.set(this.px.subarray(s, s + CELL * 4), ((oy + y) * width + ox) * 4);
    }
  }
}

export const hasNeighbor = (t: Cell, x: number, y: number) =>
  t.alpha(x - 1, y) > 0 || t.alpha(x + 1, y) > 0 || t.alpha(x, y - 1) > 0 || t.alpha(x, y + 1) > 0;

/** Draw fills into a scratch cell, then stamp a 1px outline around the whole group. */
export function shape(cell: Cell, draw: (t: Cell) => void): void {
  const t = new Cell();
  draw(t);
  if (t.maxX < 0) return;
  const x0 = Math.max(0, t.minX - 1);
  const x1 = Math.min(CELL - 1, t.maxX + 1);
  const y0 = Math.max(0, t.minY - 1);
  const y1 = Math.min(CELL - 1, t.maxY + 1);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (t.alpha(x, y) > 0) cell.copyPixel(t, x, y);
      else if (hasNeighbor(t, x, y)) cell.set(x, y, OUTLINE);
    }
  }
}

export function polyLen(pts: Pt[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
  }
  return len;
}

export function trimPoly(pts: Pt[], len: number): Pt[] {
  const out: Pt[] = [pts[0]!];
  let left = len;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d >= left) {
      const k = d === 0 ? 0 : left / d;
      out.push([Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k)]);
      return out;
    }
    out.push(b);
    left -= d;
  }
  return out;
}
