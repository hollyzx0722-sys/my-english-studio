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

exec "$NODE_BIN" "$SCRIPT_DIR/server.js"
