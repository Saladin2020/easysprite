import { useEffect, useRef } from "react";
import type { PartMeta } from "../types";
import { loadPartImage } from "../compositor";
import { applyRecolorToCanvas } from "../recolor";

export function PartThumb({
  part,
  tint,
}: {
  part: PartMeta;
  tint?: string | null;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const canvas = ref.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = part.frameSize;
      canvas.height = part.frameSize;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      try {
        const img = await loadPartImage(part);
        if (cancelled) return;
        if (tint && part.recolor?.enabled) {
          const tinted = applyRecolorToCanvas(
            img,
            0,
            0,
            part.frameSize,
            part.recolor.base,
            tint,
            part.recolor.tolerance,
          );
          ctx.drawImage(tinted, 0, 0);
        } else {
          ctx.drawImage(
            img,
            0,
            0,
            part.frameSize,
            part.frameSize,
            0,
            0,
            part.frameSize,
            part.frameSize,
          );
        }
      } catch {
        // ignore missing art in thumb
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [part, tint]);

  return <canvas ref={ref} className="thumb" width={part.frameSize} height={part.frameSize} />;
}
