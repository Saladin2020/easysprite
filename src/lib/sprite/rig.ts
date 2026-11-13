import type { AnimFrame, BodyType, Direction, ViewMode } from "../../shared/types.js";
import { CELL, Cell, OUTLINE, hasNeighbor, type Box, type Pt } from "./cell.js";

export type View = "front" | "back" | "side";
export type Pose =
  | "stand"
  | "walk"
  | "run"
  | "jump"
  | "wave"
  | "carry"
  | "farmUp"
  | "farmDown"
  | "cheer"
  | "attackUp"
  | "attackHit"
  | "hurt"
  | "fall"
  | "ko"
  | "sleep"
  | "tired"
  | "sit"
  | "crouch";

interface BodySpec {
  headW: number;
  headH: number;
  torsoW: number;
  torsoH: number;
  legLen: number;
  legW: number;
  armK: number;
  /** Elder stoop: head sits lower and further forward. */
  hunch: number;
}

export const BODY: Record<BodyType, BodySpec> = {
  adult: { headW: 18, headH: 16, torsoW: 12, torsoH: 10, legLen: 9, legW: 4, armK: 1, hunch: 0 },
  child: { headW: 16, headH: 14, torsoW: 10, torsoH: 8, legLen: 6, legW: 3, armK: 0.8, hunch: 0 },
  elder: { headW: 18, headH: 16, torsoW: 12, torsoH: 10, legLen: 8, legW: 4, armK: 1, hunch: 2 },
  stocky: { headW: 20, headH: 16, torsoW: 14, torsoH: 11, legLen: 8, legW: 5, armK: 1, hunch: 0 },
};

/** Side-scroller proportions: smaller head, longer torso and legs, feet lower in the cell. */
export const BODY_SIDE: Record<BodyType, BodySpec> = {
  adult: { headW: 16, headH: 14, torsoW: 11, torsoH: 12, legLen: 12, legW: 4, armK: 1.25, hunch: 0 },
  child: { headW: 15, headH: 13, torsoW: 10, torsoH: 9, legLen: 8, legW: 3, armK: 0.95, hunch: 0 },
  elder: { headW: 16, headH: 14, torsoW: 11, torsoH: 11, legLen: 11, legW: 4, armK: 1.2, hunch: 2 },
  stocky: { headW: 18, headH: 14, torsoW: 14, torsoH: 12, legLen: 11, legW: 5, armK: 1.2, hunch: 0 },
};

const GROUND: Record<ViewMode, number> = { topdown: 42, side: 44 };

export interface Arm {
  pts: Pt[];
  behind: boolean;
  holds: boolean;
}

export interface Leg {
  /** hip → (knee) → ankle */
  pts: Pt[];
  behind: boolean;
  side: "L" | "R";
}

export interface Rig {
  view: View;
  camera: ViewMode;
  body: BodyType;
  pose: Pose;
  phase: number;
  lift: number;
  /** Rotate after drawing: 1 = counter-clockwise (head left), -1 = clockwise. */
  lie: 0 | 1 | -1;
  lieDrop: number;
  head: Box;
  torso: Box;
  hipY: number;
  ground: number;
  legs: Leg[];
  arms: Arm[];
  armW: number;
  legW: number;
  /** Leg length relative to an adult; used to size props. */
  scale: number;
}

export const ankleOf = (l: Leg): Pt => l.pts[l.pts.length - 1]!;
export const torsoCx = (r: Rig): number => r.torso.x + Math.floor(r.torso.w / 2);

const POSE_BY_FRAME: Record<AnimFrame, [Pose, number]> = {
  idle: ["stand", 0],
  walk0: ["walk", -1],
  walk1: ["walk", 0],
  walk2: ["walk", 1],
  run0: ["run", 0],
  run1: ["run", 1],
  run2: ["run", 2],
  run3: ["run", 3],
  jump0: ["jump", 0],
  jump1: ["jump", 1],
  wave0: ["wave", 0],
  wave1: ["wave", 1],
  carry0: ["carry", 0],
  carry1: ["carry", 1],
  farm0: ["farmUp", 0],
  farm1: ["farmDown", 0],
  cheer0: ["cheer", 0],
  cheer1: ["cheer", 1],
  attack0: ["attackUp", 0],
  attack1: ["attackHit", 0],
  hurt0: ["hurt", 0],
  hurt1: ["hurt", 1],
  fall0: ["fall", 0],
  fall1: ["ko", 0],
  sleep0: ["sleep", 0],
  sleep1: ["sleep", 1],
  tired0: ["tired", 0],
  tired1: ["tired", 1],
  sit: ["sit", 0],
  crouch: ["crouch", 0],
};

