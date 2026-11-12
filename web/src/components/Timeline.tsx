import type { AnimFrame, AnimPresetId, Direction } from "../types";
import { ANIM_PRESETS } from "../types";

interface TimelineProps {
  directions: Direction[];
  frames: AnimFrame[];
  direction: Direction;
  frame: AnimFrame;
  animPreset: AnimPresetId;
  animal: boolean;
  playing: boolean;
  onDirection: (d: Direction) => void;
  onFrame: (f: AnimFrame) => void;
  onAnimPreset: (id: AnimPresetId) => void;
  onTogglePlay: () => void;
}

export function Timeline({
  directions,
  frames,
  direction,
  frame,
  animPreset,
  animal,
  playing,
  onDirection,
  onFrame,
  onAnimPreset,
  onTogglePlay,
}: TimelineProps) {
  return (
    <div className="timeline">
      <div className="timeline-row">
        <span className="timeline-label">Anim</span>
        <div className="timeline-chips">
          {ANIM_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={animPreset === p.id ? "active" : ""}
              onClick={() => onAnimPreset(p.id)}
            >
              {(animal && p.animalLabel) || p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="timeline-row">
        <span className="timeline-label">Dir</span>
        <div className="timeline-chips">
          {directions.map((d) => (
            <button
              key={d}
              type="button"
              className={direction === d ? "active" : ""}
              onClick={() => onDirection(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
      <div className="timeline-row">
        <span className="timeline-label">Frame</span>
        <div className="timeline-chips">
          {frames.map((f) => (
            <button
              key={f}
              type="button"
              className={frame === f ? "active" : ""}
              disabled={playing}
              onClick={() => onFrame(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <button type="button" className="primary" onClick={onTogglePlay}>
          {playing ? "Pause" : `Play ${animPreset}`}
        </button>
      </div>
    </div>
  );
}
