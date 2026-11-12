import type { AnimFrame, Direction, Species } from "../../shared/types.js";
import { CELL, Cell, rgba, shade, shape, tint, type Pt, type Rgba } from "./cell.js";

const SHADOW: Rgba = [24, 14, 10, 64];
const EYE: Rgba = [34, 24, 22, 255];
const WHITE: Rgba = [250, 248, 242, 255];
const MOUTH: Rgba = [120, 40, 44, 255];
const PINK: Rgba = [232, 130, 140, 255];
const SWEAT: Rgba = [150, 205, 245, 255];
const ZZZ: Rgba = [214, 230, 255, 255];
const IVORY: Rgba = [240, 232, 212, 255];
const ANTLER: Rgba = [200, 160, 112, 255];
const RED: Rgba = [214, 58, 58, 255];
const GOLD: Rgba = [232, 192, 64, 255];

type View = "front" | "side" | "back";
type Ears = "pointy" | "floppy" | "long" | "round" | "big" | "none";
type Tail = "curl" | "pig" | "long" | "puff" | "bushy" | "tuft" | "fan" | "flick" | "short";
type Extra =
  | "stripes"
  | "spots"
  | "points"
  | "mane"
  | "tusks"
  | "horns"
  | "antlers"
  | "trunk"
  | "comb"
  | "bill"
  | "face"
  | "tongue"
  | "piggy"
  | "eyepatch";

interface Spec {
  kind: "quad" | "bird";
  /** Body length (side view), height, and width (front/back view). */
  len: number;
  h: number;
  w: number;
  leg: number;
  legW: number;
  /** Side-view head size; `headF` = head width seen from the front. */
  head: [number, number];
  headF: number;
  /** Head center offset from the top-front corner of the body. */
  neck: Pt;
  snout: number;
  ears: Ears;
  tail: Tail;
  main: string;
  belly: string;
  dark: string;
  nose: string;
  muzzle?: string;
  foot?: string;
  footRows?: number;
  extras?: Extra[];
  hop?: boolean;
  fly?: boolean;
}

const SPECS: Record<Species, Spec> = {
  dog: {
    kind: "quad", len: 14, h: 7, w: 9, leg: 5, legW: 2, head: [8, 7], headF: 9, neck: [1, -3], snout: 3,
    ears: "pointy", tail: "curl", main: "#c8945a", belly: "#f0dcb8", dark: "#6e4a2a", nose: "#2a1e1a",
    extras: ["tongue"],
  },
  cat: {
    kind: "quad", len: 12, h: 6, w: 8, leg: 4, legW: 2, head: [7, 6], headF: 8, neck: [0, -3], snout: 1,
    ears: "pointy", tail: "long", main: "#e8dcc4", belly: "#f6eee0", dark: "#5a4234", nose: "#c87a7a",
    muzzle: "#8a6a56", foot: "#5a4234", footRows: 2, extras: ["points"],
  },
  rabbit: {
    kind: "quad", len: 9, h: 6, w: 7, leg: 2, legW: 2, head: [6, 5], headF: 7, neck: [0, -2], snout: 1,
    ears: "long", tail: "puff", main: "#ece8e0", belly: "#ffffff", dark: "#b8a8a0", nose: "#e88a9a",
    hop: true,
  },
  chicken: {
    kind: "bird", len: 9, h: 7, w: 7, leg: 3, legW: 1, head: [5, 5], headF: 5, neck: [0, 0], snout: 0,
    ears: "none", tail: "fan", main: "#f2ece0", belly: "#ffffff", dark: "#c8a070", nose: "#e8b030",
    foot: "#e8a030", extras: ["comb"],
  },
  duck: {
    kind: "bird", len: 10, h: 6, w: 8, leg: 2, legW: 1, head: [5, 5], headF: 5, neck: [0, 0], snout: 0,
    ears: "none", tail: "flick", main: "#f6f4ee", belly: "#ffffff", dark: "#d0c8b8", nose: "#f09030",
    foot: "#f09030", extras: ["bill"],
  },
  buffalo: {
    kind: "quad", len: 22, h: 11, w: 16, leg: 7, legW: 3, head: [9, 8], headF: 10, neck: [2, -1], snout: 2,
    ears: "round", tail: "tuft", main: "#5e5e68", belly: "#70707a", dark: "#34343a", nose: "#2a2a2e",
    muzzle: "#4a4a52", foot: "#2a2a2e", extras: ["horns"],
  },
  pig: {
    kind: "quad", len: 16, h: 9, w: 12, leg: 3, legW: 3, head: [8, 8], headF: 10, neck: [1, -1], snout: 2,
    ears: "floppy", tail: "pig", main: "#f0b0a8", belly: "#f8c8c0", dark: "#c87870", nose: "#d88a84",
    muzzle: "#f0b0a8", foot: "#8a5a50", extras: ["piggy"],
  },
  deer: {
    kind: "quad", len: 15, h: 7, w: 9, leg: 9, legW: 2, head: [6, 5], headF: 7, neck: [2, -6], snout: 3,
    ears: "pointy", tail: "puff", main: "#b8784a", belly: "#f0dcc0", dark: "#7a4a2a", nose: "#2a1e1a",
    foot: "#3a2a20", extras: ["spots", "antlers"],
  },
  boar: {
    kind: "quad", len: 17, h: 9, w: 12, leg: 4, legW: 3, head: [9, 8], headF: 10, neck: [1, 0], snout: 3,
    ears: "pointy", tail: "tuft", main: "#5a4636", belly: "#6e5644", dark: "#2e241c", nose: "#8a6a5a",
    muzzle: "#5a4636", foot: "#2a201a", extras: ["mane", "tusks", "piggy"],
  },
  tiger: {
    kind: "quad", len: 20, h: 8, w: 12, leg: 6, legW: 3, head: [9, 8], headF: 12, neck: [1, -2], snout: 2,
    ears: "round", tail: "long", main: "#e88a2e", belly: "#f8ecd8", dark: "#2a1e18", nose: "#c86a5a",
    extras: ["stripes"],
  },
  elephant: {
    kind: "quad", len: 24, h: 15, w: 20, leg: 9, legW: 4, head: [12, 12], headF: 14, neck: [1, 0], snout: 1,
    ears: "big", tail: "tuft", main: "#8a8c96", belly: "#9a9ca6", dark: "#5a5c66", nose: "#8a8c96",
    muzzle: "#8a8c96", foot: "#c8c4b8", extras: ["trunk", "tusks"],
  },
  monkey: {
    kind: "quad", len: 11, h: 7, w: 9, leg: 5, legW: 2, head: [7, 7], headF: 9, neck: [1, -3], snout: 1,
    ears: "round", tail: "long", main: "#8a6040", belly: "#d8b090", dark: "#5a3a24", nose: "#5a3a2a",
    extras: ["face"],
  },
  squirrel: {
    kind: "quad", len: 7, h: 5, w: 6, leg: 2, legW: 2, head: [5, 4], headF: 6, neck: [0, -2], snout: 1,
    ears: "pointy", tail: "bushy", main: "#a86a3a", belly: "#f0d8b8", dark: "#6a4224", nose: "#3a2418",
    hop: true,
  },
  myna: {
    kind: "bird", len: 7, h: 5, w: 5, leg: 2, legW: 1, head: [4, 4], headF: 4, neck: [0, 0], snout: 0,
    ears: "none", tail: "short", main: "#2e2a2c", belly: "#4a4446", dark: "#1a1618", nose: "#f2c418",
    foot: "#f2c418", extras: ["eyepatch"], fly: true,
  },
};

