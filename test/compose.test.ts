import { readFile } from "node:fs/promises";
import { PNG } from "pngjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { clearSheetCache, composeAndSave, exportProject } from "../src/lib/compose.js";
import { loadConfig } from "../src/lib/workspace.js";
import { tempWorkspace } from "./helpers.js";

let root: string;
let cleanup: () => Promise<void>;
beforeAll(async () => {
  clearSheetCache();
  ({ root, cleanup } = await tempWorkspace());
});
afterAll(() => cleanup());

describe("compose + export", () => {
  it("drops unknown parts and human clothes on animal bodies with warnings", async () => {
    const res = await composeAndSave(root, {
      id: "dog",
      name: "Dog",
      selections: { body: "animal_dog", shirt: "no_such_part", accessory: "acc_pet_collar" },
    });
    expect(res.project.selections.body).toBe("animal_dog");
    expect(res.project.selections.shirt ?? null).toBeNull();
    expect(res.project.selections.accessory).toBe("acc_pet_collar");
    expect(res.warnings.join("\n")).toMatch(/no_such_part/);
  });

  it("exports a native sheet sized frames × directions", async () => {
    await composeAndSave(root, { id: "dog", name: "Dog", selections: { body: "animal_dog" } });
    const out = await exportProject(root, { projectId: "dog", preset: "native" });
    const png = PNG.sync.read(await readFile(out.paths.find((p) => p.endsWith(".png"))!));
    const cfg = await loadConfig(root);
    expect(png.width).toBe(cfg.columns * cfg.frameSize);
    expect(png.height).toBe(cfg.directions.length * cfg.frameSize);
  });

  it("exports a seeded demo project for every preset", async () => {
    for (const preset of ["native", "rpgmaker_mv", "godot", "frames"] as const) {
      const out = await exportProject(root, { projectId: "village_farmer", preset, dir: `exports/${preset}` });
      expect(out.paths.length).toBeGreaterThan(0);
    }
  });

  it("rejects path-like project ids and folders outside the workspace", async () => {
    await expect(exportProject(root, { projectId: "../../etc/passwd" })).rejects.toThrow(/Invalid project id/);
    await composeAndSave(root, { id: "dog", name: "Dog", selections: { body: "animal_dog" } });
    await expect(exportProject(root, { projectId: "dog", dir: "/tmp/elsewhere" })).rejects.toThrow(/Folder not allowed/);
  });
});
