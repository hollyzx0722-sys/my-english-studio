#!/bin/zsh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NODE_BIN="$(command -v node 2>/dev/null || true)"
if [[ -z "$NODE_BIN" ]]; then
  NODE_BIN="/Users/cecilia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi

if [[ -f "$SCRIPT_DIR/.env" ]]; then
  set -a
  source "$SCRIPT_DIR/.env"
  set +a
fi

"$NODE_BIN" "$SCRIPT_DIR/scripts/export-static-data.js"
git -C "$SCRIPT_DIR" add data/articles.json

if git -C "$SCRIPT_DIR" diff --cached --quiet; then
  echo "No published study-note changes."
  exit 0
fi

git -C "$SCRIPT_DIR" commit -m "Publish Obsidian study notes"
git -C "$SCRIPT_DIR" push origin main
echo "Published. GitHub Pages will refresh in a few minutes."