export const ANIMAL_NAMES: Record<Species, string> = {
  dog: "Thai Dog",
  cat: "Siamese Cat",
  rabbit: "Rabbit",
  chicken: "Chicken",
  duck: "Duck",
  buffalo: "Water Buffalo",
  pig: "Pig",
  deer: "Deer",
  boar: "Wild Boar",
  tiger: "Tiger",
  elephant: "Elephant",
  monkey: "Monkey",
  squirrel: "Squirrel",
  myna: "Myna Bird",
};

export const animalBaseColor = (sp: Species) => SPECS[sp].main;

/** Species with a neck a collar can sit on. */
export const COLLAR_SPECIES: Species[] = ["dog", "cat", "rabbit", "pig", "buffalo"];

// ---------------------------------------------------------------------------
// Poses: every human frame id maps to the closest animal action.

interface LegP {
  dx: number;
  up: number;
}
type Eyes = "open" | "closed" | "x" | "squint" | "half" | "angry";
type Mode = "stand" | "sit" | "rest" | "ko";

interface Pose {
  /** near front, far front, near back, far back (birds use the first two). */
  legs: [LegP, LegP, LegP, LegP];
  bob: number;
  lift: number;
  dx: number;
  head: Pt;
  /** 0..1, how far the head reaches down to the ground (eat, sniff, peck). */
  down: number;
  /** -1 droop, 0 rest, 1 up, 2/3 wag left/right. */
  tail: number;
  mouth: boolean;
  eyes: Eyes;
  mode: Mode;
  /** Raise (+) or drop (-) the front of the body. */
  front: number;
  flap: 0 | 1 | 2;
  sweat: boolean;
  zz: number;
  trunkUp: boolean;
}

const L = (dx = 0, up = 0): LegP => ({ dx, up });

function poseFor(frame: AnimFrame, s: Spec): Pose {
  const p: Pose = {
    legs: [L(), L(), L(), L()],
    bob: 0,
    lift: 0,
    dx: 0,
    head: [0, 0],
    down: 0,
    tail: 0,
    mouth: false,
    eyes: "open",
    mode: "stand",
    front: 0,
    flap: 0,
    sweat: false,
    zz: 0,
    trunkUp: false,
  };
  const bird = s.kind === "bird";
  const st = bird ? 1 : Math.max(2, Math.round(s.leg / 2.5));
  const set4 = (a: LegP, b: LegP, c: LegP, d: LegP) => {
    p.legs = [a, b, c, d];
  };
  const tuck = () => set4(L(1, 1), L(1, 1), L(-1, 1), L(-1, 1));

  switch (frame) {
    case "walk0":
    case "walk2": {
      const k = frame === "walk0" ? 1 : -1;
      if (s.hop) {
        if (k > 0) p.bob = 1;
        else {
          p.lift = 1;
          tuck();
        }
      } else set4(L(st * k), L(-st * k), L(-st * k), L(st * k));
      break;
    }
    case "walk1":
      if (s.hop) {
        p.lift = 3;
        set4(L(2), L(2), L(-2), L(-2));
      } else {
        set4(L(0, 1), L(), L(), L(0, 1));
        if (bird) p.head = [1, 0];
      }
      break;
    case "run0":
    case "run1":
    case "run2":
    case "run3": {
      const i = Number(frame[3]);
      p.tail = 1;
      if (bird && s.fly) {
        p.lift = 5 + (i % 2);
        p.flap = i % 2 ? 2 : 1;
        tuck();
      } else if (bird) {
        const k = i % 2 ? -1 : 1;
        set4(L(2 * k), L(-2 * k), L(), L());
        p.flap = 1;
        p.head = [1, 0];
      } else if (s.hop) {
        p.lift = [0, 4, 3, 1][i]!;
        if (i === 0) p.bob = 1;
        else set4(L(2), L(2), L(-2), L(-2));
      } else {
        p.head = [1, 0];
        if (i === 0) set4(L(st + 1), L(st), L(-st - 1), L(-st));
        if (i === 1) {
          p.lift = 1;
          set4(L(0, 2), L(0, 2), L(0, 1), L(0, 1));
        }
        if (i === 2) {
          p.bob = 1;
          set4(L(-st + 1), L(-st + 1), L(st - 1), L(st - 1));
        }
        if (i === 3) {
          p.lift = 2;
          tuck();
        }
      }
      break;
    }
    case "jump0":
      p.bob = Math.min(2, s.leg - 1);
      p.tail = 1;
      break;
    case "jump1":
      p.lift = 7;
      p.tail = 1;
      set4(L(2, 1), L(2, 1), L(-2, 1), L(-2, 1));
      if (bird) p.flap = 1;
      break;
    case "wave0":
      p.tail = 2;
      if (bird) p.flap = 1;
      break;
    case "wave1":
      p.tail = 3;
      p.mouth = true;
      p.head = [0, -1];
      p.trunkUp = true;
      if (bird) p.flap = 2;
      break;
    case "carry0":
      p.down = 1;
      break;
    case "carry1":
      p.down = 1;
      p.mouth = true;
      break;
    case "farm0":
      if (bird) {
        set4(L(-2, 1), L(), L(), L());
        p.down = 1;
      } else {
        set4(L(2, 3), L(), L(), L());
        p.down = 0.5;
      }
      break;
    case "farm1":
      if (bird) p.down = 1;
      else {
        set4(L(-1), L(1, 2), L(), L());
        p.down = 0.5;
      }
      break;
    case "cheer0":
      p.bob = 1;
      p.tail = 1;
      p.mouth = true;
      if (bird) p.flap = 1;
      break;
    case "cheer1":
      p.lift = 4;
      p.tail = 1;
      p.mouth = true;
      p.trunkUp = true;
      tuck();
      if (bird) p.flap = 2;
      break;
    case "attack0":
      p.bob = 1;
      p.front = -1;
      p.dx = -1;
      p.tail = 1;
      p.eyes = "angry";
      if (bird) p.flap = 1;
      break;
    case "attack1": {
      const butt = s.extras?.some((e) => e === "horns" || e === "antlers" || e === "tusks") ?? false;
      p.dx = 3;
      p.head = [2, butt ? 2 : 0];
      p.mouth = !butt;
      p.eyes = "angry";
      p.tail = 1;
      set4(L(2), L(1), L(-3), L(-2));
      if (bird) {
        p.flap = 2;
        p.down = 0.5;
        p.mouth = true;
      }
      break;
    }
    case "hurt0":
      p.dx = -2;
      p.eyes = "squint";
      p.head = [-1, -1];
      p.tail = -1;
      break;
    case "hurt1":
      p.dx = -1;
      p.lift = 1;
      p.eyes = "squint";
      p.mouth = true;
      p.tail = -1;
      break;
    case "fall0":
      p.bob = s.leg - 1;
      p.eyes = "squint";
      p.head = [0, 1];
      p.tail = -1;
      break;
    case "fall1":
      p.mode = "ko";
      p.eyes = "x";
      p.tail = -1;
      break;
    case "sleep0":
    case "sleep1":
      p.mode = "rest";
      p.eyes = "closed";
      p.zz = frame === "sleep0" ? 1 : 2;
      break;
    case "tired0":
      p.head = [0, 2];
      p.mouth = true;
      p.eyes = "half";
      p.bob = 1;
      p.tail = -1;
      p.sweat = true;
      break;
    case "tired1":
      p.head = [0, 1];
      p.mouth = true;
      p.eyes = "half";
      p.tail = -1;
      p.sweat = true;
      break;
    case "sit":
      p.mode = bird ? "rest" : "sit";
      break;
    case "crouch":
      p.down = 1;
      p.bob = 1;
      break;
    default:
      break;
  }
  return p;
}

