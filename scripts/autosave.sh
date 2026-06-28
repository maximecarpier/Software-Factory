#!/usr/bin/env bash
# Auto-sauvegarde légère — appelé par le hook Stop de Claude Code.
# Ne modifie que les champs volatils (last_action, files_modified, timestamp).
# Pour une mise à jour de gate, utiliser checkpoint.sh.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_FILE="$REPO_ROOT/.factory-state.json"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Fichiers modifiés depuis le dernier commit (staged + unstaged, hors node_modules)
FILES_MODIFIED=$(git -C "$REPO_ROOT" diff --name-only HEAD 2>/dev/null \
  | grep -v 'node_modules' | head -20 | tr '\n' ',' | sed 's/,$//' || echo "")

# Si pas de state file, rien à enrichir — on sort silencieusement
[[ -f "$STATE_FILE" ]] || exit 0

python3 - <<EOF
import json, sys

with open("$STATE_FILE") as f:
    state = json.load(f)

state["last_saved"] = "$TIMESTAMP"
state["files_modified"] = [f for f in "$FILES_MODIFIED".split(",") if f]

with open("$STATE_FILE", "w") as f:
    json.dump(state, f, indent=2, ensure_ascii=False)
EOF

# Commit silencieux si des changements existent
cd "$REPO_ROOT"
git add .factory-state.json 2>/dev/null || true
git diff --cached --quiet 2>/dev/null || \
  git commit -m "autosave: $(date -u +%H:%M:%S)" --no-verify -q 2>/dev/null || true