interface Motion {
  dip: number;
  lift: number;
  lean: number;
  headDy: number;
}

function motion(pose: Pose, phase: number, spec: BodySpec): Motion {
  const m: Motion = { dip: 0, lift: 0, lean: 0, headDy: 0 };
  switch (pose) {
    case "walk":
      m.dip = phase !== 0 ? 1 : 0;
      break;
    case "run":
      m.dip = phase % 2 === 0 ? 1 : 0;
      m.lift = phase % 2;
      m.lean = 2;
      break;
    case "jump":
      if (phase === 0) m.dip = 3;
      else m.lift = 4;
      break;
    case "carry":
      m.dip = phase;
      break;
    case "farmDown":
      m.dip = 1;
      break;
    case "cheer":
      m.lift = phase === 0 ? 2 : 0;
      break;
    case "attackUp":
      m.lean = -1;
      break;
    case "attackHit":
      m.lean = 2;
      m.dip = 1;
      break;
    case "hurt":
      m.lean = phase === 0 ? -2 : -1;
      m.dip = 1 - phase;
      m.headDy = 1 - phase;
      break;
    case "fall":
      m.dip = 4;
      m.lean = -2;
      m.headDy = 1;
      break;
    case "tired":
      m.dip = 1 + phase;
      m.lean = 2;
      m.headDy = 1;
      break;
    case "sit":
      m.dip = spec.legLen - 2;
      break;
    case "crouch":
      m.dip = 4;
      m.lean = 2;
      m.headDy = 1;
      break;
    default:
      break;
  }
  if (pose !== "sit") m.dip = Math.min(m.dip, spec.legLen - 2);
  return m;
}

/** Hip → knee → ankle. The knee bends along `dir` only when the leg is compressed. */
function legPts(hip: Pt, ankle: Pt, len: number, dir: "side" | "out" | null, outward = 1): Pt[] {
  const vx = ankle[0] - hip[0];
  const vy = ankle[1] - hip[1];
  const d = Math.hypot(vx, vy);
  if (!dir || d >= len - 0.5 || d === 0) return [hip, ankle];
  const bend = Math.min(4, Math.sqrt(Math.max(0, (len / 2) ** 2 - (d / 2) ** 2)));
  if (bend < 1) return [hip, ankle];
  let nx: number;
  let ny: number;
  if (dir === "out") {
    nx = outward;
    ny = 0;
  } else {
    // pick the normal that points forward (+x) and up (−y)
    const a: Pt = [-vy / d, vx / d];
    const b: Pt = [vy / d, -vx / d];
    [nx, ny] = a[0] - a[1] >= b[0] - b[1] ? a : b;
  }
  const knee: Pt = [Math.round((hip[0] + ankle[0]) / 2 + nx * bend), Math.round((hip[1] + ankle[1]) / 2 + ny * bend)];
  return [hip, knee, ankle];
}

/** [L dx, L raise, R dx, R raise, knees spread] — dx is outward. */
function frontLegTable(pose: Pose, phase: number): [number, number, number, number, boolean] {
  switch (pose) {
    case "walk":
      return [0, phase === 1 ? 2 : 0, 0, phase === -1 ? 2 : 0, false];
    case "run": {
      const [l, r] = ([[0, 3], [1, 0], [3, 0], [0, 1]] as const)[phase]!;
      return [0, l, 0, r, false];
    }
    case "jump":
      return phase === 0 ? [1, 0, 1, 0, true] : [1, 2, 1, 2, true];
    case "attackUp":
    case "attackHit":
    case "tired":
      return [1, 0, 1, 0, false];
    case "hurt":
      return phase === 0 ? [0, 0, 1, 1, false] : [0, 0, 0, 0, false];
    case "fall":
    case "crouch":
      return [1, 0, 1, 0, true];
    case "sit":
      return [1, 1, 1, 1, false];
    default:
      return [0, 0, 0, 0, false];
  }
}