// ---------------------------------------------------------------------------
// Layout: where the body and head sit in the 48px cell.

interface Lay {
  G: number;
  shadowY: number;
  /** Body extent: side = along the length, front/back = across the width. */
  x0: number;
  x1: number;
  bR: number;
  bF: number;
  top: number;
  hcx: number;
  hcy: number;
  hw: number;
  hh: number;
  hx0: number;
  hy0: number;
}

const ri = Math.round;

function viewShift(p: Pose, view: View): number {
  if (view === "front") return ri(p.dx / 2);
  if (view === "back") return -ri(p.dx / 2);
  return 0;
}

function quadLayout(s: Spec, p: Pose, view: View): Lay {
  const shiftY = viewShift(p, view);
  const G = 42 - p.lift + shiftY;
  const hw = view === "side" ? s.head[0] : s.headF;
  const hh = s.head[1];
  const span = s.len + s.neck[0] + Math.ceil(s.head[0] / 2) + s.snout;
  const x0 = view === "side" ? ri(24 - span / 2) + p.dx : 24 - Math.floor(s.w / 2);
  const x1 = view === "side" ? x0 + s.len - 1 : x0 + s.w - 1;

  const stand = G - s.leg + Math.min(p.bob, s.leg - 1);
  let bR = stand;
  let bF = stand - p.front;
  if (p.mode === "sit") {
    bR = G;
    bF = G - Math.max(2, s.leg - 1);
  } else if (p.mode !== "stand") {
    bR = G;
    bF = G;
  }
  const bottom = view === "back" ? bR : bF;
  // Seen from front/back, the body's length runs up the screen (top-down 3/4 view).
  const depth = view === "side" ? 0 : ri(s.len * 0.3);
  const chest = view === "side" ? s.h : Math.max(3, ri(s.h * 0.6));
  const top = bottom - chest + 1 - depth - (view !== "side" && p.mode === "sit" ? 2 : 0);
  const neckDy = view === "side" ? s.neck[1] : ri(s.neck[1] / 2);

  let hcx = view === "side" ? x1 + s.neck[0] + p.head[0] : 24;
  let hcy =
    view === "side"
      ? bF - s.h + 1 + neckDy
      : view === "front"
        ? bottom - Math.ceil(hh / 2) - 1 + neckDy
        : top + neckDy;
  hcy += p.head[1];
  if (view !== "back") {
    if (p.mode === "rest") {
      hcy = G - Math.ceil(hh / 2);
      if (view === "side") hcx = x1 + Math.max(0, s.neck[0]);
    } else if (p.mode === "ko") {
      hcy = G - Math.ceil(hh / 2) + (view === "front" ? 1 : 0);
      if (view === "side") hcx = x1 + s.neck[0] + 1;
    }
  }
  if (p.down) {
    const gy = view === "back" ? hcy + 2 : G - Math.ceil(hh / 2);
    hcy = ri(hcy + (gy - hcy) * p.down);
    if (view === "side") hcx += ri(2 * p.down);
  }
  hcy = Math.max(Math.ceil(hh / 2) + 2, hcy);
  const hx0 = hcx - Math.floor(hw / 2);
  const hy0 = hcy - Math.floor(hh / 2);
  return { G, shadowY: 43 + shiftY, x0, x1, bR, bF, top, hcx, hcy, hw, hh, hx0, hy0 };
}

function birdLayout(s: Spec, p: Pose, view: View): Lay {
  const shiftY = viewShift(p, view);
  const G = 42 - p.lift + shiftY;
  const grounded = p.mode === "rest" || p.mode === "ko";
  const bottom = grounded ? G : G - s.leg + Math.min(p.bob, s.leg);
  const len = view === "side" ? s.len : s.w;
  const x0 = (view === "side" ? 24 + p.dx : 24) - Math.floor(len / 2);
  const x1 = x0 + len - 1;
  const top = bottom - s.h + 1;
  const r = Math.floor(s.head[0] / 2);
  let hcx = view === "side" ? x1 - 1 + p.head[0] : 24;
  let hcy = top - 1 + p.head[1] + (view === "front" ? 1 : 0);
  if (p.mode === "rest") {
    hcx = view === "side" ? x1 - 2 : 24;
    hcy = top + 1;
  } else if (p.mode === "ko") {
    hcx = view === "side" ? x1 + 1 : 24;
    hcy = G - r;
  }
  if (p.down) {
    hcy = ri(hcy + (G - r - hcy) * p.down);
    if (view === "side") hcx += ri(2 * p.down);
  }
  const hw = s.head[0];
  return {
    G,
    shadowY: 43 + shiftY,
    x0,
    x1,
    bR: bottom,
    bF: bottom,
    top,
    hcx,
    hcy,
    hw,
    hh: hw,
    hx0: hcx - r,
    hy0: hcy - r,
  };
}

// ---------------------------------------------------------------------------
// Drawing helpers

interface Colors {
  main: Rgba;
  hi: Rgba;
  far: Rgba;
  belly: Rgba;
  dark: Rgba;
  nose: Rgba;
  muzzle: Rgba;
  foot: Rgba;
  ear: Rgba;
  tail: Rgba;
}

function colorsOf(s: Spec): Colors {
  const main = rgba(s.main);
  const points = s.extras?.includes("points");
  const dark = rgba(s.dark);
  return {
    main,
    hi: tint(main, 0.15),
    far: shade(main, 0.8),
    belly: rgba(s.belly),
    dark,
    nose: rgba(s.nose),
    muzzle: rgba(s.muzzle ?? s.belly),
    foot: rgba(s.foot ?? s.main),
    ear: points ? dark : main,
    tail: points ? dark : s.tail === "puff" ? rgba(s.belly) : main,
  };
}

const poly = (t: Cell, pts: Pt[], w: number, c: Rgba) =>
  t.poly(
    pts.map(([x, y]) => [ri(x), ri(y)] as Pt),
    w,
    c,
  );

