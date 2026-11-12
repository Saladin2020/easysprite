// Run with: npm run smoke:compose  (needs tsx because it imports TypeScript sources)
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { composeAndSave, exportProject, clearSheetCache } from "../src/lib/compose.ts";
import { initWorkspace } from "../src/lib/workspace.ts";

clearSheetCache();
// Throwaway workspace so the smoke test never touches your real projects/exports.
const root = await mkdtemp(path.join(os.tmpdir(), "easysprite-smoke-"));
try {
  await initWorkspace(root);

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

  // Demo project seeded by init.
  const h = await exportProject(root, {
    projectId: "village_farmer",
    preset: "rpgmaker_mv",
    dir: "exports/mcp_smoke",
  });
  console.log("farmer", h.paths[0]);
} finally {
  await rm(root, { recursive: true, force: true });
}
