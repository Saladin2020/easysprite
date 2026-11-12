import { composeAndSave, exportProject, clearSheetCache } from "../src/lib/compose.ts";

clearSheetCache();
const root = process.cwd();

const a = await composeAndSave(root, {
  id: "mcp_smoke_dog",
  name: "MCP Smoke Dog",
  selections: { body: "animal_dog", accessory: "acc_pet_collar" },
  colors: { body: "#c8945a", accessory: "#c83c3c" },
});
console.log("save", a.path, a.warnings);

const e = await exportProject(root, {
  projectId: "mcp_smoke_dog",
  preset: "native",
  dir: "exports/mcp_smoke",
});
console.log("export", e.paths[0], e.warnings);

const h = await exportProject(root, {
  projectId: "village_farmer",
  preset: "rpgmaker_mv",
  dir: "exports/mcp_smoke",
});
console.log("farmer", h.paths[0]);