/** One eye; `dir` is the outward side (-1 left/back, 1 right). */
function eye(c: Cell, x: number, y: number, kind: Eyes, dir: number, big: boolean, lid: Rgba): void {
  switch (kind) {
    case "open":
    case "angry":
      c.rect(x, y, 1, 2, EYE);
      if (big) {
        c.rect(x + dir, y, 1, 2, EYE);
        c.set(x, y, WHITE);
      }
      if (kind === "angry") {
        c.set(x - dir, y - 1, EYE);
        c.set(x, y - 2, EYE);
      }
      break;
    case "closed":
      c.set(x, y + 1, EYE);
      c.set(x + dir, y + 1, EYE);
      break;
    case "half":
      c.set(x, y, lid);
      c.set(x + dir, y, lid);
      c.set(x, y + 1, EYE);
      break;
    case "squint":
      c.set(x + dir, y, EYE);
      c.set(x, y + 1, EYE);
      c.set(x + dir, y + 2, EYE);
      break;
    case "x":
      c.set(x - 1, y - 1, EYE);
      c.set(x + 1, y - 1, EYE);
      c.set(x, y, EYE);
      c.set(x - 1, y + 1, EYE);
      c.set(x + 1, y + 1, EYE);
      break;
  }
}

const droopy = (p: Pose) => p.eyes === "half" || p.eyes === "squint" || p.eyes === "x" || p.eyes === "closed";

function legRun(
  t: Cell,
  w: number,
  x: number,
  hipY: number,
  footY: number,
  dx: number,
  col: Rgba,
  footCol: Rgba,
  footRows: number,
): void {
  const n = Math.max(1, footY - hipY);
  for (let y = hipY; y <= footY; y++) {
    const xo = ri((dx * (y - hipY)) / n);
    t.rect(x + xo, y, w, 1, footY - y < footRows ? footCol : col);
  }
}

// ---------------------------------------------------------------------------
// Quadrupeds

function tailSide(t: Cell, s: Spec, C: Colors, p: Pose, x: number, ty: number, bottom: number): void {
  const wag = p.tail === 2 ? -1 : p.tail === 3 ? 1 : 0;
  const droop = p.tail === -1 || p.mode === "ko";
  switch (s.tail) {
    case "curl":
      poly(
        t,
        droop
          ? [[x, ty + 1], [x - 2, ty + 3], [x - 2, ty + 5]]
          : [[x, ty], [x - 2, ty - 2], [x - 2 + wag, ty - 4], [x + wag, ty - 5]],
        2,
        C.tail,
      );
      break;
    case "pig":
      poly(t, [[x, ty + 1], [x - 1, ty], [x - 2, ty + 1], [x - 1, ty + 2]], 1, C.tail);
      break;
    case "long": {
      const k = s.len >= 16 ? 1.5 : 1;
      const pts: Pt[] = droop
        ? [[x, ty + 1], [x - 3 * k, ty + 3 * k], [x - 5 * k, ty + 6 * k]]
        : p.tail === 1
          ? [[x, ty + 1], [x - 2, ty - 1], [x - 3, ty - 5 * k], [x - 2, ty - 7 * k]]
          : [[x, ty + 1], [x - 3 * k, ty + 2], [x - 5 * k + wag, ty], [x - 5 * k + wag * 2, ty - 3 * k]];
      poly(t, pts, 2, C.tail);
      break;
    }
    case "puff":
      t.ellipse(x, ty + 1, 1.5, 1.5, C.tail);
      break;
    case "bushy":
      if (droop) t.ellipse(x - 3, ty + 2, 3.5, 2, C.tail);
      else {
        t.ellipse(x - 2 + wag, ty - 1, 2.5, 3.5, C.tail);
        t.ellipse(x - 1 + wag, ty - 5, 2.5, 2.5, C.tail);
      }
      break;
    case "tuft": {
      const end: Pt = [x - 1 + wag, Math.min(bottom + 2, ty + ri(s.h * 0.8))];
      poly(t, [[x, ty + 1], end], 1, C.tail);
      t.rect(end[0], end[1], 2, 2, C.dark);
      break;
    }
    default:
      break;
  }
}

function tailBack(t: Cell, s: Spec, C: Colors, p: Pose, cx: number, top: number, bottom: number): void {
  const wag = p.tail === 2 ? -2 : p.tail === 3 ? 2 : 0;
  const droop = p.tail === -1;
  switch (s.tail) {
    case "curl":
      poly(t, droop ? [[cx, top + 1], [cx, top + 5]] : [[cx, top + 1], [cx + wag / 2, top - 2], [cx + 2 + wag, top - 3]], 2, C.tail);
      break;
    case "pig":
      poly(t, [[cx, top + 2], [cx + 1, top + 1], [cx + 2, top + 2], [cx + 1, top + 3]], 1, C.tail);
      break;
    case "long":
      poly(
        t,
        p.tail === 1 && !droop
          ? [[cx, top + 1], [cx, top - 4], [cx + 1, top - 6]]
          : [[cx, top + 1], [cx, bottom - 1], [cx + 2 + wag, bottom + 1]],
        2,
        C.tail,
      );
      break;
    case "puff":
      t.ellipse(cx, top + 2, 1.5, 1.5, C.tail);
      break;
    case "bushy":
      t.ellipse(cx + wag / 2, top - 2, 3, 4, C.tail);
      break;
    case "tuft":
      poly(t, [[cx, top + 1], [cx + wag / 2, top + s.h - 2]], 1, C.tail);
      t.rect(cx + wag / 2, top + s.h - 1, 2, 2, C.dark);
      break;
    default:
      break;
  }
}

