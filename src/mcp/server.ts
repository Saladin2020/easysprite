#!/usr/bin/env node
/**
 * Easy Sprite MCP server (stdio by default; optional Streamable HTTP).
 *
 * Cursor / Claude Desktop / local agents:
 *   npx tsx src/mcp/server.ts
 *   # or after build: node dist/mcp/server.js
 *
 * Remote / Grok-style clients later:
 *   npx tsx src/mcp/server.ts --http --port 8790
 *
 * Env:
 *   EASYSPRITE_WORKSPACE  absolute path to the workspace (default: cwd)
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "node:http";
import { z } from "zod";
import {
  ANIM_PRESETS,
  EXPORT_PRESETS,
  PET_SPECIES,
  SPECIES,
  WILD_SPECIES,
  type ExportPresetId,
  type PartSlot,
} from "../shared/types.js";
import {
  OPERATOR_PROMPT_DESCRIPTION,
  buildOperatorPrompt,
} from "../shared/operatorPrompt.js";
import { composeAndSave, exportProject } from "../lib/compose.js";
import { buildShowcase } from "../lib/showcase.js";
import { getWorkspaceSummary, loadParts, loadProjects, resolveWorkspace } from "../lib/workspace.js";
import { checkRequest, resolveToken } from "../shared/requestGuard.js";

/** Project ids are file names: `a-z 0-9 _ -` only. */
const ProjectIdSchema = z.string().regex(/^[a-z0-9_-]+$/, "Use a-z, 0-9, _ or -");

function text(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function err(message: string) {
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: message }],
  };
}

const SlotSchema = z.enum([
  "body",
  "pants",
  "shoes",
  "shirt",
  "hair_back",
  "hair_front",
  "face",
  "accessory",
]);

const ExportPresetSchema = z.enum(["native", "rpgmaker_mv", "godot", "frames"]);

function parseArgs(argv: string[]) {
  const out = { http: false, port: 8790, host: "127.0.0.1", workspace: process.env.EASYSPRITE_WORKSPACE ?? process.cwd() };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--http") out.http = true;
    else if (a === "--port") out.port = Number(argv[++i] ?? out.port);
    else if (a === "--host") out.host = argv[++i] ?? out.host;
    else if (a === "--workspace") out.workspace = argv[++i] ?? out.workspace;
  }
  return out;
}

