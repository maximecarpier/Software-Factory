#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# Software Factory — checkpoint.sh
# Usage : ./factory/checkpoint.sh <nom-projet> <gate> [module-courant]
# Exemple : ./factory/checkpoint.sh mon-app gate-2 M2
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

PROJECT="${1:-}"
GATE="${2:-}"
CURRENT_MODULE="${3:-none}"
STATE_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.factory-state.json"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if [[ -z "$PROJECT" || -z "$GATE" ]]; then
  echo "Usage: $0 <nom-projet> <gate> [module-courant]"
  echo "Gates valides : gate-1, gate-2, gate-3, done"
  exit 1
fi

# Lire l'état existant ou initialiser
if [[ -f "$STATE_FILE" ]]; then
  EXISTING=$(cat "$STATE_FILE")
else
  EXISTING="{}"
fi

# Mettre à jour le fichier d'état
python3 - <<EOF
import json, sys

try:
    state = json.loads("""$EXISTING""")
except:
    state = {}

state["project"] = "$PROJECT"
state["last_checkpoint"] = "$GATE"
state["timestamp"] = "$TIMESTAMP"
state["current_module"] = "$CURRENT_MODULE"

if "status" not in state:
    state["status"] = {
        "specs": "pending",
        "design": "pending",
        "architecture": "pending",
        "modules": [],
        "review": "pending",
        "deploy": "pending"
    }

gate_map = {
    "gate-1": "specs",
    "gate-2": "architecture",
    "gate-3": "review",
    "done": "deploy"
}

if "$GATE" in gate_map:
    state["status"][gate_map["$GATE"]] = "done"

print(json.dumps(state, indent=2, ensure_ascii=False))
EOF
) > "$STATE_FILE"

echo "✅ Checkpoint sauvegardé : $GATE (projet: $PROJECT, module: $CURRENT_MODULE)"
echo "   Fichier : $STATE_FILE"

# Commit Git local de sauvegarde
cd "$(dirname "$STATE_FILE")"
if git rev-parse --git-dir > /dev/null 2>&1; then
  git add .factory-state.json
  git diff --cached --quiet || git commit -m "checkpoint: $GATE — projet $PROJECT, module $CURRENT_MODULE" --no-verify 2>/dev/null || true
  echo "   Commit Git : ✅"
fi
