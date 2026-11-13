import { readdir } from "node:fs/promises";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { allowDir, assertSafeId, resolveOutDir, saveProject } from "../src/lib/workspace.js";
import { tempWorkspace } from "./helpers.js";

let root: string;
let cleanup: () => Promise<void>;
beforeAll(async () => ({ root, cleanup } = await tempWorkspace()));
afterEach(() => {
  delete process.env.EASYSPRITE_ALLOWED_DIRS;
});
afterAll(() => cleanup());

describe("assertSafeId", () => {
  it.each(["village_farmer", "kid-2", "a"])("accepts %s", (id) => expect(assertSafeId(id)).toBe(id));
  it.each(["", "Bad", "a.b", "../x", "a/b", "a\\b", " x", 3])("rejects %s", (id) =>
    expect(() => assertSafeId(id)).toThrow(/Invalid project id/),
  );
});

describe("resolveOutDir", () => {
  it("resolves relative folders inside the workspace", () => {
    expect(resolveOutDir(root, "exports/x", "exports")).toBe(path.join(root, "exports", "x"));
    expect(resolveOutDir(root, undefined, "projects")).toBe(path.join(root, "projects"));
  });

  it("rejects folders outside the workspace, including ../ and prefix tricks", () => {
    expect(() => resolveOutDir(root, "../outside", "exports")).toThrow(/Folder not allowed/);
    expect(() => resolveOutDir(root, `${root}-evil`, "exports")).toThrow(/Folder not allowed/);
    expect(() => resolveOutDir(root, "/tmp", "exports")).toThrow(/Folder not allowed/);
  });

  it("allows folders picked by the user and their subfolders", async () => {
    const picked = path.join(path.dirname(root), "picked-folder");
    expect(() => resolveOutDir(root, picked, "exports")).toThrow();
    await allowDir(root, picked);
    expect(resolveOutDir(root, path.join(picked, "sub"), "exports")).toBe(path.join(picked, "sub"));
  });

  it("allows folders from EASYSPRITE_ALLOWED_DIRS", () => {
    // Use a sibling of the temp workspace so this passes on Windows too
    // (path.resolve("/srv/game") is not a portable absolute path there).
    const allowed = path.join(path.dirname(root), "env-allowed");
    process.env.EASYSPRITE_ALLOWED_DIRS = allowed;
    expect(resolveOutDir(root, path.join(allowed, "sprites"), "exports")).toBe(
      path.join(allowed, "sprites"),
    );
  });
});

describe("initWorkspace + saveProject", () => {
  it("seeds demo projects on first run", async () => {
    const files = await readdir(path.join(root, "projects"));
    expect(files).toContain("village_farmer.json");
  });

  it("refuses unsafe project ids", async () => {
    await expect(
      saveProject(root, { id: "../../evil", name: "x", selections: {}, colors: {} } as never),
    ).rejects.toThrow(/Invalid project id/);
  });
});
