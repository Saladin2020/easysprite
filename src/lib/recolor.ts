function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0);
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    default:
      h = (r - g) / d + 4;
  }
  return [h / 6, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Remap every shade of `baseHex` to `targetHex` in an RGBA buffer
 * (length = width * height * 4). Mutates `px` in place.
 */
export function recolorRgba(
  px: Uint8Array | Uint8ClampedArray,
  baseHex: string,
  targetHex: string,
  tolerance = 70,
): void {
  const base = hexToRgb(baseHex);
  const target = hexToRgb(targetHex);
  if (base[0] === target[0] && base[1] === target[1] && base[2] === target[2]) return;

  const [bH, bS, bL] = rgbToHsl(base[0], base[1], base[2]);
  const [tH, tS, tL] = rgbToHsl(target[0], target[1], target[2]);
  const greyBase = bS < 0.15;
  const hueTol = clamp(tolerance / 1000, 0.02, 0.15);
  const lMin = bL * 0.5;
  const lMax = Math.min(1, bL * 1.6 + 0.12);

  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3]! < 8) continue;
    const [h, s, l] = rgbToHsl(px[i]!, px[i + 1]!, px[i + 2]!);
    if (l < lMin || l > lMax) continue;
    if (greyBase) {
      if (s > 0.22) continue;
    } else {
      if (s < bS * 0.35) continue;
      const dh = Math.abs(h - bH);
      if (Math.min(dh, 1 - dh) > hueTol) continue;
    }

    const outL =
      l <= bL
        ? (bL > 0.001 ? l / bL : 1) * tL
        : tL + (l - bL) * ((1 - tL) / Math.max(0.001, 1 - bL));
    const outS = greyBase ? tS : clamp(tS * (bS > 0.001 ? s / bS : 1), 0, 1);
    const [nr, ng, nb] = hslToRgb(tH, outS, clamp(outL, 0.02, 0.98));
    px[i] = nr;
    px[i + 1] = ng;
    px[i + 2] = nb;
  }
}
