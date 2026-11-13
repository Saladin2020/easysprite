import { useCallback, useEffect, useMemo, useState } from "react";
import {
  browseFolder,
  buildShowcase,
  deleteProjectsApi,
  listProjectsFromDir,
  openLocalPath,
} from "../api";
import type { CharacterProject } from "../types";

const LS_SHOWCASE_DIR = "easysprite.showcaseDir";
const LS_SHOWCASE_SOURCE = "easysprite.showcaseSourceDir";
function readStored(key: string): string {
  try {
    return localStorage.getItem(key)?.trim() ?? "";
  } catch {
    return "";
  }
}

function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

type FilterTab = "all" | "saved" | "mcp";

interface ShowcasePanelProps {
  defaultOutDir: string;
  defaultSourceDir: string;
  draft: CharacterProject | null;
  /** Bump after Save so this panel reloads the source folder. */
  refreshToken?: number;
  onProjectsChanged?: () => void;
}

export function ShowcasePanel({
  defaultOutDir,
  defaultSourceDir,
  draft,
  refreshToken = 0,
  onProjectsChanged,
}: ShowcasePanelProps) {
  const [open, setOpen] = useState(true);
  const [outDir, setOutDir] = useState(() => readStored(LS_SHOWCASE_DIR));
  const [sourceDir, setSourceDir] = useState(
    () => readStored(LS_SHOWCASE_SOURCE) || defaultSourceDir,
  );
  const [projects, setProjects] = useState<CharacterProject[]>([]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [includeDraft, setIncludeDraft] = useState(true);
  const [tab, setTab] = useState<FilterTab>("all");
  const [title, setTitle] = useState("Easy Sprite Showcase");
  const [columns, setColumns] = useState(5);
  const [busy, setBusy] = useState(false);
  const [browsing, setBrowsing] = useState<"out" | "source" | null>(null);
  const [status, setStatus] = useState("");
  const [statusKind, setStatusKind] = useState<"ok" | "err" | "">("");
  const [lastHtml, setLastHtml] = useState<string | null>(null);
  const [lastDir, setLastDir] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");

  const resolvedOut = outDir.trim() || defaultOutDir;
  const resolvedSource = sourceDir.trim() || defaultSourceDir;

  useEffect(() => {
    if (!outDir && defaultOutDir) setOutDir(defaultOutDir);
  }, [defaultOutDir, outDir]);

  useEffect(() => {
    if (!readStored(LS_SHOWCASE_SOURCE) && defaultSourceDir) {
      setSourceDir(defaultSourceDir);
    }
  }, [defaultSourceDir]);

  const reloadProjects = useCallback(async () => {
    try {
      const data = await listProjectsFromDir(resolvedSource);
      setProjects(data.projects);
      setLoadError("");
      setSourceDir(data.dir);
    } catch (err) {
      setProjects([]);
      setLoadError(err instanceof Error ? err.message : "โหลดโปรเจกต์ไม่สำเร็จ");
    }
  }, [resolvedSource]);

  useEffect(() => {
    void reloadProjects();
  }, [reloadProjects, refreshToken]);

  const mcpIds = useMemo(
    () => projects.filter((p) => p.id.startsWith("mcp_test_")).map((p) => p.id),
    [projects],
  );

  const visible = useMemo(() => {
    const list = [...projects].sort((a, b) => a.name.localeCompare(b.name, "th"));
    if (tab === "mcp") return list.filter((p) => p.id.startsWith("mcp_test_"));
    if (tab === "saved") return list.filter((p) => !p.id.startsWith("mcp_test_"));
    return list;
  }, [projects, tab]);

  const draftSelected = includeDraft && Boolean(draft?.id);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectVisible = () => setSelected(new Set(visible.map((p) => p.id)));
  const selectMcp = () => setSelected(new Set(mcpIds));
  const clear = () => setSelected(new Set());

  const onBrowse = async (kind: "out" | "source") => {
    if (browsing) return;
    setBrowsing(kind);
    try {
      const chosen = await browseFolder({
        startDir: kind === "out" ? resolvedOut : resolvedSource,
        title: kind === "out" ? "Choose showcase output folder" : "Choose projects source folder",
      });
      if (!chosen) return;
      if (kind === "out") {
        setOutDir(chosen);
        writeStored(LS_SHOWCASE_DIR, chosen);
      } else {
        setSourceDir(chosen);
        writeStored(LS_SHOWCASE_SOURCE, chosen);
      }
    } catch (err) {
      setStatusKind("err");
      setStatus(err instanceof Error ? err.message : "Browse failed");
    } finally {
      setBrowsing(null);
    }
  };

  const onDeleteMcp = async () => {
    if (!mcpIds.length) {
      setStatusKind("err");
      setStatus("ไม่มี mcp_test_* ในโฟลเดอร์นี้");
      return;
    }
    if (!window.confirm(`ลบโปรเจกต์ทดสอบ ${mcpIds.length} ไฟล์จาก\n${resolvedSource} ?`)) {
      return;
    }
    setBusy(true);
    try {
      const result = await deleteProjectsApi({ prefix: "mcp_test_", dir: resolvedSource });
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of result.deleted) next.delete(id);
        return next;
      });
      await reloadProjects();
      onProjectsChanged?.();
      setStatusKind("ok");
      setStatus(`ลบแล้ว ${result.deleted.length} · หายไป ${result.missing.length}`);
    } catch (err) {
      setStatusKind("err");
      setStatus(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const onBuild = async () => {
    if (busy) return;
    const ids = [...selected];
    if (ids.length === 0 && !draftSelected) {
      setStatusKind("err");
      setStatus("เลือกอย่างน้อย 1 ตัว หรือติ๊ก “รวมตัวที่กำลังแต่ง”");
      return;
    }
    setBusy(true);
    setStatusKind("");
    setStatus("กำลังสร้าง showcase…");
    try {
      writeStored(LS_SHOWCASE_DIR, resolvedOut);
      writeStored(LS_SHOWCASE_SOURCE, resolvedSource);
      const projectIds = [...ids];
      if (draftSelected && draft && !projectIds.includes(draft.id)) {
        projectIds.push(draft.id);
      }
      const result = await buildShowcase({
        projectIds,
        projectsDir: resolvedSource,
        dir: resolvedOut,
        title: title.trim() || undefined,
        columns,
        draft: draft ?? undefined,
        includeDraft: draftSelected,
      });
      setLastHtml(result.htmlPath);
      setLastDir(result.dir);
      setStatusKind("ok");
      setStatus(
        `ได้ ${result.count} ตัว → ${result.dir}` +
          (result.skipped.length ? ` · ข้าม ${result.skipped.length}` : ""),
      );
    } catch (err) {
      setStatusKind("err");
      setStatus(err instanceof Error ? err.message : "Showcase failed");
    } finally {
      setBusy(false);
    }
  };

  const onOpen = async (target: string | null) => {
    if (!target) return;
    try {
      await openLocalPath(target);
    } catch (err) {
      setStatusKind("err");
      setStatus(err instanceof Error ? err.message : "Open failed");
    }
  };

  const selectedCount = selected.size + (draftSelected && draft && !selected.has(draft.id) ? 1 : 0);

  return (
    <section className={`panel showcase-panel${open ? "" : " collapsed"}`}>
      <div className="mcp-head">
        <div>
          <h2>
            <span className="step">★</span>Showcase
          </h2>
          <p className="mcp-sub">
            อ่านจากโฟลเดอร์ Save · สร้าง gallery ขยับได้ / หันได้ · เลือกที่เขียนไฟล์เองได้
          </p>
        </div>
        <div className="mcp-head-actions">
          <span className="mcp-pill stdio">{selectedCount} selected</span>
          <button type="button" onClick={() => void reloadProjects()} disabled={busy}>
            Refresh
          </button>
          <button type="button" onClick={() => setOpen((v) => !v)}>
            {open ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {open && (
        <>
          <p className="hint showcase-warn">
            ใช้ไฟล์ที่ Save แล้วในโฟลเดอร์ต้นทาง — ถ้าแก้ในพรีวิวแล้วยังไม่ Save จะไม่ขึ้น
            (ยกเว้นติ๊ก “รวมตัวที่กำลังแต่ง”)
          </p>

          <div className="showcase-controls">
            <label className="inline-field path-field" htmlFor="showcase-source">
              Source (projects)
              <div className="path-row">
                <input
                  id="showcase-source"
                  type="text"
                  spellCheck={false}
                  value={sourceDir}
                  placeholder={defaultSourceDir}
                  onChange={(e) => setSourceDir(e.target.value)}
                  onBlur={() => {
                    writeStored(LS_SHOWCASE_SOURCE, sourceDir.trim() || defaultSourceDir);
                    void reloadProjects();
                  }}
                />
                <button
                  type="button"
                  disabled={browsing !== null}
                  onClick={() => void onBrowse("source")}
                >
                  {browsing === "source" ? "…" : "Browse"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSourceDir(defaultSourceDir);
                    writeStored(LS_SHOWCASE_SOURCE, defaultSourceDir);
                    // reload via effect when sourceDir changes (next tick)
                    window.setTimeout(() => void reloadProjects(), 0);
                  }}
                >
                  Use save folder
                </button>
              </div>
            </label>

            <label className="inline-field path-field" htmlFor="showcase-dir">
              Output (showcase)
              <div className="path-row">
                <input
                  id="showcase-dir"
                  type="text"
                  spellCheck={false}
                  value={outDir}
                  placeholder={defaultOutDir}
                  onChange={(e) => setOutDir(e.target.value)}
                />
                <button
                  type="button"
                  disabled={browsing !== null}
                  onClick={() => void onBrowse("out")}
                >
                  {browsing === "out" ? "…" : "Browse"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOutDir(defaultOutDir);
                    writeStored(LS_SHOWCASE_DIR, defaultOutDir);
                  }}
                >
                  Default
                </button>
              </div>
            </label>

            <div className="showcase-meta-row">
              <label className="inline-field" htmlFor="showcase-title">
                Title
                <input
                  id="showcase-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label className="inline-field" htmlFor="showcase-cols">
                Columns
                <select
                  id="showcase-cols"
                  value={columns}
                  onChange={(e) => setColumns(Number(e.target.value))}
                >
                  {[2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="primary" disabled={busy} onClick={() => void onBuild()}>
                {busy ? "Building…" : "Build showcase"}
              </button>
            </div>

            <label className="showcase-draft">
              <input
                type="checkbox"
                checked={includeDraft}
                onChange={(e) => setIncludeDraft(e.target.checked)}
              />
              รวมตัวที่กำลังแต่ง
              {draft ? (
                <span>
                  ({draft.name} · <code>{draft.id}</code>)
                </span>
              ) : (
                <span>(ยังไม่มี)</span>
              )}
            </label>

            <div className="showcase-pick-actions">
              <button
                type="button"
                className={tab === "all" ? "active" : ""}
                onClick={() => setTab("all")}
              >
                All
              </button>
              <button
                type="button"
                className={tab === "saved" ? "active" : ""}
                onClick={() => setTab("saved")}
              >
                Saved
              </button>
              <button
                type="button"
                className={tab === "mcp" ? "active" : ""}
                onClick={() => setTab("mcp")}
              >
                MCP tests ({mcpIds.length})
              </button>
              <button type="button" onClick={selectVisible}>
                Select tab
              </button>
              <button type="button" onClick={selectMcp}>
                Select MCP
              </button>
              <button type="button" onClick={clear}>
                None
              </button>
              <button type="button" disabled={busy || !mcpIds.length} onClick={() => void onDeleteMcp()}>
                Delete MCP tests
              </button>
            </div>

            <div className="showcase-list">
              {visible.map((p) => (
                <label key={p.id} className={`showcase-item${selected.has(p.id) ? " on" : ""}`}>
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                  />
                  <span className="showcase-item-name">
                    {p.name}
                    {p.id.startsWith("mcp_test_") ? (
                      <em className="tag-mcp"> MCP</em>
                    ) : null}
                    {p.view === "side" ? <em className="tag-side"> side</em> : null}
                  </span>
                  <code>{p.id}</code>
                </label>
              ))}
              {visible.length === 0 && (
                <p className="status">{loadError || "ไม่มีโปรเจกต์ในโฟลเดอร์นี้"}</p>
              )}
            </div>
          </div>

          <p className={`status ${statusKind}`}>{status}</p>
          {lastHtml && statusKind === "ok" && (
            <div className="showcase-open-row">
              <button type="button" className="primary" onClick={() => void onOpen(lastHtml)}>
                Open HTML
              </button>
              <button type="button" onClick={() => void onOpen(lastDir)}>
                Open folder
              </button>
              <code className="hint">{lastHtml}</code>
            </div>
          )}
        </>
      )}
    </section>
  );
}
