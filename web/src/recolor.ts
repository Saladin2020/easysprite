import { recolorRgba } from "../../src/lib/recolor";

/**
 * Remap every shade of `baseHex` (same hue family, similar saturation) to
 * `targetHex`, keeping the shading/highlight contrast. `tolerance` is the
 * hue window in thousandths of a turn (70 ≈ 25°).
 */
export function recolorImageData(
  data: ImageData,
  baseHex: string,
  targetHex: string,
  tolerance = 70,
): void {
  recolorRgba(data.data, baseHex, targetHex, tolerance);
}

export function applyRecolorToCanvas(
  source: CanvasImageSource,
  sx: number,
  sy: number,
  size: number,
  baseHex: string,
  targetHex: string,
  tolerance?: number,
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(source, sx, sy, size, size, 0, 0, size, size);
  const imageData = ctx.getImageData(0, 0, size, size);
  recolorImageData(imageData, baseHex, targetHex, tolerance);
  ctx.putImageData(imageData, 0, 0);
  return c;
}
