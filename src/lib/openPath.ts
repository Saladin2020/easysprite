import { access } from "node:fs/promises";
import path from "node:path";
import open from "open";

/** Open a file or folder in the OS default app / file manager. */
export async function openPath(target: string): Promise<{ ok: true; path: string }> {
  const resolved = path.resolve(target.trim());
  if (!resolved) throw new Error("Path required");
  await access(resolved);
  await open(resolved);
  return { ok: true, path: resolved };
}
