import { useEffect, useMemo, useState } from "react";
import { browseFolder, exportBundle, fetchWorkspace, saveProject } from "./api";
import { bodyTypeOf, defaultColorsForConfig, fitsBuild } from "./compositor";
import { renderExport } from "./exportPresets";
import { McpPanel } from "./components/McpPanel";
import { ShowcasePanel } from "./components/ShowcasePanel";
import { PartThumb } from "./components/PartThumb";
import { PreviewStage } from "./components/PreviewStage";
import { Timeline } from "./components/Timeline";
import type {
  AnimFrame,
  AnimPresetId,
  CharacterProject,
  Direction,
  ExportPresetId,
  PartSlot,
  ViewMode,
  WorkspaceSummary,
} from "./types";
import {
  ANIM_PRESETS,
  EXPORT_PRESETS,
  VIEW_MODES,
  directionsForView,
  isSpecies,
  projectForView,
  viewOf,
} from "./types";

const TOPDOWN_ONLY_PRESETS: ExportPresetId[] = ["rpgmaker_mv"];

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 48) || "character"
  );
}

const LS_SAVE_DIR = "easysprite.saveDir";
const LS_EXPORT_DIR = "easysprite.exportDir";

function readStoredDir(key: string): string {
  try {
    return localStorage.getItem(key)?.trim() ?? "";
  } catch {
    return "";
  }
}

function writeStoredDir(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore quota / private mode
  }
}

