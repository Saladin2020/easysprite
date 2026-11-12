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

**1. Launcher** (once): copy or keep `~/.cursor/easysprite-mcp.mjs`  
(default install path inside that file / via `EASYSPRITE_HOME`).

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
| `list_parts` | Filter parts by slot / query / bodyType |
| `list_projects` | Saved characters |
| `get_project` | One project JSON |
| `compose_character` | Save selections (+ colors) to a project file |
| `export_character` | Server-side sheet export (`native`, `rpgmaker_mv`, `godot`, `frames`) |
| `batch_compose` | Many characters, optional export |
| `build_showcase` | Animated HTML cast (Walk/Wave/Cheer + 4 dirs) from `projectsDir` into output `dir` |

Prompt: `easysprite-operator` — full compose-only playbook for agents (never invent part ids; workflow + animals + Thai village taste). Optional arg `request`.

## Typical agent flow

1. `workspace_info`
2. `list_parts` (e.g. slot `shirt`, query `mohom`)
3. `compose_character` with a `body` id and other slots
4. `export_character` with `projectId` and optional `dir`

Animals: `body` = `animal_dog`, `animal_cat`, … Human clothes are skipped on animals unless the part lists that species in `bodyTypes` (e.g. `acc_pet_collar`).

## HTTP for other clients

```bash
npm run mcp:http
# GET  http://127.0.0.1:8790/        → discovery JSON
# POST http://127.0.0.1:8790/mcp     → MCP Streamable HTTP
```

Point any MCP client that speaks Streamable HTTP at that endpoint. Keep the server on localhost unless you add auth.
