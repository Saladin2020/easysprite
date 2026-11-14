import { PET_SPECIES, SPECIES, projectForView, type CharacterProject, type PartSlot } from "../shared/types.js";
import { ANIMAL_NAMES, COLLAR_SPECIES, animalBaseColor } from "./sprite/animals.js";

type Look = Partial<Record<PartSlot, [id: string, color?: string]>>;

function demo(id: string, name: string, look: Look): CharacterProject {
  const selections: CharacterProject["selections"] = {};
  const colors: CharacterProject["colors"] = {};
  for (const [slot, value] of Object.entries(look) as Array<[PartSlot, [string, string?]]>) {
    selections[slot] = value[0];
    if (value[1]) colors[slot] = value[1];
  }
  if (selections.hair_front && !selections.hair_back) {
    selections.hair_back = selections.hair_front.replace(/_front$/, "_back");
    if (colors.hair_front) colors.hair_back = colors.hair_front;
  }
  return { id, name, updatedAt: new Date().toISOString(), selections, colors };
}

const SIDE_DEMOS = [
  "village_farmer",
  "market_seller",
  "school_girl",
  "teen_runner",
  "young_knight",
  "grandma",
  "little_boy",
  "temple_monk",
  "pet_dog",
  "pet_chicken",
];

export function demoProjects(): CharacterProject[] {
  const topdown = topdownDemos();
  const side = topdown
    .filter((p) => SIDE_DEMOS.includes(p.id))
    .map((p) => ({ ...projectForView(p, "side"), id: `side_${p.id}`, name: `${p.name} · Side` }));
  return [...topdown, ...side];
}