export function App() {
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null);
  const [project, setProject] = useState<CharacterProject | null>(null);
  const [activeSlot, setActiveSlot] = useState<PartSlot>("body");
  const [direction, setDirection] = useState<Direction>("front");
  const [frame, setFrame] = useState<AnimFrame>("idle");
  const [animPreset, setAnimPreset] = useState<AnimPresetId>("walk");
  const [playing, setPlaying] = useState(true);
  const [exportPreset, setExportPreset] = useState<ExportPresetId>("native");
  const [saveDir, setSaveDir] = useState("");
  const [exportDir, setExportDir] = useState("");
  const [browsing, setBrowsing] = useState<"save" | "export" | null>(null);
  const [partFilter, setPartFilter] = useState("");
  const [status, setStatus] = useState<string>("");
  const [statusKind, setStatusKind] = useState<"ok" | "err" | "">("");
  const [loading, setLoading] = useState(true);
  const [showcaseRefresh, setShowcaseRefresh] = useState(0);

  const activeAnim = useMemo(
    () => ANIM_PRESETS.find((p) => p.id === animPreset) ?? ANIM_PRESETS[0]!,
    [animPreset],
  );
  const playFrames: AnimFrame[] = activeAnim.frames;

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchWorkspace();
        setWorkspace(data);
        setSaveDir(readStoredDir(LS_SAVE_DIR) || data.projectsDir);
        setExportDir(readStoredDir(LS_EXPORT_DIR) || data.exportsDir);
        const defaults = defaultColorsForConfig(data.config.slots);
        const initial = data.projects[0] ?? {
          id: "untitled",
          name: "Untitled",
          updatedAt: new Date().toISOString(),
          selections: { body: data.parts.find((p) => p.slot === "body" && viewOf(p) === "topdown")?.id ?? null },
          colors: defaults,
        };
        setProject({
          ...initial,
          colors: { ...defaults, ...(initial.colors ?? {}) },
        });
        setActiveSlot(data.config.slots.find((s) => s.id === "shirt")?.id ?? "body");
        setStatus(`Workspace: ${data.root}`);
      } catch (err) {
        setStatusKind("err");
        setStatus(err instanceof Error ? err.message : "Failed to load workspace");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const build = workspace && project ? bodyTypeOf(workspace.parts, project) : undefined;
  const view = viewOf(project);
  const viewDirections = useMemo(
    () => directionsForView(view, workspace?.config),
    [view, workspace],
  );
  const viewParts = useMemo(
    () => workspace?.parts.filter((p) => viewOf(p) === view) ?? [],
    [workspace, view],
  );

  useEffect(() => {
    if (!viewDirections.includes(direction)) setDirection(viewDirections[0]!);
    if (view === "side" && TOPDOWN_ONLY_PRESETS.includes(exportPreset)) setExportPreset("native");
  }, [viewDirections, direction, view, exportPreset]);

  const partsInSlot = useMemo(() => {
    const q = partFilter.trim().toLowerCase();
    return viewParts.filter((p) => {
      if (p.slot !== activeSlot || !fitsBuild(p, build)) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
    });
  }, [viewParts, activeSlot, partFilter, build]);

  const switchView = (next: ViewMode) => {
    if (!project || !workspace || next === view) return;
    const known = new Set(workspace.parts.map((p) => p.id));
    const mapped = projectForView(project, next);
    for (const [slot, id] of Object.entries(mapped.selections) as Array<[PartSlot, string | null]>) {
      if (id && !known.has(id)) mapped.selections[slot] = null;
    }
    setProject(mapped);
    setStatusKind("ok");
    setStatus(`Camera → ${VIEW_MODES.find((v) => v.id === next)?.label} (outfit carried over)`);
  };

  const activeSlotMeta = workspace?.config.slots.find((s) => s.id === activeSlot);
  const selectedPart = useMemo(() => {
    if (!workspace || !project) return null;
    const id = project.selections[activeSlot];
    if (!id) return null;
    return workspace.parts.find((p) => p.id === id) ?? null;
  }, [workspace, project, activeSlot]);

  const canRecolor = Boolean(selectedPart?.recolor?.enabled);

  const selectedLabel = (slot: PartSlot) => {
    if (!workspace || !project) return "—";
    const id = project.selections[slot];
    if (!id) return "none";
    const part = workspace.parts.find((p) => p.id === id);
    if (part && !fitsBuild(part, build)) return "not for this body";
    return part?.name ?? id;
  };

  const updateSelection = (slot: PartSlot, partId: string | null) => {
    if (!project) return;
    const base = workspace?.parts.find((p) => p.id === partId)?.recolor?.base;
    setProject({
      ...project,
      selections: { ...project.selections, [slot]: partId },
      // A new body brings its own skin/fur color instead of inheriting the old tint.
      ...(slot === "body" && base ? { colors: { ...(project.colors ?? {}), body: base } } : {}),
    });
  };

  const updateColor = (slot: PartSlot, color: string) => {
    if (!project) return;
    setProject({
      ...project,
      colors: { ...(project.colors ?? {}), [slot]: color },
    });
  };

  const syncHairColor = (color: string) => {
    if (!project) return;
    setProject({
      ...project,
      colors: {
        ...(project.colors ?? {}),
        hair_front: color,
        hair_back: color,
      },
    });
  };

  const onBrowse = async (kind: "save" | "export") => {
    if (!workspace || browsing) return;
    setBrowsing(kind);
    try {
      const startDir =
        kind === "save"
          ? saveDir.trim() || workspace.projectsDir
          : exportDir.trim() || workspace.exportsDir;
      const chosen = await browseFolder({
        startDir,
        title: kind === "save" ? "Choose save folder" : "Choose export folder",
      });
      if (!chosen) return;
      if (kind === "save") {
        setSaveDir(chosen);
        writeStoredDir(LS_SAVE_DIR, chosen);
      } else {
        setExportDir(chosen);
        writeStoredDir(LS_EXPORT_DIR, chosen);
      }
      setStatusKind("ok");
      setStatus(`Selected ${chosen}`);
    } catch (err) {
      setStatusKind("err");
      setStatus(err instanceof Error ? err.message : "Folder picker failed");
    } finally {
      setBrowsing(null);
    }
  };

  const onSave = async () => {
    if (!project || !workspace) return;
    const dir = saveDir.trim() || workspace.projectsDir;
    const payload: CharacterProject = {
      ...project,
      id: slugify(project.id) || "character",
      colors: project.colors ?? {},
      selections: project.selections ?? {},
    };
    try {
      const saved = await saveProject(payload, dir);
      writeStoredDir(LS_SAVE_DIR, dir);
      setSaveDir(dir);
      const { path: outPath, ...character } = saved;
      setProject(character);
      // Refresh the preset list when saving into the workspace projects folder.
      try {
        const next = await fetchWorkspace();
        setWorkspace(next);
      } catch {
        // keep current workspace if refresh fails
      }
      setShowcaseRefresh((n) => n + 1);
      setStatusKind("ok");
      setStatus(`Saved ${outPath}`);
    } catch (err) {
      setStatusKind("err");
      setStatus(err instanceof Error ? err.message : "Save failed");
    }
  };

  const onExport = async () => {
    if (!workspace || !project) return;
    const dir = exportDir.trim() || workspace.exportsDir;
    try {
      const baseName = slugify(project.name);
      const bundle = await renderExport({
        preset: exportPreset,
        parts: workspace.parts,
        project,
        frameSize: workspace.config.frameSize,
        directions: viewDirections,
        frames: workspace.config.frames,
        baseName,
      });
      const result = await exportBundle({
        preset: bundle.preset,
        files: bundle.files,
        dir,
      });
      writeStoredDir(LS_EXPORT_DIR, dir);
      setExportDir(dir);
      setStatusKind("ok");
      setStatus(`Exported ${result.paths?.length ?? 1} file(s) → ${result.path}`);
    } catch (err) {
      setStatusKind("err");
      setStatus(err instanceof Error ? err.message : "Export failed");
    }
  };

  if (loading) {
    return (
      <div className="app">
        <h1 className="brand">
          Easy <span>Sprite</span>
        </h1>
        <p className="sub">Loading workspace…</p>
      </div>
    );
  }

  if (!workspace || !project) {
    return (
      <div className="app">
        <h1 className="brand">
          Easy <span>Sprite</span>
        </h1>
        <p className="status err">{status || "Workspace unavailable"}</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden />
          <div>
            <h1 className="brand">
              Easy <span>Sprite</span>
            </h1>
            <p className="brand-th">ร้านแต่งตัวละครพิกเซล · หมู่บ้านอบอุ่น</p>
            <div className="sub">
              <span className={`tag${view === "side" ? " tag-sky" : ""}`}>
                {VIEW_MODES.find((v) => v.id === view)?.artStyle}
              </span>
              <span className="tag">{workspace.config.frameSize}px</span>
              <span className="tag">{viewParts.length} parts</span>
              <span className="tag tag-leaf">compose only</span>
            </div>
          </div>
        </div>
        <div className="toolbar destinations">
          <label className="inline-field path-field" htmlFor="save-dir">
            Save folder
            <div className="path-row">
              <input
                id="save-dir"
                type="text"
                spellCheck={false}
                value={saveDir}
                placeholder={workspace.projectsDir}
                onChange={(e) => setSaveDir(e.target.value)}
              />
              <button
                type="button"
                title="Browse for a folder"
                disabled={browsing !== null}
                onClick={() => void onBrowse("save")}
              >
                {browsing === "save" ? "…" : "Browse"}
              </button>
              <button
                type="button"
                title="Use workspace projects folder"
                onClick={() => setSaveDir(workspace.projectsDir)}
              >
                Default
              </button>
              <button type="button" onClick={() => void onSave()}>
                Save
              </button>
            </div>
          </label>
          <label className="inline-field path-field" htmlFor="export-dir">
            Export folder
            <div className="path-row">
              <input
                id="export-dir"
                type="text"
                spellCheck={false}
                value={exportDir}
                placeholder={workspace.exportsDir}
                onChange={(e) => setExportDir(e.target.value)}
              />
              <button
                type="button"
                title="Browse for a folder"
                disabled={browsing !== null}
                onClick={() => void onBrowse("export")}
              >
                {browsing === "export" ? "…" : "Browse"}
              </button>
              <button
                type="button"
                title="Use workspace exports folder"
                onClick={() => setExportDir(workspace.exportsDir)}
              >
                Default
              </button>
              <select
                id="export-preset"
                aria-label="Export format"
                value={exportPreset}
                onChange={(e) => setExportPreset(e.target.value as ExportPresetId)}
              >
                {EXPORT_PRESETS.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    disabled={view === "side" && TOPDOWN_ONLY_PRESETS.includes(p.id)}
                  >
                    {p.label}
                  </option>
                ))}
              </select>
              <button type="button" className="primary" onClick={() => void onExport()}>
                Export
              </button>
            </div>
          </label>
        </div>
      </header>

      <div className="layout">
        <aside className="panel">
          <h2>
            <span className="step">1</span>Character
          </h2>
          <div className="view-switch" role="group" aria-label="Camera view">
            {VIEW_MODES.map((v) => (
              <button
                key={v.id}
                type="button"
                className={view === v.id ? "active" : ""}
                aria-pressed={view === v.id}
                onClick={() => switchView(v.id)}
              >
                {v.label}
                <small>{v.id === "side" ? "ฉากด้านข้าง · platformer" : "มุมบน ¾ · RPG / Stardew"}</small>
              </button>
            ))}
          </div>
          <div className="field">
            <label htmlFor="project-pick">Preset character</label>
            <select
              id="project-pick"
              value={project.id}
              onChange={(e) => {
                const next = workspace.projects.find((p) => p.id === e.target.value);
                if (!next) return;
                const defaults = defaultColorsForConfig(workspace.config.slots);
                setProject({
                  ...next,
                  colors: { ...defaults, ...(next.colors ?? {}) },
                });
              }}
            >
              {VIEW_MODES.map((v) => {
                const list = workspace.projects.filter((p) => viewOf(p) === v.id);
                return list.length ? (
                  <optgroup key={v.id} label={v.label}>
                    {list.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null;
              })}
            </select>
          </div>
          <div className="field">
            <label htmlFor="char-name">Character name</label>
            <input
              id="char-name"
              value={project.name}
              onChange={(e) =>
                setProject({
                  ...project,
                  name: e.target.value,
                })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="char-id">Save id</label>
            <input
              id="char-id"
              value={project.id}
              onChange={(e) =>
                setProject({
                  ...project,
                  id: slugify(e.target.value) || project.id,
                })
              }
            />
          </div>
          <div className="slot-list">
            {workspace.config.slots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                className={`slot-btn${activeSlot === slot.id ? " active" : ""}`}
                onClick={() => setActiveSlot(slot.id)}
              >
                <span className="slot-swatch-wrap">
                  {project.colors?.[slot.id] ? (
                    <span
                      className="slot-swatch"
                      style={{ background: project.colors[slot.id] }}
                    />
                  ) : null}
                  {slot.label}
                </span>
                <small>{selectedLabel(slot.id)}</small>
              </button>
            ))}
          </div>
        </aside>

        <section className="panel preview-wrap">
          <h2>
            <span className="step">2</span>Preview
          </h2>
          <PreviewStage
            parts={workspace.parts}
            project={project}
            direction={direction}
            frame={frame}
            frameSize={workspace.config.frameSize}
            playing={playing}
            playFrames={playFrames}
            frameMs={activeAnim.ms}
            loop={activeAnim.loop}
          />
          <Timeline
            directions={viewDirections}
            frames={workspace.config.frames}
            direction={direction}
            frame={frame}
            animPreset={animPreset}
            animal={isSpecies(build)}
            playing={playing}
            onDirection={setDirection}
            onFrame={setFrame}
            onAnimPreset={(id) => {
              setAnimPreset(id);
              setPlaying(true);
            }}
            onTogglePlay={() => setPlaying((p) => !p)}
          />
          <p className="hint">
            {EXPORT_PRESETS.find((p) => p.id === exportPreset)?.description}
          </p>
          <p className={`status ${statusKind}`}>{status}</p>
        </section>

        <aside className="panel">
          <h2>
            <span className="step">3</span>Parts <small>· {activeSlotMeta?.label}</small>
          </h2>

          {canRecolor && (
            <div className="recolor-box">
              <label htmlFor="slot-color">Recolor</label>
              <div className="recolor-row">
                <input
                  id="slot-color"
                  type="color"
                  value={
                    project.colors?.[activeSlot] ??
                    selectedPart?.recolor?.base ??
                    "#888888"
                  }
                  onChange={(e) => {
                    const color = e.target.value;
                    if (activeSlot === "hair_front" || activeSlot === "hair_back") {
                      syncHairColor(color);
                    } else {
                      updateColor(activeSlot, color);
                    }
                  }}
                />
                <code>{project.colors?.[activeSlot] ?? selectedPart?.recolor?.base}</code>
                <button
                  type="button"
                  onClick={() => {
                    const base = selectedPart?.recolor?.base;
                    if (!base) return;
                    if (activeSlot === "hair_front" || activeSlot === "hair_back") {
                      syncHairColor(base);
                    } else {
                      updateColor(activeSlot, base);
                    }
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          <div className="field">
            <label htmlFor="part-filter">Filter</label>
            <input
              id="part-filter"
              placeholder="Search parts…"
              value={partFilter}
              onChange={(e) => setPartFilter(e.target.value)}
            />
          </div>

          <div className="parts-grid">
            <button
              type="button"
              className={`part-card${!project.selections[activeSlot] ? " active" : ""}`}
              onClick={() => updateSelection(activeSlot, null)}
            >
              <div className="thumb" />
              <div>
                <strong>None</strong>
                <span>Clear this slot</span>
              </div>
            </button>
            {partsInSlot.map((part) => (
              <button
                key={part.id}
                type="button"
                className={`part-card${project.selections[activeSlot] === part.id ? " active" : ""}`}
                onClick={() => updateSelection(activeSlot, part.id)}
              >
                <PartThumb
                  part={part}
                  tint={
                    part.slot !== "body" || project.selections.body === part.id
                      ? project.colors?.[part.slot]
                      : null
                  }
                />
                <div>
                  <strong>{part.name}</strong>
                  <span>{part.id}</span>
                </div>
              </button>
            ))}
            {partsInSlot.length === 0 && (
              <p className="status">
                No parts in this slot yet. Drop folders into parts/{activeSlot}/
              </p>
            )}
          </div>
        </aside>
      </div>

      <ShowcasePanel
        defaultOutDir={`${workspace.exportsDir}\\showcase`}
        defaultSourceDir={saveDir.trim() || workspace.projectsDir}
        draft={project}
        refreshToken={showcaseRefresh}
        onProjectsChanged={() => {
          void fetchWorkspace()
            .then(setWorkspace)
            .catch(() => undefined);
          setShowcaseRefresh((n) => n + 1);
        }}
      />
      <McpPanel />
    </div>
  );
}
