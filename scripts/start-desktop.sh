#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
WS="${EASYSPRITE_HOME:-$PWD}"
echo ""
echo " Easy Sprite — desktop launcher"
echo " Workspace: $WS"
echo " Close this terminal to stop the server."
echo ""
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found. Install Node 20+ then try again."
  exit 1
fi
if [[ -f node_modules/tsx/dist/cli.mjs ]]; then
  exec node node_modules/tsx/dist/cli.mjs src/cli.ts desktop --workspace "$WS"
elif [[ -f dist/cli.js ]]; then
  exec node dist/cli.js desktop --workspace "$WS"
else
  exec npx --yes tsx src/cli.ts desktop --workspace "$WS"
fi
