import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  BODY_TYPES,
  DEFAULT_CONFIG,
  DEFAULT_FRAMES,
  SPECIES,
  directionsForView,
  idForView,
  type AnimFrame,
  type BodyType,
  type Build,
  type Direction,
  type PartMeta,
  type PartSlot,
  type ViewMode,
} from "../shared/types.js";
import { encodePng } from "./png.js";
import { ANIMAL_NAMES, COLLAR_SPECIES, animalBaseColor, animalCell, collarCell } from "./sprite/animals.js";
import { SKIN, bodyPost, drawBody, drawFace, facePost, type FaceStyle } from "./sprite/body.js";
import { Cell, rgba } from "./sprite/cell.js";
import {
  drawPants,
  drawShirt,
  drawShoes,
  type PantsKind,
  type ShirtKind,
  type ShoeKind,
} from "./sprite/clothes.js";
import { drawHairBack, drawHairFront, type HairStyle } from "./sprite/hair.js";
import { drawAccessory, type AccKind } from "./sprite/props.js";
import { rigFor, type Draw, type Post } from "./sprite/rig.js";

interface SampleDef {
  id: string;
  name: string;
  slot: PartSlot;
  zIndex: number;
  draw?: Draw;
  post?: Post;
  /** Draws a whole cell without the human rig (animals). */
  cell?: (direction: Direction, frame: AnimFrame, group: Build) => Cell;
  /** Body parts are drawn for a single body type; everything else for `groups` (default: all humans). */
  bodyType?: Build;
  groups?: Build[];
  recolor?: PartMeta["recolor"];
}

const Z: Record<PartSlot, number> = {
  hair_back: 5,
  body: 10,
  pants: 30,
  shoes: 35,
  shirt: 40,
  face: 50,
  hair_front: 60,
  accessory: 70,
};

const def = (
  id: string,
  name: string,
  slot: PartSlot,
  draw: Draw,
  base?: string,
  tolerance = 70,
  extra: Partial<SampleDef> = {},
): SampleDef => ({
  id,
  name,
  slot,
  zIndex: Z[slot],
  draw,
  ...(base ? { recolor: { enabled: true, base, tolerance } } : {}),
  ...extra,
});

const BODIES: Array<[string, string, BodyType]> = [
  ["body", "Adult", "adult"],
  ["body_child", "Child", "child"],
  ["body_elder", "Elder", "elder"],
  ["body_stocky", "Stocky", "stocky"],
];

const TONES: Array<[keyof typeof SKIN, string, string]> = [
  ["light", "light", "#e8c4a0"],
  ["tan", "tan", "#c9956c"],
  ["deep", "deep", "#8a5a3c"],
];

const FACES: Array<[FaceStyle, string, string]> = [
  ["neutral", "face_neutral", "Face (neutral)"],
  ["smile", "face_smile", "Face (smile)"],
  ["blink", "face_blink", "Face (sleepy)"],
  ["lashes", "face_lashes", "Face (lashes)"],
  ["mustache", "face_mustache", "Face (mustache)"],
  ["beard", "face_beard", "Face (beard)"],
  ["elder", "face_elder", "Face (elder)"],
  ["glasses", "face_glasses", "Face (glasses)"],
];

const HAIR: Array<[HairStyle, string, string]> = [
  ["messy", "Messy", "#6e482a"],
  ["bob", "Bob", "#2a221c"],
  ["long", "Long", "#c8a45a"],
  ["spiky", "Spiky", "#3a7a72"],
  ["bun", "Bun", "#8a5a3c"],
  ["ponytail", "Ponytail", "#4a2e20"],
  ["twintails", "Twin Tails", "#2a221c"],
  ["crop", "Crop", "#2a221c"],
  ["curly", "Curly", "#3a2418"],
  ["balding", "Balding", "#c8c4bc"],
];

