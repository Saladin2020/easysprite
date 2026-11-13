import { useEffect, useRef, useState } from "react";
import type { AnimFrame, CharacterProject, Direction, PartMeta } from "../types";
import { viewOf } from "../types";
import { drawCharacterFrame } from "../compositor";

interface PreviewStageProps {
  parts: PartMeta[];
  project: CharacterProject;
  direction: Direction;
  frame: AnimFrame;
  frameSize: number;
  playing: boolean;
  playFrames: AnimFrame[];
  frameMs: number;
  loop: boolean;
}

const SCALE = 4;

const BACKDROPS = [
  { id: "grass", label: "Village grass" },
  { id: "path", label: "Dirt path" },
  { id: "checker", label: "Transparent checker" },
  { id: "night", label: "Night" },
  { id: "sky", label: "Side-scroller sky" },
] as const;
type Backdrop = (typeof BACKDROPS)[number]["id"];
const BACKDROP_KEY = "easysprite.backdrop";

function initialBackdrop(): Backdrop {
  const saved = localStorage.getItem(BACKDROP_KEY);
  return BACKDROPS.some((b) => b.id === saved) ? (saved as Backdrop) : "grass";
}

export function PreviewStage({
  parts,
  project,
  direction,
  frame,
  frameSize,
  playing,
  playFrames,
  frameMs,
  loop,
}: PreviewStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [backdrop, setBackdropState] = useState<Backdrop>(initialBackdrop);
  const setBackdrop = (b: Backdrop) => {
    setBackdropState(b);
    localStorage.setItem(BACKDROP_KEY, b);
  };
  const projectRef = useRef(project);
  const partsRef = useRef(parts);
  const directionRef = useRef(direction);
  const frameSizeRef = useRef(frameSize);
  const requestedRef = useRef(0);
  const shownRef = useRef(0);
  projectRef.current = project;
  partsRef.current = parts;
  directionRef.current = direction;
  frameSizeRef.current = frameSize;

  /**
   * Render off-screen, then swap in one drawImage. A paint is only dropped if a
   * newer one has already reached the screen, so slow loads never blank the stage.
   */
  const paintRef = useRef(async (current: AnimFrame) => {
    const token = ++requestedRef.current;
    const w = frameSizeRef.current * SCALE;
    const off = document.createElement("canvas");
    off.width = w;
    off.height = w;
    const offCtx = off.getContext("2d");
    if (!offCtx) return;
    try {
      await drawCharacterFrame(
        offCtx,
        partsRef.current,
        projectRef.current,
        directionRef.current,
        current,
        0,
        0,
        SCALE,
      );
    } catch {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas || token < shownRef.current) return;
    shownRef.current = token;
    if (canvas.width !== off.width || canvas.height !== off.height) {
      canvas.width = off.width;
      canvas.height = off.height;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(off, 0, 0);
  });

  useEffect(() => {
    if (playing) return;
    void paintRef.current(frame);
  }, [playing, frame, frameSize, parts, project, direction]);

  useEffect(() => {
    if (!playing) return;
    const sequence = playFrames.length ? playFrames : (["idle"] as AnimFrame[]);
    const holdTicks = loop ? 0 : Math.ceil(900 / frameMs);
    let index = 0;
    let held = 0;
    void paintRef.current(sequence[0]!);
    const timer = window.setInterval(() => {
      if (index === sequence.length - 1 && held < holdTicks) {
        held++;
        return;
      }
      held = 0;
      index = (index + 1) % sequence.length;
      void paintRef.current(sequence[index]!);
    }, frameMs);
    return () => window.clearInterval(timer);
  }, [playing, frameSize, direction, playFrames, frameMs, loop]);

  return (
    <div className={`stage stage-${backdrop} view-${viewOf(project)}`}>
      <div className="stage-backdrops" role="group" aria-label="Preview background">
        {BACKDROPS.map((b) => (
          <button
            key={b.id}
            type="button"
            title={b.label}
            aria-label={b.label}
            className={`backdrop-swatch swatch-${b.id}${backdrop === b.id ? " active" : ""}`}
            onClick={() => setBackdrop(b.id)}
          />
        ))}
      </div>
      <div className="stage-frame">
        <span className="stage-shadow" aria-hidden />
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