/** Starter cast: every age group, body type, skin tone and a mix of genders. */
function topdownDemos(): CharacterProject[] {
  return [
    demo("school_boy", "School Boy", {
      body: ["body_light", "#e8c4a0"],
      face: ["face_neutral"],
      hair_front: ["hair_messy_front", "#6e482a"],
      shirt: ["shirt_blazer", "#243a6e"],
      pants: ["pants_brown", "#483428"],
      shoes: ["shoes_dark", "#221c18"],
      accessory: ["acc_backpack", "#2f6b4f"],
    }),
    demo("school_girl", "School Girl", {
      body: ["body_light", "#f0d0b0"],
      face: ["face_lashes"],
      hair_front: ["hair_ponytail_front", "#3a2418"],
      shirt: ["shirt_blazer", "#243a6e"],
      pants: ["pants_skirt", "#2f3d6e"],
      shoes: ["shoes_dark", "#221c18"],
      accessory: ["acc_backpack", "#c0587e"],
    }),
    demo("village_farmer", "Village Farmer (Lung)", {
      body: ["body_tan", "#c9956c"],
      face: ["face_smile"],
      hair_front: ["hair_crop_front", "#2a221c"],
      shirt: ["shirt_mohom", "#2b3a67"],
      pants: ["pants_fisherman", "#3b3a5e"],
      shoes: ["shoes_sandals", "#8a6a44"],
      accessory: ["acc_hoe", "#7a7f88"],
    }),
    demo("farmer_woman", "Rice Farmer (Pa)", {
      body: ["body_tan", "#b88560"],
      face: ["face_lashes"],
      hair_front: ["hair_bun_front", "#2a221c"],
      shirt: ["shirt_tshirt", "#c8a070"],
      pants: ["pants_sarong", "#5b3a7a"],
      shoes: ["shoes_sandals", "#8a6a44"],
      accessory: ["acc_ngob", "#d4b06a"],
    }),
    demo("market_seller", "Market Seller", {
      body: ["body_light", "#e8c4a0"],
      face: ["face_smile"],
      hair_front: ["hair_bun_front", "#6e482a"],
      shirt: ["shirt_apron", "#6b3f2a"],
      pants: ["pants_skirt", "#7a2f4a"],
      shoes: ["shoes_sandals", "#8a6a44"],
      accessory: ["acc_basket", "#c48a3a"],
    }),
    demo("pier_fisher", "Pier Fisher", {
      body: ["body_deep", "#8a5a3c"],
      face: ["face_blink"],
      hair_front: ["hair_bob_front", "#2a221c"],
      shirt: ["shirt_tank", "#c45c26"],
      pants: ["pants_jeans", "#2f4a6e"],
      shoes: ["shoes_sandals", "#8a6a44"],
      accessory: ["acc_fishing", "#6b7280"],
    }),
    demo("teacher", "Teacher", {
      body: ["body_light", "#e8c4a0"],
      face: ["face_glasses"],
      hair_front: ["hair_long_front", "#4a2e20"],
      shirt: ["shirt_cardigan", "#6e8a9e"],
      pants: ["pants_skirt", "#483428"],
      shoes: ["shoes_dark", "#3a2a22"],
    }),
    demo("teen_runner", "Teen Runner", {
      body: ["body_deep", "#7a4e34"],
      face: ["face_smile"],
      hair_front: ["hair_curly_front", "#2a1a12"],
      shirt: ["shirt_tshirt", "#c84040"],
      pants: ["pants_shorts", "#2a2a3a"],
      shoes: ["shoes_sneakers", "#3d6ad8"],
    }),
    demo("young_knight", "Young Knight", {
      body: ["body_light", "#e8c4a0"],
      face: ["face_neutral"],
      hair_front: ["hair_spiky_front", "#c8a45a"],
      shirt: ["shirt_armor", "#9aa3ad"],
      pants: ["pants_brown", "#3a2e28"],
      shoes: ["shoes_boots", "#5a3a22"],
      accessory: ["acc_sword", "#c0c8d0"],
    }),
    demo("hoodie_kid", "Hoodie Kid", {
      body: ["body_child_light", "#e8c4a0"],
      face: ["face_neutral"],
      hair_front: ["hair_messy_front", "#c8a45a"],
      shirt: ["shirt_hoodie", "#4a5568"],
      pants: ["pants_jeans", "#2f4a6e"],
      shoes: ["shoes_sneakers", "#c84040"],
      accessory: ["acc_cap", "#d24a4a"],
    }),
    demo("little_girl", "Little Girl", {
      body: ["body_child_tan", "#c9956c"],
      face: ["face_lashes"],
      hair_front: ["hair_twintails_front", "#2a221c"],
      shirt: ["shirt_dress", "#d77a9a"],
      shoes: ["shoes_sandals", "#c46a8a"],
      accessory: ["acc_flower", "#f2d04a"],
    }),
    demo("little_boy", "Little Boy", {
      body: ["body_child_deep", "#8a5a3c"],
      face: ["face_smile"],
      hair_front: ["hair_crop_front", "#2a221c"],
      shirt: ["shirt_tank", "#4f86c6"],
      pants: ["pants_shorts", "#c48a3a"],
      shoes: ["shoes_sneakers", "#3f7d4e"],
    }),
    demo("grandma", "Grandma (Yai)", {
      body: ["body_elder_light", "#e0bc98"],
      face: ["face_elder"],
      hair_front: ["hair_bun_front", "#d6d2ca"],
      shirt: ["shirt_cardigan", "#8a6f9e"],
      pants: ["pants_sarong", "#6b3f2a"],
      shoes: ["shoes_sandals", "#8a6a44"],
      accessory: ["acc_cane", "#7a5230"],
    }),
    demo("grandpa", "Grandpa (Ta)", {
      body: ["body_elder_tan", "#c9956c"],
      face: ["face_mustache"],
      hair_front: ["hair_balding_front", "#c8c4bc"],
      shirt: ["shirt_mohom", "#3a4a3a"],
      pants: ["pants_fisherman", "#2a2a2a"],
      shoes: ["shoes_sandals", "#8a6a44"],
      accessory: ["acc_cane", "#5a3a22"],
    }),
    demo("temple_monk", "Temple Monk (Luang Phi)", {
      body: ["body_tan", "#c9956c"],
      face: ["face_neutral"],
      hair_front: ["hair_shaved_front", "#4a5a6a"],
      shirt: ["shirt_monk_robe", "#e0841f"],
      shoes: ["shoes_sandals", "#8a6a44"],
      accessory: ["acc_alms_bowl", "#2a221c"],
    }),
    demo("village_guard", "Village Guard", {
      body: ["body_stocky_tan", "#c9956c"],
      face: ["face_beard"],
      hair_front: ["hair_crop_front", "#3a2418"],
      shirt: ["shirt_armor", "#8a939d"],
      pants: ["pants_brown", "#483428"],
      shoes: ["shoes_boots", "#3a2a1a"],
      accessory: ["acc_sword", "#c0c8d0"],
    }),
    demo("noodle_auntie", "Noodle Shop Auntie", {
      body: ["body_stocky_light", "#e8c4a0"],
      face: ["face_smile"],
      hair_front: ["hair_curly_front", "#4a2e20"],
      shirt: ["shirt_apron", "#2f6b4f"],
      pants: ["pants_sarong", "#7a2f4a"],
      shoes: ["shoes_sandals", "#8a6a44"],
      accessory: ["acc_flower", "#e86a9a"],
    }),
    ...SPECIES.map((sp) => {
      const pet = (PET_SPECIES as readonly string[]).includes(sp);
      const look: Look = { body: [`animal_${sp}`, animalBaseColor(sp)] };
      if (COLLAR_SPECIES.includes(sp)) look.accessory = ["acc_pet_collar", sp === "buffalo" ? "#8a5a30" : "#c83c3c"];
      return demo(`${pet ? "pet" : "wild"}_${sp}`, `${pet ? "Pet" : "Wild"}: ${ANIMAL_NAMES[sp]}`, look);
    }),
  ];
}