function drawQuadSide(c: Cell, s: Spec, C: Colors, p: Pose, l: Lay): void {
  const { G, x0, x1, bR, bF } = l;
  const bodyAt = (x: number) => ri(bR + ((bF - bR) * (x - x0)) / Math.max(1, s.len - 1));
  const inset = s.legW > 2 ? 1 : 0;
  const nf = x1 - s.legW - inset;
  const nb = x0 + 1 + inset;
  const off = Math.max(1, s.legW - 1);
  const footRows = s.footRows ?? (s.foot ? 1 : 0);
  const farFoot = shade(C.foot, 0.8);
  const kl = Math.min(s.leg, 3 + Math.floor(s.leg / 3));

  c.ellipse(ri((x0 + l.hx0 + l.hw) / 2), l.shadowY, Math.max(3, (l.hx0 + l.hw - x0) / 2 + 1 - p.lift / 2), 1.6, SHADOW);

  // Far legs (shaded, one row higher for depth).
  shape(c, (t) => {
    const [, ff, , fb] = p.legs;
    if (p.mode === "stand") {
      legRun(t, s.legW, nf - off, bodyAt(nf) - 1, G - 1 - ff.up, ff.dx, C.far, farFoot, footRows);
      legRun(t, s.legW, nb + off, bodyAt(nb) - 1, G - 1 - fb.up, fb.dx, C.far, farFoot, footRows);
    } else if (p.mode === "sit") {
      legRun(t, s.legW, nf - off, bF - 1, G - 1, 0, C.far, farFoot, footRows);
    } else if (p.mode === "ko") {
      for (const x of [nf - off, nb + off]) {
        const top = bodyAt(x) - s.h + 1;
        t.rect(x, top - kl + 1, s.legW, kl, C.far);
        t.rect(x, top - kl + 1, s.legW, 1, farFoot);
      }
    }
  });

  shape(c, (t) => tailSide(t, s, C, p, x0, bR - s.h + 2, bR));

  // Body plus near legs.
  shape(c, (t) => {
    const [nfl, , nbl] = p.legs;
    if (p.mode === "stand") {
      legRun(t, s.legW, nf, bodyAt(nf) - 1, G - nfl.up, nfl.dx, C.main, C.foot, footRows);
      legRun(t, s.legW, nb, bodyAt(nb) - 1, G - nbl.up, nbl.dx, C.main, C.foot, footRows);
    } else if (p.mode === "sit") {
      legRun(t, s.legW, nf, bF - 1, G, 0, C.main, C.foot, footRows);
      t.rect(x0 + 2, G - 1, Math.max(3, s.legW + 1), 2, C.foot);
    } else if (p.mode === "rest") {
      t.rect(x1 - 1, G - 1, Math.max(3, s.legW + 1), 2, C.main);
    } else {
      for (const x of [nf, nb]) {
        const top = bodyAt(x) - s.h + 1;
        t.rect(x, top - kl, s.legW, kl + 1, C.main);
        t.rect(x, top - kl, s.legW, 1, C.foot);
      }
    }
    if (p.mode !== "ko" && p.mode !== "rest") {
      poly(t, [[x1 - 2, bF - s.h + 3], [l.hcx - 1, l.hcy + 1]], Math.max(3, s.legW + 1), C.main);
    }
    const r = Math.min(3, Math.floor(s.h / 2));
    const bellyH = Math.max(1, ri(s.h / 4));
    for (let i = 0; i < s.len; i++) {
      const x = x0 + i;
      const b = bodyAt(x);
      const top = b - s.h + 1;
      const d = Math.min(i, s.len - 1 - i);
      for (let y = top; y <= b; y++) {
        const dy = Math.min(y - top, b - y);
        if (dy + d < r - 1) continue;
        const bellyRow = p.mode === "ko" ? y - top < bellyH : b - y < bellyH;
        t.set(x, y, bellyRow && d >= 2 ? C.belly : p.mode !== "ko" && y === top + 1 && d >= 2 ? C.hi : C.main);
      }
    }
  });

  // Coat patterns.
  const ex = s.extras ?? [];
  for (let x = x0 + 2; x <= x1 - 2; x++) {
    const b = bodyAt(x);
    const top = b - s.h + 1;
    const i = x - x0;
    if (ex.includes("stripes") && i % 3 === 2) {
      for (let k = 0; k <= ri(s.h * 0.5); k++) c.set(x + (Math.floor(k / 2) % 2), p.mode === "ko" ? b - k : top + k, C.dark);
    }
    if (ex.includes("spots") && i % 3 === 0 && x < x1 - 2) c.set(x, top + 2 + (i % 2), WHITE);
    if (ex.includes("mane") && p.mode !== "ko" && i % 2 === 0) {
      c.set(x, top - 1, C.dark);
      c.set(x, top, C.dark);
      if (i % 4 === 0) c.set(x, top - 2, C.dark);
    }
  }

  drawHeadSide(c, s, C, p, l);
}

function drawHeadSide(c: Cell, s: Spec, C: Colors, p: Pose, l: Lay): void {
  const { hx0, hy0, hw, hh, hcy, G } = l;
  const ex = s.extras ?? [];
  const earX = hx0 + Math.floor(hw * 0.3);
  const eh = hh >= 7 ? 3 : 2;
  const sh = Math.max(2, Math.ceil(hh / 2));
  const sy = hy0 + hh - sh - (hh >= 8 ? 1 : 0);
  const sBot = sy + sh - 1;
  const tipX = hx0 + hw - 1 + s.snout;

  shape(c, (t) => {
    if (s.ears === "pointy") {
      for (let k = 0; k < eh; k++) {
        if (droopy(p)) t.rect(earX - 1 - k, hy0 - 1 + Math.floor(k / 2), 2, 1, C.ear);
        else t.rect(earX, hy0 - 1 - k, Math.max(1, eh - k), 1, C.ear);
      }
    }
    if (s.ears === "round") t.ellipse(earX, hy0, 1.5, 1.5, C.ear);
    if (s.ears === "long") {
      if (droopy(p)) poly(t, [[earX, hy0], [earX - 4, hy0 + 1]], 2, C.ear);
      else {
        poly(t, [[earX + 1, hy0], [earX + 1, hy0 - 4]], 2, shade(C.ear, 0.9));
        poly(t, [[earX, hy0], [earX - 1, hy0 - 5]], 2, C.ear);
      }
    }
    t.round(hx0, hy0, hw, hh, Math.min(2, Math.floor(hh / 3)), C.main);
    if (s.snout > 0) {
      t.rect(hx0 + hw, sy, s.snout, sh, C.muzzle);
      if (C.muzzle !== C.main) t.rect(hx0 + hw - 2, sy + 1, 2, sh - 1, C.muzzle);
    }
    if (p.mouth && !ex.includes("trunk")) t.rect(tipX - s.snout - 1, sBot + 1, s.snout + 2, 1, C.muzzle);
  });

  if (s.ears === "floppy") shape(c, (t) => t.rect(earX, hy0 + 1, 2, Math.ceil(hh / 2) + 1, C.dark));
  if (s.ears === "big") {
    shape(c, (t) => t.ellipse(earX + 1, hcy + 1, hw * 0.28, hh * 0.42, shade(C.main, 0.88)));
  }
  if (ex.includes("horns")) {
    shape(c, (t) =>
      poly(t, [[hx0 + Math.floor(hw * 0.5), hy0], [hx0 + 1, hy0 - 2], [hx0 - 3, hy0 - 2], [hx0 - 5, hy0 + 1]], 1, IVORY),
    );
  }
  if (ex.includes("antlers")) {
    const bx = hx0 + Math.floor(hw * 0.45);
    shape(c, (t) => {
      poly(t, [[bx, hy0], [bx - 1, hy0 - 4], [bx - 3, hy0 - 7]], 1, ANTLER);
      poly(t, [[bx - 1, hy0 - 3], [bx + 1, hy0 - 5]], 1, ANTLER);
      poly(t, [[bx - 2, hy0 - 5], [bx - 1, hy0 - 8]], 1, ANTLER);
    });
  }
  if (ex.includes("trunk")) {
    const bx = hx0 + hw - 1;
    const by = hcy + 1;
    let pts: Pt[];
    if (p.mode === "ko") pts = [[bx, by], [bx + 3, by + 1], [bx + 5, by]];
    else if (p.down) pts = [[bx, by], [bx + 2, G - 2], [bx + 4, G - 1]];
    else if (p.trunkUp) pts = [[bx, by], [bx + 2, by - 3], [bx + 2, by - 7], [bx, by - 9]];
    else pts = [[bx, by], [bx + 2, by + 3], [bx + 2, G - 3], [bx + 3, G - 2]];
    if (ex.includes("tusks")) {
      shape(c, (t) => poly(t, [[hx0 + hw - 3, hcy + 3], [hx0 + hw - 1, hcy + 5], [hx0 + hw, hcy + 4]], 1, IVORY));
    }
    shape(c, (t) => {
      poly(t, pts.slice(0, 2), 3, C.main);
      poly(t, pts.slice(1), 2, C.main);
    });
  }

  // Face details (no outline).
  if (ex.includes("face")) c.round(hx0 + Math.floor(hw / 2) - 1, hy0 + 2, Math.ceil(hw / 2) + 1, hh - 3, 2, C.belly);
  if (ex.includes("stripes")) {
    c.rect(hx0 + 2, hy0, 1, 2, C.dark);
    c.rect(hx0 + 4, hy0, 1, 2, C.dark);
  }
  if (s.ears === "pointy" && !droopy(p) && eh === 3) c.set(earX + 1, hy0 - 1, s.extras?.includes("points") ? C.dark : PINK);
  if (s.snout > 0 || ex.includes("piggy")) {
    if (ex.includes("piggy")) {
      c.rect(tipX, sy, 1, sh, C.nose);
      c.set(tipX, sy + 1, C.dark);
    } else {
      c.set(tipX, sy, C.nose);
      if (hh >= 8) c.set(tipX - 1, sy, C.nose);
    }
  }
  if (ex.includes("tusks") && !ex.includes("trunk")) {
    c.set(tipX - 1, sy - 1, IVORY);
    c.set(tipX - 2, sy - 2, IVORY);
  }
  if (p.mouth && !ex.includes("trunk")) {
    c.rect(tipX - 1, sBot, 2, 1, MOUTH);
    if (ex.includes("tongue") && (p.eyes === "half" || p.tail === 1)) c.set(tipX - 1, sBot + 2, PINK);
  }
  const ex0 = hx0 + hw - 2 - (s.snout ? 0 : 1);
  const ey = hy0 + Math.floor(hh * 0.4);
  eye(c, ex0, ey, p.eyes, -1, hh >= 9, shade(C.main, 0.7));
}

