export type Direction = "front" | "right" | "back" | "left";
const FRAME_IDS = [
  "idle",
  "walk0",
  "walk1",
  "walk2",
  "run0",
  "run1",
  "run2",
  "run3",
  "jump0",
  "jump1",
  "wave0",
  "wave1",
  "carry0",
  "carry1",
  "farm0",
  "farm1",
  "cheer0",
  "cheer1",
  "attack0",
  "attack1",
  "hurt0",
  "hurt1",
  "fall0",
  "fall1",
  "sleep0",
  "sleep1",
  "tired0",
  "tired1",
  "sit",
  "crouch",
] as const;
export type AnimFrame = (typeof FRAME_IDS)[number];
export type ExportPresetId = "native" | "rpgmaker_mv" | "godot" | "frames";
export type AnimPresetId =
  | "idle"
  | "walk"
  | "run"
  | "jump"
  | "wave"
  | "carry"
  | "farm"
  | "cheer"
  | "attack"
  | "hurt"
  | "fall"
  | "sleep"
  | "tired"
  | "sit"
  | "pickup";

/** Body proportions. Non-body parts stack one block of direction rows per body type. */
export type BodyType = "adult" | "child" | "elder" | "stocky";
export const BODY_TYPES: BodyType[] = ["adult", "child", "elder", "stocky"];

/** Animal bodies are complete sprites; only parts that list the species in `bodyTypes` go on top. */
export const PET_SPECIES = ["dog", "cat", "rabbit", "chicken", "duck", "buffalo", "pig"] as const;
export const WILD_SPECIES = ["deer", "boar", "tiger", "elephant", "monkey", "squirrel", "myna"] as const;
export type Species = (typeof PET_SPECIES)[number] | (typeof WILD_SPECIES)[number];
export const SPECIES: Species[] = [...PET_SPECIES, ...WILD_SPECIES];
export type Build = BodyType | Species;

export function isSpecies(build: string | undefined): build is Species {
  return SPECIES.includes(build as Species);
}

export type PartSlot =
  | "body"
  | "pants"
  | "shoes"
  | "shirt"
  | "hair_back"
  | "hair_front"
  | "face"
  | "accessory";

export interface RecolorSpec {
  enabled: boolean;
  /** Source art main color (hex) that should follow the project tint */
  base: string;
  /** Max channel distance to treat as same family (default 72) */
  tolerance?: number;
}

export interface PartMeta {
  id: string;
  name: string;
  slot: PartSlot;
  zIndex: number;
  frameSize: number;
  columns: number;
  rows: number;
  directions: Direction[];
  frames: AnimFrame[];
  sheet: string;
  recolor?: RecolorSpec;
  /** Body parts only: which proportions (or animal species) this body uses. */
  bodyType?: Build;
  /** Row groups in the sheet (each group = `directions.length` rows). Missing = one group fits all humans. */
  bodyTypes?: Build[];
  /** Camera the art is drawn for. Missing = "topdown". */
  view?: ViewMode;
}

/** "topdown" = RPG Maker / Stardew ¾ view, "side" = side-scroller / platformer. */
export type ViewMode = "topdown" | "side";
export const VIEW_MODES: Array<{ id: ViewMode; label: string; artStyle: string }> = [
  { id: "topdown", label: "Top-down", artStyle: "rpgmaker-stardew-topdown-chibi" },
  { id: "side", label: "Side-view", artStyle: "side-scroller-chibi" },
];

export const viewOf = (item: { view?: ViewMode } | null | undefined): ViewMode => item?.view ?? "topdown";

/** Side-view parts reuse the top-down id with this prefix, so outfits can switch camera. */
export const SIDE_PREFIX = "side_";

export function idForView(id: string, view: ViewMode): string {
  const base = id.startsWith(SIDE_PREFIX) ? id.slice(SIDE_PREFIX.length) : id;
  return view === "side" ? `${SIDE_PREFIX}${base}` : base;
}

export interface EasySpriteConfig {
  name: string;
  /** Human label for the locked art direction */
  artStyle: string;
  frameSize: number;
  columns: number;
  rows: number;
  directions: Direction[];
  /** Rows for side-view projects. */
  sideDirections?: Direction[];
  frames: AnimFrame[];
  slots: Array<{
    id: PartSlot;
    label: string;
    zIndex: number;
    required?: boolean;
    recolorDefault?: string;
  }>;
}

export interface CharacterProject {
  id: string;
  name: string;
  updatedAt: string;
  selections: Partial<Record<PartSlot, string | null>>;
  /** Per-slot tint hex colors */
  colors?: Partial<Record<PartSlot, string>>;
  /** Camera mode; selections must use parts of the same view. Missing = "topdown". */
  view?: ViewMode;
}

/** Same outfit, other camera: every selected id swaps to its counterpart for `view`. */
export function projectForView<T extends Pick<CharacterProject, "selections" | "view">>(project: T, view: ViewMode): T {
  const selections: CharacterProject["selections"] = {};
  for (const [slot, id] of Object.entries(project.selections) as Array<[PartSlot, string | null]>) {
    selections[slot] = id ? idForView(id, view) : id;
  }
  return { ...project, selections, view };
}