/** [near dx, near raise, far dx, far raise] relative to the body centre (adult px). */
function sideLegTable(pose: Pose, phase: number): [number, number, number, number] {
  switch (pose) {
    case "walk":
      return phase === -1 ? [4, 0, -5, 1] : phase === 1 ? [-4, 1, 3, 0] : [0, 0, -1, 2];
    case "run":
      return (
        [
          [5, 0, -6, 2],
          [-1, 4, -5, 2],
          [-6, 2, 5, 0],
          [-5, 2, -1, 4],
        ] as const
      )[phase]!.slice() as [number, number, number, number];
    case "jump":
      return phase === 0 ? [2, 0, -1, 0] : [1, 3, -2, 2];
    case "farmDown":
      return [3, 0, -3, 0];
    case "attackUp":
      return [3, 0, -4, 0];
    case "attackHit":
      return [6, 0, -6, 0];
    case "hurt":
      return phase === 0 ? [2, 0, -3, 0] : [1, 0, -2, 0];
    case "fall":
      return [3, 0, -1, 0];
    case "tired":
      return [2, 0, -2, 0];
    case "sit":
      return [8, 1, 6, 1];
    case "crouch":
      return [3, 0, 0, 0];
    default:
      return [1, 0, -2, 0];
  }
}

/** Front arm offsets from the shoulder (adult px), for the prop hand and the free hand. */
function frontArmTable(pose: Pose, phase: number): { hold: Pt[]; free: Pt[] } {
  const hang: Pt[] = [[0, 6]];
  const both = (a: Pt[]) => ({ hold: a, free: a });
  switch (pose) {
    case "walk":
      return { hold: [[0, phase === 1 ? 5 : 6]], free: [[0, phase === -1 ? 5 : 6]] };
    case "run": {
      const fwd: Pt[] = [[1, 3], [3, 2]];
      const back: Pt[] = [[-1, 4], [-1, 6]];
      if (phase === 0) return { hold: back, free: fwd };
      if (phase === 2) return { hold: fwd, free: back };
      return both([[0, 4], [1, 6]]);
    }
    case "jump":
      return both(phase === 0 ? [[-2, 5]] : [[-3, -3], [-4, -8]]);
    case "wave":
      return { hold: hang, free: [[-4, -2], phase ? [-8, -6] : [-6, -7]] };
    case "carry":
      return both([[0, 4], [5, 5]]);
    case "farmUp":
      return { hold: [[-3, -3], [-3, -6]], free: [[3, 2], [8, 1]] };
    case "farmDown":
      return { hold: [[0, 4], [4, 7]], free: [[1, 4], [6, 6]] };
    case "cheer":
      return both(phase === 0 ? [[-4, -4], [-5, -9]] : [[-4, -3], [-5, -6]]);
    case "attackUp":
      return { hold: [[-3, -3], [-2, -7]], free: [[1, 4], [4, 3]] };
    case "attackHit":
      return { hold: [[-4, 1], [-8, 2]], free: [[1, 4], [4, 3]] };
    case "hurt":
      return both(phase === 0 ? [[-4, 1], [-6, 4]] : [[-3, 2], [-4, 5]]);
    case "fall":
      return both([[-3, 3], [-4, 6]]);
    case "ko":
      return both([[-4, 3], [-7, 5]]);
    case "sleep":
      return both([[0, 4], [4, 6]]);
    case "tired":
      return both([[0, 7]]);
    case "sit":
      return both([[0, 5], [2, 7]]);
    case "crouch":
      return { hold: [[0, 5], [2, 9]], free: hang };
    default:
      return both(hang);
  }
}