function drawHeadFront(c: Cell, s: Spec, C: Colors, p: Pose, l: Lay, back: boolean): void {
  const { hx0, hy0, hw, hh, hcy, G } = l;
  const ex = s.extras ?? [];
  const eh = hh >= 7 ? 3 : 2;
  const mir = (x: number) => 2 * hx0 + hw - 1 - x;
  const both = (t: Cell, f: (m: (x: number) => number) => void) => {
    f((x) => x);
    f(mir);
  };
  const cxh = hx0 + (hw - 1) / 2;

  if (s.ears === "big") {
    shape(c, (t) =>
      both(t, (m) => t.ellipse(m(hx0 - 1), hcy + 1, hw * 0.3, hh * 0.45, shade(C.main, 0.88))),
    );
  }

  shape(c, (t) => {
    if (s.ears === "pointy") {
      for (let k = 0; k < eh; k++) {
        const w = Math.max(1, eh - k);
        if (droopy(p)) {
          t.rect(hx0 - 1 - k, hy0 + 1, 1, 1, C.ear);
          t.rect(mir(hx0 - 1 - k), hy0 + 1, 1, 1, C.ear);
        } else {
          t.rect(hx0, hy0 - 1 - k, w, 1, C.ear);
          t.rect(hx0 + hw - w, hy0 - 1 - k, w, 1, C.ear);
        }
      }
    }
    if (s.ears === "round") both(t, (m) => t.ellipse(m(hx0 + 1), hy0, 1.5, 1.5, C.ear));
    if (s.ears === "long") {
      both(t, (m) =>
        poly(t, droopy(p) ? [[m(hx0 + 1), hy0], [m(hx0 - 2), hy0 + 2]] : [[m(hx0 + 1), hy0], [m(hx0), hy0 - 5]], 2, C.ear),
      );
    }
    t.round(hx0, hy0, hw, hh, Math.min(2, Math.floor(hh / 3)), C.main);
  });

  if (s.ears === "floppy") {
    shape(c, (t) => both(t, (m) => t.rect(Math.min(m(hx0 - 1), m(hx0)), hy0 + 1, 2, Math.ceil(hh / 2) + 1, C.dark)));
  }
  if (ex.includes("horns")) {
    shape(c, (t) =>
      both(t, (m) => poly(t, [[m(hx0 + 2), hy0 + 1], [m(hx0 - 2), hy0], [m(hx0 - 5), hy0 - 2], [m(hx0 - 5), hy0 - 4]], 1, IVORY)),
    );
  }
  if (ex.includes("antlers")) {
    shape(c, (t) =>
      both(t, (m) => {
        poly(t, [[m(hx0 + 2), hy0], [m(hx0 + 1), hy0 - 4], [m(hx0 - 1), hy0 - 7]], 1, ANTLER);
        poly(t, [[m(hx0 + 1), hy0 - 3], [m(hx0 - 2), hy0 - 4]], 1, ANTLER);
      }),
    );
  }
  if (back) return;

  if (ex.includes("trunk")) {
    const tx = ri(cxh);
    const ty = hy0 + hh - 3;
    if (ex.includes("tusks")) {
      shape(c, (t) => both(t, (m) => poly(t, [[m(hx0 + 3), hy0 + hh - 2], [m(hx0 + 2), hy0 + hh + 1]], 1, IVORY)));
    }
    shape(c, (t) => {
      if (p.mode === "ko") poly(t, [[tx, ty], [tx + 3, ty + 2]], 2, C.main);
      else if (p.trunkUp && !p.down) {
        poly(t, [[tx, ty + 1], [tx + 2, hy0 + 3]], 3, C.main);
        poly(t, [[tx + 2, hy0 + 3], [tx + 3, hy0 - 2]], 2, C.main);
      } else {
        poly(t, [[tx, ty], [tx, Math.min(G - 3, ty + 4)]], 3, C.main);
        poly(t, [[tx, Math.min(G - 3, ty + 4)], [tx, G - 2]], 2, C.main);
      }
    });
  }

  if (ex.includes("face")) c.round(hx0 + 1, hy0 + 2, hw - 2, hh - 3, 2, C.belly);
  if (ex.includes("stripes")) {
    c.rect(ri(cxh), hy0, 1, 2, C.dark);
    c.rect(hx0 + 1, hy0 + 2, 1, 2, C.dark);
    c.rect(mir(hx0 + 1), hy0 + 2, 1, 2, C.dark);
  }

  const nw = (hw % 2 ? 1 : 2) + (ex.includes("piggy") ? 2 : 0);
  const nx = hx0 + (hw - nw) / 2;
  const my = hy0 + Math.ceil(hh * 0.5);
  const mh = Math.max(2, Math.floor(hh / 3));
  if (!ex.includes("trunk")) {
    if (s.snout > 0 && C.muzzle !== C.main) {
      const mw = (hw % 2) + 2 * Math.floor(hw / 4);
      c.round(hx0 + (hw - mw) / 2, my, mw, mh, 2, C.muzzle);
    }
    if (ex.includes("piggy")) {
      c.rect(nx, my, nw, 2, C.nose);
      c.set(nx, my + 1, C.dark);
      c.set(nx + nw - 1, my + 1, C.dark);
      if (ex.includes("tusks")) {
        c.set(nx - 1, my - 1, IVORY);
        c.set(nx + nw, my - 1, IVORY);
      }
    } else c.rect(nx, my, nw, 1, C.nose);
    if (p.mouth) {
      c.rect(nx, my + mh - (ex.includes("piggy") ? 0 : 1), Math.max(2, nw), 1, MOUTH);
      if (ex.includes("tongue") && (p.eyes === "half" || p.tail === 1)) c.set(nx, my + mh, PINK);
    }
  }
  const off = Math.floor(hw / 4);
  const ey = hy0 + Math.floor(hh * 0.4);
  const lid = shade(C.main, 0.7);
  eye(c, hx0 + off, ey, p.eyes, -1, false, lid);
  eye(c, hx0 + hw - 1 - off, ey, p.eyes, 1, false, lid);
}