export interface WorkspaceSummary {
  root: string;
  config: EasySpriteConfig;
  parts: PartMeta[];
  projects: CharacterProject[];
  /** Absolute default folder for character JSON saves. */
  projectsDir: string;
  /** Absolute default folder for sprite exports. */
  exportsDir: string;
}

export const DEFAULT_DIRECTIONS: Direction[] = ["front", "right", "back", "left"];
/** Side-scrollers walk left/right; `front` is kept for talking to the camera. */
export const SIDE_DIRECTIONS: Direction[] = ["right", "left", "front"];
export const DEFAULT_FRAMES: AnimFrame[] = [...FRAME_IDS];

export function directionsForView(
  view: ViewMode,
  config?: Pick<EasySpriteConfig, "directions" | "sideDirections">,
): Direction[] {
  if (view === "side") return config?.sideDirections?.length ? config.sideDirections : SIDE_DIRECTIONS;
  return config?.directions?.length ? config.directions : DEFAULT_DIRECTIONS;
}

export const ANIM_PRESETS: Array<{
  id: AnimPresetId;
  label: string;
  /** What the same frames mean on an animal body. */
  animalLabel?: string;
  frames: AnimFrame[];
  ms: number;
  loop: boolean;
}> = [
  { id: "idle", label: "Idle", frames: ["idle"], ms: 400, loop: true },
  { id: "walk", label: "Walk", frames: ["walk0", "walk1", "walk2", "walk1"], ms: 160, loop: true },
  { id: "run", label: "Run", frames: ["run0", "run1", "run2", "run3"], ms: 100, loop: true },
  { id: "jump", label: "Jump", frames: ["jump0", "jump1", "jump1", "jump0", "idle"], ms: 130, loop: false },
  { id: "wave", label: "Wave", animalLabel: "Wag / Call", frames: ["wave0", "wave1"], ms: 260, loop: true },
  { id: "carry", label: "Carry", animalLabel: "Eat", frames: ["carry0", "carry1"], ms: 220, loop: true },
  { id: "farm", label: "Farm", animalLabel: "Dig / Scratch", frames: ["farm0", "farm0", "farm1", "farm1"], ms: 160, loop: true },
  { id: "cheer", label: "Cheer", animalLabel: "Happy hop", frames: ["cheer1", "cheer0", "cheer0", "cheer1"], ms: 150, loop: true },
  { id: "attack", label: "Attack", animalLabel: "Bite / Charge", frames: ["attack0", "attack0", "attack1", "attack1", "idle"], ms: 110, loop: false },
  { id: "hurt", label: "Hurt", frames: ["hurt0", "hurt1", "hurt0", "idle"], ms: 130, loop: false },
  { id: "fall", label: "Fall / KO", frames: ["hurt0", "fall0", "fall1", "fall1", "fall1", "fall1"], ms: 180, loop: false },
  { id: "sleep", label: "Sleep", frames: ["sleep0", "sleep1"], ms: 700, loop: true },
  { id: "tired", label: "Tired", frames: ["tired0", "tired1"], ms: 380, loop: true },
  { id: "sit", label: "Sit", frames: ["sit"], ms: 400, loop: true },
  { id: "pickup", label: "Pick up", animalLabel: "Sniff", frames: ["idle", "crouch", "crouch", "idle"], ms: 200, loop: false },
];

export const DEFAULT_CONFIG: EasySpriteConfig = {
  name: "Easy Sprite Workspace",
  artStyle: "rpgmaker-stardew-topdown-chibi",
  frameSize: 48,
  columns: FRAME_IDS.length,
  rows: 4,
  directions: DEFAULT_DIRECTIONS,
  sideDirections: SIDE_DIRECTIONS,
  frames: DEFAULT_FRAMES,
  slots: [
    { id: "hair_back", label: "Hair (back)", zIndex: 5, recolorDefault: "#6e482a" },
    { id: "body", label: "Body", zIndex: 10, required: true, recolorDefault: "#e8c4a0" },
    { id: "pants", label: "Pants", zIndex: 30, recolorDefault: "#483428" },
    { id: "shoes", label: "Shoes", zIndex: 35, recolorDefault: "#221c18" },
    { id: "shirt", label: "Shirt", zIndex: 40, recolorDefault: "#243a6e" },
    { id: "face", label: "Face", zIndex: 50 },
    { id: "hair_front", label: "Hair (front)", zIndex: 60, recolorDefault: "#6e482a" },
    { id: "accessory", label: "Accessory", zIndex: 70 },
  ],
};

export const EXPORT_PRESETS: Array<{
  id: ExportPresetId;
  label: string;
  description: string;
}> = [
  {
    id: "native",
    label: "Native sheet",
    description: "Direction rows (4 top-down / 3 side-view) × 30 frames (walk/run/jump/fight/hurt/KO/sleep/…)",
  },
  {
    id: "rpgmaker_mv",
    label: "RPG Maker MV/MZ",
    description: "3 × 4 walk sheet (down/left/right/up) — top-down only",
  },
  {
    id: "godot",
    label: "Godot atlas",
    description: "Native sheet + Godot-friendly atlas JSON",
  },
  {
    id: "frames",
    label: "Frame folder",
    description: "One PNG per direction/frame + atlas",
  },
];