const SHIRTS: Array<[ShirtKind, string, string, string, string, number?]> = [
  ["blazer", "shirt_blazer", "School Blazer", "#243a6e", "#b42a2a"],
  ["farmer", "shirt_farmer", "Farmer Tee", "#3f7d4e", "#f0d27a"],
  ["apron", "shirt_apron", "Shop Apron", "#6b3f2a", "#d24a4a", 40],
  ["hoodie", "shirt_hoodie", "Hoodie", "#4a5568", "#cbd5e1"],
  ["tank", "shirt_tank", "Tank Top", "#c45c26", "#c45c26"],
  ["tshirt", "shirt_tshirt", "T-Shirt", "#4f86c6", "#f0d27a"],
  ["dress", "shirt_dress", "Dress", "#d77a9a", "#f6e6a8"],
  ["mohom", "shirt_mohom", "Mor Hom + Sash", "#2b3a67", "#c8463c"],
  ["armor", "shirt_armor", "Guard Armor", "#9aa3ad", "#9aa3ad"],
  ["cardigan", "shirt_cardigan", "Cardigan", "#8a6f9e", "#e2c46a"],
];

const PANTS: Array<[PantsKind, string, string, string]> = [
  ["pants", "pants_brown", "Brown Pants", "#483428"],
  ["shorts", "pants_shorts", "Shorts", "#3d5a80"],
  ["skirt", "pants_skirt", "Skirt", "#7a2f4a"],
  ["jeans", "pants_jeans", "Jeans", "#2f4a6e"],
  ["sarong", "pants_sarong", "Sarong (Pha Sin)", "#5b3a7a"],
  ["fisherman", "pants_fisherman", "Fisherman Pants", "#3b3a5e"],
];

const SHOES: Array<[ShoeKind, string, string, string, number]> = [
  ["dark", "shoes_dark", "Dark Shoes", "#221c18", 40],
  ["boots", "shoes_boots", "Boots", "#5a3a22", 50],
  ["sandals", "shoes_sandals", "Sandals", "#8a6a44", 50],
  ["sneakers", "shoes_sneakers", "Sneakers", "#c84040", 60],
];

const ACCESSORIES: Array<[AccKind, string, string, string, number?]> = [
  ["backpack", "acc_backpack", "Backpack", "#2f6b4f"],
  ["basket", "acc_basket", "Fruit Basket", "#c48a3a"],
  ["cap", "acc_cap", "Cap", "#d24a4a"],
  ["fishing", "acc_fishing", "Fishing Rod", "#6b7280", 60],
  ["hoe", "acc_hoe", "Hoe", "#7a7f88", 60],
  ["sword", "acc_sword", "Sword", "#c0c8d0", 60],
  ["cane", "acc_cane", "Walking Cane", "#7a5230", 60],
  ["ngob", "acc_ngob", "Ngob (Straw Hat)", "#d4b06a", 50],
  ["flower", "acc_flower", "Flower Clip", "#e86a9a"],
];

const SAMPLES: SampleDef[] = [
  ...BODIES.flatMap(([prefix, label, bodyType]) =>
    TONES.map(([tone, toneLabel, hex]) =>
      def(`${prefix}_${tone}`, `${label} (${toneLabel})`, "body", drawBody(SKIN[tone]), hex, 60, {
        bodyType,
        post: bodyPost,
      }),
    ),
  ),
  ...FACES.map(([style, id, name]) => def(id, name, "face", drawFace(style), undefined, 70, { post: facePost })),
  ...HAIR.flatMap(([style, label, hex]) => [
    def(`hair_${style}_back`, `${label} Hair (back)`, "hair_back", drawHairBack(style, rgba(hex)), hex),
    def(`hair_${style}_front`, `${label} Hair (front)`, "hair_front", drawHairFront(style, rgba(hex)), hex),
  ]),
  ...SHIRTS.map(([kind, id, name, main, accent, tol]) =>
    def(id, name, "shirt", drawShirt(kind, rgba(main), rgba(accent)), main, tol ?? 70),
  ),
  ...PANTS.map(([kind, id, name, hex]) => def(id, name, "pants", drawPants(kind, rgba(hex)), hex)),
  ...SHOES.map(([kind, id, name, hex, tol]) => def(id, name, "shoes", drawShoes(kind, rgba(hex)), hex, tol)),
  ...ACCESSORIES.map(([kind, id, name, hex, tol]) =>
    def(id, name, "accessory", drawAccessory(kind, rgba(hex)), hex, tol ?? 70),
  ),
  ...SPECIES.map(
    (sp): SampleDef => ({
      id: `animal_${sp}`,
      name: ANIMAL_NAMES[sp],
      slot: "body",
      zIndex: Z.body,
      bodyType: sp,
      cell: (direction, frame) => animalCell(sp, direction, frame),
      recolor: { enabled: true, base: animalBaseColor(sp), tolerance: 50 },
    }),
  ),
  {
    id: "acc_pet_collar",
    name: "Pet Collar + Bell",
    slot: "accessory",
    zIndex: Z.accessory,
    groups: COLLAR_SPECIES,
    cell: (direction, frame, group) => collarCell(group as (typeof COLLAR_SPECIES)[number], direction, frame, rgba("#c83c3c")),
    recolor: { enabled: true, base: "#c83c3c", tolerance: 50 },
  },
];