/** Side arm offsets (facing right) from the near / far shoulder (adult px). */
function sideArmTable(pose: Pose, phase: number): { near: Pt[]; far: Pt[] } {
  const hang: Pt[] = [[0, 6]];
  const both = (a: Pt[]) => ({ near: a, far: a });
  switch (pose) {
    case "walk":
      return { near: [[3 * phase, 6]], far: [[1 - 4 * phase, 6]] };
    case "run": {
      const back: Pt[] = [[-2, 3], [-4, 1]];
      const fwd: Pt[] = [[2, 3], [5, 1]];
      if (phase === 0) return { near: back, far: fwd };
      if (phase === 2) return { near: fwd, far: back };
      return both([[0, 4], [2, 3]]);
    }
    case "jump":
      return both(phase === 0 ? [[-3, 5]] : [[2, -4], [3, -8]]);
    case "wave":
      return { near: [[5, -3], phase ? [10, -6] : [8, -7]], far: hang };
    case "carry":
      return both([[0, 4], [5, 3]]);
    case "farmUp":
      return both([[4, -3], [7, -5]]);
    case "farmDown":
      return both([[4, 2], [7, 4]]);
    case "cheer":
      return phase === 0
        ? { near: [[4, -5], [7, -10]], far: [[-2, -5], [-3, -10]] }
        : { near: [[3, -4], [6, -7]], far: [[-2, -4], [-3, -7]] };
    case "attackUp":
      return { near: [[-3, 1], [-5, -1]], far: [[2, 3], [4, 2]] };
    case "attackHit":
      return { near: [[5, 1], [10, 1]], far: [[-3, 3], [-4, 5]] };
    case "hurt":
      return phase === 0
        ? { near: [[3, -1], [6, -3]], far: [[2, -1], [5, -3]] }
        : { near: [[2, 2], [5, 1]], far: [[1, 2], [4, 1]] };
    case "fall":
      return { near: [[3, 1], [6, 0]], far: [[2, 1], [5, 0]] };
    case "ko":
      return { near: [[3, 3], [6, 5]], far: [[2, 3], [5, 5]] };
    case "sleep":
      return { near: [[1, 4], [4, 5]], far: hang };
    case "tired":
      return both([[1, 7]]);
    case "sit":
      return both([[2, 4], [5, 6]]);
    case "crouch":
      return { near: [[3, 5], [5, 9]], far: [[2, 5], [4, 8]] };
    default:
      return both(hang);
  }
}

const fromShoulder = (s: Pt, offs: Pt[], k: number): Pt[] => [
  s,
  ...offs.map(([dx, dy]): Pt => [s[0] + Math.round(dx * k), s[1] + Math.round(dy * k)]),
];

const mirrorPts = (pts: Pt[]): Pt[] => pts.map(([x, y]): Pt => [CELL - 1 - x, y]);