function drawQuadFrontBack(c: Cell, s: Spec, C: Colors, p: Pose, l: Lay, back: boolean): void {
  const { G, x0, x1, top } = l;
  const bottom = back ? l.bR : l.bF;
  const h = bottom - top + 1;
  const lx = x0 + 1;
  const rx = x1 - s.legW;
  const footRows = s.footRows ?? (s.foot ? 1 : 0);
  const farFoot = shade(C.foot, 0.8);
  const kl = Math.min(s.leg, 3 + Math.floor(s.leg / 3));
  const up = (leg: LegP) => leg.up + (leg.dx > 0 ? 1 : 0);
  const cx = ri(x0 + (s.w - 1) / 2);

  c.ellipse(x0 + (s.w - 1) / 2, l.shadowY, Math.max(3, s.w / 2 + 1 - p.lift / 2), 1.6, SHADOW);

  if (back) drawHeadFront(c, s, C, p, l, true);

  // Tail peeking over the back when seen from the front.
  if (!back && (s.tail === "bushy" || (s.tail === "long" && p.tail === 1))) {
    shape(c, (t) => {
      if (s.tail === "bushy") t.ellipse(x1, top - 2, 2.5, 3.5, C.tail);
      else poly(t, [[x1 - 1, top + 1], [x1 + 2, top - 2], [x1 + 2, top - 5]], 2, C.tail);
    });
  }

  // Legs on the far side of the body (shaded, higher up the screen).
  shape(c, (t) => {
    if (p.mode !== "stand" && p.mode !== "sit") return;
    const [nfl, ffl, nbl, fbl] = p.legs;
    const far = back ? [nfl, ffl] : [nbl, fbl];
    if (s.w >= 4 * s.legW) {
      legRun(t, s.legW, rx - s.legW - 1, bottom - 1, G - 2 - up(far[0]!), 0, C.far, farFoot, footRows);
      legRun(t, s.legW, lx + s.legW + 1, bottom - 1, G - 2 - up(far[1]!), 0, C.far, farFoot, footRows);
    }
  });

  if (p.mode === "ko") {
    shape(c, (t) => {
      for (const x of [lx, rx]) {
        t.rect(x, top - kl, s.legW, kl + 1, C.main);
        t.rect(x, top - kl, s.legW, 1, C.foot);
      }
    });
  }

  shape(c, (t) => {
    const [nfl, ffl, nbl, fbl] = p.legs;
    const near = back ? [nbl, fbl] : [nfl, ffl];
    if (p.mode === "stand") {
      legRun(t, s.legW, rx, bottom - 1, G - up(near[0]!), 0, C.main, C.foot, footRows);
      legRun(t, s.legW, lx, bottom - 1, G - up(near[1]!), 0, C.main, C.foot, footRows);
    } else if (p.mode === "sit") {
      legRun(t, s.legW, rx, bottom - 1, G, 0, C.main, C.foot, footRows);
      legRun(t, s.legW, lx, bottom - 1, G, 0, C.main, C.foot, footRows);
    }
    t.round(x0, top, s.w, h, Math.min(3, Math.floor(Math.min(s.w, h) / 2)), C.main);
    t.rect(x0 + 2, top + 1, s.w - 4, 1, C.hi);
  });

  const ex = s.extras ?? [];
  if (ex.includes("stripes")) {
    for (let y = top + 1; y < bottom - 1; y += 2) {
      c.set(x0 + 1, y, C.dark);
      c.set(x1 - 1, y, C.dark);
      if (back) {
        c.set(x0 + 2, y, C.dark);
        c.set(x1 - 2, y, C.dark);
      }
    }
  }
  if (ex.includes("spots")) {
    c.set(x0 + 2, top + 1, WHITE);
    c.set(x1 - 2, top + 2, WHITE);
    if (back) {
      c.set(cx - 2, top + 3, WHITE);
      c.set(cx + 2, top + 2, WHITE);
    }
  }
  if (ex.includes("mane") && back) c.rect(cx, top, 1, h - 2, C.dark);

  if (back) shape(c, (t) => tailBack(t, s, C, p, cx, Math.max(top, bottom - s.h + 1), bottom));
  else drawHeadFront(c, s, C, p, l, false);
}

// ---------------------------------------------------------------------------
// Birds