export function createEasySpriteMcp(workspaceRoot: string): McpServer {
  const root = resolveWorkspace(workspaceRoot);
  const server = new McpServer({
    name: "easysprite",
    version: "0.1.0",
  });

  server.registerTool(
    "workspace_info",
    {
      title: "Workspace info",
      description:
        "Summarize the Easy Sprite workspace: root path, art style, frame size, slots, body/species types, animation presets, export presets, and part/project counts. Call this first.",
      inputSchema: {},
    },
    async () => {
      const summary = await getWorkspaceSummary(root);
      return text({
        root: summary.root,
        projectsDir: summary.projectsDir,
        exportsDir: summary.exportsDir,
        artStyle: summary.config.artStyle,
        frameSize: summary.config.frameSize,
        directions: summary.config.directions,
        frameCount: summary.config.frames.length,
        slots: summary.config.slots,
        humanBodyTypes: ["adult", "child", "elder", "stocky"],
        petSpecies: [...PET_SPECIES],
        wildSpecies: [...WILD_SPECIES],
        animPresets: ANIM_PRESETS.map((a) => ({
          id: a.id,
          label: a.label,
          animalLabel: a.animalLabel,
          frames: a.frames,
          loop: a.loop,
        })),
        exportPresets: EXPORT_PRESETS,
        partCount: summary.parts.length,
        projectCount: summary.projects.length,
        note: "AI composes existing parts only — do not invent part ids. Animals use body animal_<species>; human clothes are skipped on animals unless bodyTypes lists that species.",
      });
    },
  );

  server.registerTool(
    "list_parts",
    {
      title: "List parts",
      description:
        "List modular sprite parts (bodies, clothes, hair, faces, accessories, animals). Filter by slot, search query, or body/species type the part fits.",
      inputSchema: {
        slot: SlotSchema.optional().describe("Part slot to filter"),
        query: z.string().optional().describe("Case-insensitive match on id or name"),
        bodyType: z
          .string()
          .optional()
          .describe("Only parts that fit this body/species, e.g. adult, child, dog, tiger"),
        limit: z.number().int().min(1).max(200).optional().describe("Max results (default 80)"),
      },
    },
    async ({ slot, query, bodyType, limit }) => {
      const parts = await loadParts(root);
      const q = query?.trim().toLowerCase() ?? "";
      const max = limit ?? 80;
      const filtered = parts.filter((p) => {
        if (slot && p.slot !== slot) return false;
        if (q && !p.id.toLowerCase().includes(q) && !p.name.toLowerCase().includes(q)) return false;
        if (bodyType) {
          if (p.slot === "body") return p.bodyType === bodyType;
          if (p.bodyTypes) return p.bodyTypes.includes(bodyType as never);
          return !SPECIES.includes(bodyType as never);
        }
        return true;
      });
      return text({
        total: filtered.length,
        shown: Math.min(max, filtered.length),
        parts: filtered.slice(0, max).map((p) => ({
          id: p.id,
          name: p.name,
          slot: p.slot,
          bodyType: p.bodyType,
          bodyTypes: p.bodyTypes,
          recolorBase: p.recolor?.enabled ? p.recolor.base : null,
        })),
      });
    },
  );

  server.registerTool(
    "list_projects",
    {
      title: "List projects",
      description: "List saved character/animal projects in the workspace projects folder.",
      inputSchema: {
        query: z.string().optional().describe("Filter by id or name"),
      },
    },
    async ({ query }) => {
      const projects = await loadProjects(root);
      const q = query?.trim().toLowerCase() ?? "";
      const filtered = projects.filter(
        (p) => !q || p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
      );
      return text({
        count: filtered.length,
        projects: filtered.map((p) => ({
          id: p.id,
          name: p.name,
          body: p.selections.body ?? null,
          updatedAt: p.updatedAt,
        })),
      });
    },
  );

  server.registerTool(
    "get_project",
    {
      title: "Get project",
      description: "Load one saved project by id (selections + colors).",
      inputSchema: {
        id: z.string().describe("Project id, e.g. village_farmer"),
      },
    },
    async ({ id }) => {
      const projects = await loadProjects(root);
      const project = projects.find((p) => p.id === id);
      if (!project) return err(`Project not found: ${id}`);
      return text(project);
    },
  );

  server.registerTool(
    "compose_character",
    {
      title: "Compose character",
      description:
        "Create or overwrite a character/animal project from part selections and optional recolor hex colors. Auto-fills hair_back from hair_front when possible. Clears clothes that do not fit animal bodies. Returns warnings for unknown or incompatible parts.",
      inputSchema: {
        id: ProjectIdSchema.describe("Save id slug, e.g. rice_farmer_pa"),
        name: z.string().describe("Display name"),
        selections: z
          .record(SlotSchema, z.string().nullable())
          .describe("Map of slot → part id (or null). Must include body."),
        colors: z
          .record(SlotSchema, z.string())
          .optional()
          .describe("Optional per-slot tint hex colors, e.g. { shirt: \"#2b3a67\" }"),
        dir: z
          .string()
          .optional()
          .describe("Optional absolute/relative folder for the JSON (default: workspace projects/)"),
      },
    },
    async ({ id, name, selections, colors, dir }) => {
      try {
        const result = await composeAndSave(root, {
          id,
          name,
          selections: selections as Partial<Record<PartSlot, string | null>>,
          colors: colors as Partial<Record<PartSlot, string>> | undefined,
          dir,
        });
        return text(result);
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool(
    "export_character",
    {
      title: "Export character",
      description:
        "Compose layers server-side and write sprite sheet files. Provide projectId of a saved project, or an inline project object. Presets: native (4×30), rpgmaker_mv, godot, frames.",
      inputSchema: {
        projectId: ProjectIdSchema.optional().describe("Saved project id"),
        project: z
          .object({
            id: z.string(),
            name: z.string(),
            selections: z.record(SlotSchema, z.string().nullable()),
            colors: z.record(SlotSchema, z.string()).optional(),
          })
          .optional()
          .describe("Inline project if not using projectId"),
        preset: ExportPresetSchema.optional().describe("Export format (default native)"),
        dir: z.string().optional().describe("Output folder (default workspace exports/)"),
        baseName: z.string().optional().describe("Filename stem (default project name)"),
      },
    },
    async ({ projectId, project, preset, dir, baseName }) => {
      try {
        if (!projectId && !project) return err("projectId or project required");
        const result = await exportProject(root, {
          projectId,
          project: project
            ? {
                id: project.id,
                name: project.name,
                updatedAt: new Date().toISOString(),
                selections: project.selections as Partial<Record<PartSlot, string | null>>,
                colors: project.colors as Partial<Record<PartSlot, string>> | undefined,
              }
            : undefined,
          preset: (preset ?? "native") as ExportPresetId,
          dir,
          baseName,
        });
        return text(result);
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool(
    "batch_compose",
    {
      title: "Batch compose",
      description:
        "Compose and optionally export many characters in one call. Useful for filling a village cast from a list.",
      inputSchema: {
        characters: z
          .array(
            z.object({
              id: ProjectIdSchema,
              name: z.string(),
              selections: z.record(SlotSchema, z.string().nullable()),
              colors: z.record(SlotSchema, z.string()).optional(),
            }),
          )
          .min(1)
          .max(40),
        exportPreset: ExportPresetSchema.optional().describe("If set, also export each character"),
        exportDir: z.string().optional(),
        saveDir: z.string().optional(),
      },
    },
    async ({ characters, exportPreset, exportDir, saveDir }) => {
      const results = [];
      for (const ch of characters) {
        try {
          const saved = await composeAndSave(root, {
            id: ch.id,
            name: ch.name,
            selections: ch.selections as Partial<Record<PartSlot, string | null>>,
            colors: ch.colors as Partial<Record<PartSlot, string>> | undefined,
            dir: saveDir,
          });
          let exported: unknown = null;
          if (exportPreset) {
            exported = await exportProject(root, {
              project: saved.project,
              preset: exportPreset as ExportPresetId,
              dir: exportDir,
            });
          }
          results.push({ ok: true, id: saved.project.id, path: saved.path, warnings: saved.warnings, exported });
        } catch (e) {
          results.push({ ok: false, id: ch.id, error: e instanceof Error ? e.message : String(e) });
        }
      }
      return text({ count: results.length, results });
    },
  );

  server.registerTool(
    "build_showcase",
    {
      title: "Build showcase",
      description:
        "Write an animated HTML cast showcase (Walk/Wave/Cheer + 4 directions) to a folder. Reads project JSON from projectsDir (default workspace projects/).",
      inputSchema: {
        projectIds: z
          .array(z.string())
          .optional()
          .describe("Project ids to include; omit for all in projectsDir"),
        projectsDir: z
          .string()
          .optional()
          .describe("Folder of saved project JSON (default: workspace projects/)"),
        dir: z
          .string()
          .optional()
          .describe("Output folder (absolute or relative). Default: exports/showcase"),
        title: z.string().optional().describe("Showcase title"),
        columns: z.number().int().min(1).max(8).optional(),
        scale: z.number().int().min(2).max(8).optional().describe("Pixel scale (default 4)"),
      },
    },
    async ({ projectIds, projectsDir, dir, title, columns, scale }) => {
      try {
        const result = await buildShowcase(root, {
          projectIds,
          projectsDir,
          dir,
          title,
          columns,
          scale,
        });
        return text(result);
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerPrompt(
    "easysprite-operator",
    {
      title: "Easy Sprite operator",
      description: OPERATOR_PROMPT_DESCRIPTION,
      argsSchema: {
        request: z
          .string()
          .optional()
          .describe("What the user asked to build or export (Thai or English)"),
      },
    },
    async ({ request }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: buildOperatorPrompt(request),
          },
        },
      ],
    }),
  );

  return server;
}

export async function startMcp(options: {
  workspace: string;
  http?: boolean;
  host?: string;
  port?: number;
}): Promise<void> {
  const workspace = resolveWorkspace(options.workspace);
  if (options.http) {
    await startHttp(workspace, options.host ?? "127.0.0.1", options.port ?? 8790);
    return;
  }
  await startStdio(workspace);
}

async function startStdio(workspace: string) {
  const server = createEasySpriteMcp(workspace);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

async function startHttp(workspace: string, host: string, port: number) {
  // Lazy-import so stdio-only clients don't need the HTTP transport module resolved eagerly.
  const { StreamableHTTPServerTransport } = await import(
    "@modelcontextprotocol/sdk/server/streamableHttp.js"
  );

  const sessions = new Map<string, InstanceType<typeof StreamableHTTPServerTransport>>();
  const token = resolveToken(host);
  if (token) console.error(`Non-loopback host: send "Authorization: Bearer ${token}" (or set EASYSPRITE_TOKEN)`);

  // No CORS: browsers on other sites must not drive the MCP. Same guard as the web API.
  const httpServer = createServer(async (req, res) => {
    const auth = req.headers.authorization;
    const denied = checkRequest(
      { bindHost: host, token },
      {
        method: req.method ?? "GET",
        host: req.headers.host,
        origin: req.headers.origin,
        token: auth?.startsWith("Bearer ") ? auth.slice(7) : (req.headers["x-easysprite-token"] as string | undefined),
      },
    );
    if (denied) {
      res.writeHead(denied.status, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: denied.error }));
      return;
    }

    const url = new URL(req.url ?? "/", `http://${host}:${port}`);
    if (url.pathname !== "/mcp") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          name: "easysprite",
          transport: "streamable-http",
          endpoint: `http://${host}:${port}/mcp`,
          workspace,
        }),
      );
      return;
    }

    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    try {
      if (req.method === "POST") {
        let transport = sessionId ? sessions.get(sessionId) : undefined;
        if (!transport) {
          const mcp = createEasySpriteMcp(workspace);
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => crypto.randomUUID(),
            onsessioninitialized: (id: string) => {
              sessions.set(id, transport!);
            },
          });
          transport.onclose = () => {
            const id = transport!.sessionId;
            if (id) sessions.delete(id);
          };
          await mcp.connect(transport);
        }
        await transport.handleRequest(req, res);
        return;
      }

      if (req.method === "GET" || req.method === "DELETE") {
        const transport = sessionId ? sessions.get(sessionId) : undefined;
        if (!transport) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid or missing mcp-session-id" }));
          return;
        }
        await transport.handleRequest(req, res);
        return;
      }

      res.writeHead(405).end();
    } catch (e) {
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
      }
    }
  });

  httpServer.listen(port, host, () => {
    console.error(`Easy Sprite MCP (HTTP) http://${host}:${port}/mcp`);
    console.error(`Workspace ${workspace}`);
  });
}

/** True when this file is the MCP entry (direct node/tsx, or `node tsx/cli.mjs server.ts …`). */
function isMcpEntry(): boolean {
  return process.argv.some((arg) => /(?:^|[/\\])mcp[/\\]server\.(?:ts|js|mjs)$/i.test(arg));
}

function entryArgs(): string[] {
  const idx = process.argv.findIndex((arg) =>
    /(?:^|[/\\])mcp[/\\]server\.(?:ts|js|mjs)$/i.test(arg),
  );
  return process.argv.slice(idx >= 0 ? idx + 1 : 2);
}

if (isMcpEntry()) {
  await startMcp(parseArgs(entryArgs()));
}