/** Animal art is shared between cameras; side view only drops it onto the lower ground line. */
const SIDE_ANIMAL_DROP = 2;

function buildSheet(sample: SampleDef, groups: Build[], view: ViewMode): Buffer {
  const { frameSize } = DEFAULT_CONFIG;
  const dirs = directionsForView(view);
  const width = frameSize * DEFAULT_FRAMES.length;
  const height = frameSize * dirs.length * groups.length;
  const pixels = new Uint8Array(width * height * 4);

  groups.forEach((bodyType, g) => {
    dirs.forEach((direction, d) => {
      DEFAULT_FRAMES.forEach((frame, col) => {
        let cell: Cell;
        if (sample.cell) {
          cell = sample.cell(direction, frame, bodyType);
          if (view === "side") cell = cell.shifted(0, SIDE_ANIMAL_DROP);
        } else {
          const rig = rigFor(direction, frame, bodyType as BodyType, view);
          cell = new Cell();
          sample.draw?.(cell, rig);
          if (rig.lie) cell = cell.rotated(rig.lie, rig.lieDrop);
          const mirrored = direction === "left";
          if (mirrored) cell = cell.mirrored();
          sample.post?.(cell, rig, mirrored);
        }
        cell.blit(pixels, width, col * frameSize, (g * dirs.length + d) * frameSize);
      });
    });
  });

  return encodePng(width, height, pixels);
}

const LEGACY_IDS = ["body/body_basic"];

export async function writeSampleParts(workspaceRoot: string): Promise<PartMeta[]> {
  const { frameSize } = DEFAULT_CONFIG;
  const partsRoot = path.join(workspaceRoot, "parts");
  await mkdir(partsRoot, { recursive: true });
  for (const legacy of LEGACY_IDS) {
    await rm(path.join(partsRoot, legacy), { recursive: true, force: true });
  }

  const created: PartMeta[] = [];
  for (const view of ["topdown", "side"] as const) {
    const directions = directionsForView(view);
    for (const sample of SAMPLES) {
      const groups = sample.bodyType ? [sample.bodyType] : (sample.groups ?? BODY_TYPES);
      const id = idForView(sample.id, view);
      const dir = path.join(partsRoot, sample.slot, id);
      await rm(dir, { recursive: true, force: true });
      await mkdir(dir, { recursive: true });

      const meta: PartMeta = {
        id,
        name: sample.name,
        slot: sample.slot,
        zIndex: sample.zIndex,
        frameSize,
        columns: DEFAULT_FRAMES.length,
        rows: directions.length * groups.length,
        directions: [...directions],
        frames: [...DEFAULT_FRAMES],
        sheet: "sheet.png",
        ...(sample.bodyType ? { bodyType: sample.bodyType } : { bodyTypes: [...groups] }),
        ...(sample.recolor ? { recolor: sample.recolor } : {}),
        ...(view === "side" ? { view } : {}),
      };

      await writeFile(path.join(dir, "sheet.png"), buildSheet(sample, groups, view));
      await writeFile(path.join(dir, "part.json"), `${JSON.stringify(meta, null, 2)}\n`);
      created.push(meta);
    }
  }

  return created;
}
