# Easy Sprite MCP

MCP tools so an AI agent (Cursor, Claude Desktop, Grok bot, etc.) can **compose and export** characters from existing parts — without opening the web UI. AI does **not** generate new art in-app.

## Transports

| Mode | When to use | Start |
|---|---|---|
| **stdio** (default) | Cursor, Claude Desktop, local agents | `npm run mcp` |
| **Streamable HTTP** | Remote / Grok-style / other HTTP MCP clients | `npm run mcp:http` → `http://127.0.0.1:8790/mcp` |

Workspace root: `EASYSPRITE_WORKSPACE` or `--workspace <path>` (default: cwd).

## Web UI panel

The local web app shows an **MCP** panel under the compositor:

- Cursor User MCP entry (copy into `~/.cursor/mcp.json`)
- HTTP endpoint status + **Start HTTP MCP** / Stop for Grok-style clients
- Tool list and recommended call flow

API: `GET /api/mcp`, `POST /api/mcp/http/start`, `POST /api/mcp/http/stop`.

## Cursor setup (one entry · works inside and outside)

Use **User** MCP only: `~/.cursor/mcp.json` (Windows: `%USERPROFILE%\.cursor\mcp.json`).

Do **not** also put `easysprite` in the project `.cursor/mcp.json` — that creates a second project-scoped row (often Disabled) and overrides the User one.

**1. Launcher** (once): from the repo run `npm run mcp:install-launcher`.  
It copies [`scripts/easysprite-mcp.mjs`](../scripts/easysprite-mcp.mjs) to `~/.cursor/easysprite-mcp.mjs` with this repo as the default install path. Override with `EASYSPRITE_HOME` (install folder) or `EASYSPRITE_WORKSPACE` (workspace). Re-run after moving the repo.

**2. User `~/.cursor/mcp.json`** — no `D:\` here. On Windows use `${env:USERPROFILE}`  
(not `${userHome}`, which can become `/c:/Users/...` and cause **Connection closed**):

```json
{
  "mcpServers": {
    "easysprite": {
      "command": "node",
      "args": ["${env:USERPROFILE}\\.cursor\\easysprite-mcp.mjs"]
    }
  }
}
```

Do not also define `easysprite` in the project `.cursor/mcp.json`.  
Reload MCP; badge should say **User**.

## Tools

| Tool | Purpose |
|---|---|
| `workspace_info` | Root, slots, species, anim/export presets, counts |
| `list_parts` | Filter parts by view (`topdown` default / `side`) / slot / query / bodyType |
| `list_projects` | Saved characters |
| `get_project` | One project JSON |
| `compose_character` | Save view + selections (+ colors) to a project file. Wrong-camera ids swap to their twin |
| `export_character` | Server-side sheet export (`native`, `rpgmaker_mv` top-down only, `godot`, `frames`) |
| `batch_compose` | Many characters, optional export |
| `build_showcase` | Animated HTML cast (Walk/Wave/Cheer + 4 dirs) from `projectsDir` into output `dir` |

Prompt: `easysprite-operator` — full compose-only playbook for agents (never invent part ids; workflow + animals + Thai village taste). Optional arg `request`.

## Typical agent flow

1. `workspace_info`
2. `list_parts` (e.g. slot `shirt`, query `mohom`; add `view: "side"` for side-scroller parts, ids `side_*`). Monk: query `robe` / `จีวร` → `shirt_monk_robe` + `hair_shaved_front` (+ optional `pants_sabong`)
3. `compose_character` with a `body` id, other slots, and `view` when building side-view
4. `export_character` with `projectId` and optional `dir`

Animals: `body` = `animal_dog`, `animal_cat`, … Human clothes are skipped on animals unless the part lists that species in `bodyTypes` (e.g. `acc_pet_collar`).

## HTTP for other clients

```bash
npm run mcp:http
# GET  http://127.0.0.1:8790/        → discovery JSON
# POST http://127.0.0.1:8790/mcp     → MCP Streamable HTTP
```

Point any MCP client that speaks Streamable HTTP at that endpoint. The HTTP server sends no CORS headers and rejects cross-origin browser requests and non-loopback `Host` headers. If you bind it to a non-loopback host (`--host 0.0.0.0`), it requires `Authorization: Bearer <token>` (printed at startup, or set `EASYSPRITE_TOKEN`).

`dir` / `exportDir` / `saveDir` must be inside the workspace, a folder picked in the web UI, or a folder listed in `EASYSPRITE_ALLOWED_DIRS`. Project ids must match `^[a-z0-9_-]+$`.
