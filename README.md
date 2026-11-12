# Easy Sprite

Local CLI + web tool for composing modular pixel-art character sprites.

**Art style lock:** RPG Maker MV/MZ · Stardew-like · top-down ¾ chibi  
(see `docs/STYLE.md`, `vendor/REFERENCES.md`)

You prepare part sheets ahead of time (by hand, Aseprite, LPC packs, or any off-app tools).  
The app only **selects, recolors, previews, and exports** — no AI generation in-product.

## Quick start

```bash
npm install
npm run vendor:fetch   # clone LPC / PixelDoll / PixyGoat / etc. into vendor/
npm run dev
```

- API: `http://127.0.0.1:8787`
- UI: `http://127.0.0.1:5173`

### Desktop (Windows)

Double-click launcher or pin a shortcut:

```bash
npm run desktop:shortcut   # creates Desktop\Easy Sprite.lnk
npm run desktop            # start UI + open browser
```

Or run `scripts\start-desktop.bat`. Uses `EASYSPRITE_HOME` if set, otherwise this folder.  
Close the console window (or Ctrl+C) to stop the server.

First run creates:

```text
parts/       modular sprite sheets
projects/    saved character selections + colors
exports/     exported sheets / frames
easysprite.config.json
```

Refresh sample parts:

```bash
npx tsx src/cli.ts init --force-samples
```

## Commands

```bash
npm run init
npm run serve
npm run desktop            # desktop launcher (opens browser)
npm run desktop:shortcut   # Windows Desktop icon
npm run build
npx tsx src/cli.ts serve --dev
npm run mcp          # MCP over stdio (Cursor / local agents)
npm run mcp:http     # MCP over HTTP at http://127.0.0.1:8790/mcp
```

## AI / MCP

Agents can compose and export characters without the web UI. See [`docs/MCP.md`](docs/MCP.md).  
Cursor: one **User** MCP entry in `~/.cursor/mcp.json` (works in every project). See [`docs/MCP.md`](docs/MCP.md).  
Still **compose-only** — no AI art generation in-app.

## Part format

```text
parts/<slot>/<part_id>/
  sheet.png
  part.json
```

Grid: columns = the 30 frames in `frames` order:

| Group | Frames |
|---|---|
| Move | `idle`, `walk0`–`walk2`, `run0`–`run3`, `jump0`, `jump1` |
| Daily | `wave0/1`, `carry0/1`, `farm0/1`, `cheer0/1` |
| Fight | `attack0/1`, `hurt0/1`, `fall0/1` (fall1 = knocked out, lying) |
| Rest | `sleep0/1` (lying), `tired0/1`, `sit`, `crouch` |

Animals (`parts/body/animal_<species>`) are complete bodies on the same 30-frame grid; the frames mean the closest animal action (wave = wag/call, carry = eat, farm = dig/scratch, cheer = happy hop, attack = bite/charge, crouch = sniff, fall1 = belly-up KO). Species: pets `dog`, `cat`, `rabbit`, `chicken`, `duck`, `buffalo`, `pig`; wild `deer`, `boar`, `tiger`, `elephant`, `monkey`, `squirrel`, `myna`. Human clothes are skipped on animals; a wearable shows on an animal only if its `bodyTypes` lists that species (see `acc_pet_collar`).

Rows = direction blocks (`front`, `right`, `back`, `left`). Wearable parts that fit several body types list them in `bodyTypes` (e.g. `["adult","child","elder","stocky"]`) and stack one 4-row block per body type in that order. Body parts set a single `bodyType` and have 4 rows. A part without `bodyTypes` uses its first block for every body.  
Default frame size: `48x48`. Every part must keep the same body position per frame (feet on the same row, head at the same height) or layers will drift apart during animation. `recolor.tolerance` is the hue window (70 ≈ 25°) used to find shades of `base`.

```json
{
  "id": "shirt_blazer",
  "name": "School Blazer",
  "slot": "shirt",
  "zIndex": 40,
  "frameSize": 48,
  "columns": 30,
  "rows": 16,
  "directions": ["front", "right", "back", "left"],
  "frames": ["idle", "walk0", "walk1", "walk2", "run0", "run1", "run2", "run3", "jump0", "jump1",
             "wave0", "wave1", "carry0", "carry1", "farm0", "farm1", "cheer0", "cheer1",
             "attack0", "attack1", "hurt0", "hurt1", "fall0", "fall1",
             "sleep0", "sleep1", "tired0", "tired1", "sit", "crouch"],
  "bodyTypes": ["adult", "child", "elder", "stocky"],
  "sheet": "sheet.png",
  "recolor": {
    "enabled": true,
    "base": "#243a6e",
    "tolerance": 70
  }
}
```

## Features

- Slot-based paperdoll compositor
- Per-slot recolor (hair syncs front/back)
- Walk timeline preview (4 directions)
- Project save: selections + colors (choose any Save folder; Default = `projects/`)
- Export to any Export folder (Default = `exports/`); last folders are remembered
- Export presets:
  - Native Easy Sprite sheet
  - RPG Maker MV/MZ 3×4
  - Godot atlas JSON
  - Per-frame folder

## Slots

`hair_back` → `body` → `shoes` → `pants` → `shirt` → `face` → `hair_front` → `accessory`