export function rigFor(direction: Direction, frame: AnimFrame, body: BodyType, camera: ViewMode = "topdown"): Rig {
  const spec = (camera === "side" ? BODY_SIDE : BODY)[body];
  const [pose, phase] = POSE_BY_FRAME[frame];
  const lying = pose === "ko" || pose === "sleep";
  // Lying poses are drawn standing, then rotated; the back direction reuses the front view.
  const view: View =
    direction === "front" || (lying && direction === "back")
      ? "front"
      : direction === "back"
        ? "back"
        : "side";
  const m = motion(pose, phase, spec);
  const side = view === "side";
  const k = spec.legLen / 9;

  const ground = GROUND[camera] - m.lift;
  const hipY = ground - spec.legLen + m.dip;
  const ty = hipY - spec.torsoH;
  const hy = ty - spec.headH + m.headDy + (spec.hunch ? 1 : 0);
  const lean = side ? m.lean + spec.hunch : 0;
  const hw = side ? spec.headW - 2 : spec.headW;
  const tw = side ? spec.torsoW - 2 : spec.torsoW;
  const head: Box = { x: Math.floor((CELL - hw) / 2) + lean, y: hy, w: hw, h: spec.headH };
  const torso: Box = { x: Math.floor((CELL - tw) / 2) + Math.trunc(lean / 2), y: ty, w: tw, h: spec.torsoH };
  const cx = torso.x + Math.floor(tw / 2);

  const legW = spec.legW;
  const o = Math.floor((legW - 1) / 2);
  let legs: Leg[];
  if (side) {
    const [nd, nr, fd, fr] = sideLegTable(pose, phase);
    const at = (dx: number, raise: number): Pt => [24 + Math.round(dx * k), ground - Math.round(raise * k)];
    const farHip: Pt = [cx - 1, hipY];
    const nearHip: Pt = [cx + 1, hipY];
    legs = [
      { pts: legPts(farHip, at(fd, fr), spec.legLen, "side"), behind: true, side: "L" },
      { pts: legPts(nearHip, at(nd, nr), spec.legLen, "side"), behind: false, side: "R" },
    ];
  } else {
    const [ld, lr, rd, rr, spread] = frontLegTable(pose, phase);
    const lc = torso.x + o + 1;
    const rc = CELL - 1 - lc + 2 * o - legW + 1;
    const dir = spread ? "out" : null;
    legs = [
      { pts: legPts([lc, hipY], [lc - ld, ground - lr], spec.legLen, dir, -1), behind: false, side: "L" },
      { pts: legPts([rc, hipY], [rc + rd, ground - rr], spec.legLen, dir, 1), behind: false, side: "R" },
    ];
  }

  let arms: Arm[];
  if (side) {
    const t = sideArmTable(pose, phase);
    arms = [
      { pts: fromShoulder([cx - 1, ty + 2], t.far, spec.armK), behind: true, holds: false },
      { pts: fromShoulder([cx, ty + 2], t.near, spec.armK), behind: false, holds: true },
    ];
  } else {
    const t = frontArmTable(pose, phase);
    const holdRight = view !== "back";
    const s: Pt = [torso.x - 2, ty + 1];
    const left = fromShoulder(s, holdRight ? t.free : t.hold, spec.armK);
    const right = mirrorPts(fromShoulder(s, holdRight ? t.hold : t.free, spec.armK));
    const hidden = (pts: Pt[]) => {
      const [hx, hyy] = pts[pts.length - 1]!;
      return view === "back" && hx >= torso.x && hx < torso.x + torso.w && hyy >= ty;
    };
    arms = [
      { pts: left, behind: hidden(left), holds: !holdRight },
      { pts: right, behind: hidden(right), holds: holdRight },
    ];
  }

  return {
    view,
    camera,
    body,
    pose,
    phase,
    lift: m.lift,
    lie: !lying ? 0 : direction === "back" ? -1 : 1,
    lieDrop: torso.x - 8,
    head,
    torso,
    hipY,
    ground,
    legs,
    arms,
    armW: 3,
    legW,
    scale: k,
  };
}

export function footBox(r: Rig, leg: Leg): Box {
  const [ax, ay] = ankleOf(leg);
  const o = Math.floor((r.legW - 1) / 2);
  if (r.view === "side") return { x: ax - o - 1, y: ay, w: r.legW + 2, h: 3 };
  return { x: leg.side === "L" ? ax - o - 1 : ax - o, y: ay, w: r.legW + 1, h: 3 };
}

export function holdingHand(r: Rig): Pt {
  const arm = r.arms.find((a) => a.holds) ?? r.arms[r.arms.length - 1]!;
  return arm.pts[arm.pts.length - 1]!;
}

/** Punch near arms through a clothing/hair layer so hands always sit on top. */
export function cutArms(cell: Cell, r: Rig): void {
  for (const arm of r.arms) {
    if (arm.behind) continue;
    const core = new Cell();
    core.poly(arm.pts, r.armW, OUTLINE);
    for (let y = Math.max(0, core.minY - 1); y <= Math.min(CELL - 1, core.maxY + 1); y++) {
      for (let x = Math.max(0, core.minX - 1); x <= Math.min(CELL - 1, core.maxX + 1); x++) {
        if (core.alpha(x, y) > 0) cell.erase(x, y);
        else if (cell.alpha(x, y) > 0 && hasNeighbor(core, x, y)) cell.set(x, y, OUTLINE);
      }
    }
  }
}

/** Erase pixels hidden by the torso/head (props held in front, seen from behind). */
export function hideBehindBody(t: Cell, r: Rig): void {
  for (const b of [r.torso, r.head]) {
    for (let y = b.y - 1; y <= b.y + b.h; y++) {
      for (let x = b.x - 1; x <= b.x + b.w; x++) t.erase(x, y);
    }
  }
}

export type Draw = (cell: Cell, r: Rig) => void;
/** Runs after rotation/mirroring, in final screen space. */
export type Post = (cell: Cell, r: Rig, mirrored: boolean) => void;