function drawBird(c: Cell, s: Spec, C: Colors, p: Pose, l: Lay, view: View): void {
  const { G, x0, x1, top, hcx, hcy, hx0, hy0, hw } = l;
  const bottom = l.bR;
  const len = x1 - x0 + 1;
  const rx = len / 2;
  const ry = s.h / 2;
  const bx = x0 + (len - 1) / 2;
  const by = top + (s.h - 1) / 2;
  const r = Math.floor(hw / 2);
  const ex = s.extras ?? [];
  const grounded = p.mode === "rest" || p.mode === "ko";
  const wing = shade(C.main, 0.86);

  c.ellipse(bx, l.shadowY, Math.max(2.5, rx + 1 - p.lift / 2), 1.4, SHADOW);

  const tail = (t: Cell) => {
    if (view === "side") {
      if (s.tail === "fan") {
        poly(t, [[x0 + 1, by - 1], [x0 - 2, by - 5]], 3, C.dark);
        poly(t, [[x0 + 1, by], [x0 - 2, by - 2]], 2, shade(C.dark, 0.85));
      } else if (s.tail === "flick") poly(t, [[x0 + 1, by - 1], [x0 - 1, by - 3]], 2, C.dark);
      else poly(t, [[x0 + 1, by], [x0 - 2, by + 1]], 2, C.dark);
    } else if (view === "back") {
      const cx = ri(bx);
      if (s.tail === "fan") poly(t, [[cx, by - 1], [cx, top - 4]], 3, C.dark);
      else if (s.tail === "flick") poly(t, [[cx, top + 1], [cx, top - 1]], 2, C.dark);
      else t.rect(cx - 1, bottom - 1, 2, 3, C.dark);
    }
  };

  const head = (t: Cell, faceSide: boolean) => {
    t.ellipse(hcx, hcy, r + 0.3, r + 0.3, C.main);
    if (!faceSide) return;
    if (view === "side") {
      if (ex.includes("bill")) t.rect(hcx + r + 1, hcy, 3, 2, C.nose);
      else {
        t.rect(hcx + r + 1, hcy, 2, 1, C.nose);
        t.set(hcx + r + 1, hcy + 1, C.nose);
      }
      if (p.mouth) t.rect(hcx + r + 1, hcy + 2, ex.includes("bill") ? 3 : 2, 1, C.nose);
    } else {
      if (ex.includes("bill")) t.rect(hcx - 1, hcy + 1, 3, 2, C.nose);
      else t.rect(hcx, hcy + 1, 1, 2, C.nose);
    }
  };

  const comb = (t: Cell) => {
    if (!ex.includes("comb")) return;
    t.rect(hcx - 1, hy0 - 1, 3, 1, RED);
    t.set(hcx, hy0 - 2, RED);
    if (view === "side") t.set(hcx - 1, hy0 - 2, RED);
    if (view !== "back") t.set(view === "side" ? hcx + r + 1 : hcx, hcy + (view === "side" ? 2 : 3), RED);
  };

  // Legs behind the body.
  shape(c, (t) => {
    const legsAt: Array<[number, LegP, number]> =
      view === "side"
        ? [
            [ri(bx) - 1, p.legs[1], 1],
            [ri(bx) + 1, p.legs[0], 0],
          ]
        : [
            [ri(bx) - 2, p.legs[1], 0],
            [ri(bx) + 1, p.legs[0], 0],
          ];
    for (const [x, leg, far] of legsAt) {
      const col = far ? shade(C.foot, 0.8) : C.foot;
      if (p.mode === "ko") {
        poly(t, [[x, top], [x + (view === "side" ? 1 : 0), top - 3]], 1, col);
        continue;
      }
      if (grounded) continue;
      const footY = G - far - leg.up - (view === "side" ? 0 : leg.dx > 0 ? 1 : 0);
      const fx = x + (view === "side" ? leg.dx : 0);
      poly(t, [[x, bottom - 1], [fx, footY]], 1, col);
      if (view === "side") t.rect(fx, footY, ex.includes("bill") ? 3 : 2, 1, col);
      else t.rect(fx - (ex.includes("bill") ? 1 : 0), footY, ex.includes("bill") ? 3 : 2, 1, col);
    }
  });

  if (view === "back") shape(c, (t) => head(t, false));
  if (view === "side") shape(c, tail);

  shape(c, (t) => {
    t.ellipse(bx, by, rx, ry, C.main);
    if (view !== "back") t.ellipse(bx + (view === "side" ? 1 : 0), by + 1, rx * 0.6, ry * 0.55, C.belly);
  });

  // Wings.
  shape(c, (t) => {
    const flap = p.flap;
    if (view === "side") {
      if (flap === 1) poly(t, [[bx, by - 1], [bx - 2, by - ry - 3], [bx - 4, by - ry - 4]], 3, wing);
      else if (flap === 2) poly(t, [[bx, by], [bx - 2, by + ry + 2]], 3, wing);
      else t.ellipse(bx - 1, by, rx * 0.55, ry * 0.55, wing);
    } else {
      for (const k of [-1, 1]) {
        const ex0 = bx + k * (rx - 0.5);
        if (flap === 1) poly(t, [[ex0, by - 1], [ex0 + k * 3, by - ry - 3]], 2, wing);
        else if (flap === 2) poly(t, [[ex0, by], [ex0 + k * 3, by + 2]], 2, wing);
        else t.ellipse(ex0, by, 1.2, ry * 0.7, wing);
      }
    }
  });

  if (view === "back") {
    shape(c, tail);
    return;
  }

  shape(c, (t) => {
    comb(t);
    head(t, true);
  });

  if (ex.includes("eyepatch")) {
    if (view === "side") c.set(hcx, hcy, C.nose);
    else {
      c.set(hcx - 2, hcy, C.nose);
      c.set(hcx + 2, hcy, C.nose);
    }
  }
  const lid = shade(C.main, 0.7);
  if (view === "side") eye(c, hcx + 1, hcy - 1, p.eyes, -1, false, lid);
  else {
    const off = hw >= 5 ? 1 : 1;
    eye(c, hcx - off - (p.eyes === "x" ? 1 : 0), hcy - 1, p.eyes, -1, false, lid);
    eye(c, hcx + off + (p.eyes === "x" ? 1 : 0), hcy - 1, p.eyes, 1, false, lid);
  }
  if (view === "front" && p.mouth) c.set(hcx, hcy + 2, MOUTH);
}

// ---------------------------------------------------------------------------
// Overlays and the public entry points

function glyph(c: Cell, gx: number, gy: number, s: number): void {
  c.rect(gx, gy, s, 1, ZZZ);
  for (let i = 1; i < s - 1; i++) c.set(gx + s - 1 - i, gy + i, ZZZ);
  c.rect(gx, gy + s - 1, s, 1, ZZZ);
}

function zzz(c: Cell, l: Lay, mirrored: boolean, phase: number): void {
  const at = (x: number, s: number) => (mirrored ? CELL - 1 - x - (s - 1) : x);
  const gx = l.hx0 + l.hw + 1;
  const gy = Math.max(1, l.hy0 - 6);
  glyph(c, at(gx, 3), gy, 3);
  if (phase === 2) glyph(c, at(gx + 4, 4), Math.max(0, gy - 5), 4);
}

function sweat(c: Cell, l: Lay, view: View): void {
  const x = view === "side" ? l.hx0 - 1 : l.hx0 + l.hw;
  c.set(x, l.hy0 + 1, WHITE);
  c.rect(x, l.hy0 + 2, 1, 2, SWEAT);
}

const viewOf = (d: Direction): View => (d === "front" ? "front" : d === "back" ? "back" : "side");

function setup(sp: Species, direction: Direction, frame: AnimFrame) {
  const s = SPECS[sp];
  const p = poseFor(frame, s);
  const view = viewOf(direction);
  const l = s.kind === "bird" ? birdLayout(s, p, view) : quadLayout(s, p, view);
  return { s, p, view, l };
}

export function animalCell(sp: Species, direction: Direction, frame: AnimFrame): Cell {
  const { s, p, view, l } = setup(sp, direction, frame);
  const C = colorsOf(s);
  let c = new Cell();
  if (s.kind === "bird") drawBird(c, s, C, p, l, view);
  else if (view === "side") drawQuadSide(c, s, C, p, l);
  else drawQuadFrontBack(c, s, C, p, l, view === "back");
  if (p.sweat && view !== "back") sweat(c, l, view);
  if (direction === "left") c = c.mirrored();
  if (p.zz) zzz(c, l, direction === "left", p.zz);
  return c;
}

/** Bell collar around the neck of `COLLAR_SPECIES`. */
export function collarCell(sp: Species, direction: Direction, frame: AnimFrame, color: Rgba): Cell {
  const { p, view, l } = setup(sp, direction, frame);
  const { hx0, hy0, hw, hh } = l;
  let c = new Cell();
  shape(c, (t) => {
    if (view === "side") {
      const y0 = hy0 + Math.floor(hh / 2);
      t.rect(hx0, y0, 2, hy0 + hh + 1 - y0, color);
      if (p.mode !== "ko") t.rect(hx0 + 2, hy0 + hh, 2, 2, GOLD);
    } else {
      const y = view === "front" ? hy0 + hh - 1 : Math.max(hy0 + hh - 2, l.top);
      t.rect(hx0 + 1, y, hw - 2, 1, color);
      const bw = hw % 2 ? 3 : 2;
      if (view === "front") t.rect(hx0 + (hw - bw) / 2, y + 1, bw, 2, GOLD);
    }
  });
  if (direction === "left") c = c.mirrored();
  return c;
}
