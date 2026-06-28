#!/usr/bin/env bash
# Affiche un résumé de session lisible depuis .factory-state.json
# et propose les prochaines actions.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_FILE="$REPO_ROOT/.factory-state.json"

if [[ ! -f "$STATE_FILE" ]]; then
  echo "ℹ️  Aucune session précédente trouvée (.factory-state.json absent)."
  echo "   Lance un nouveau projet via le pipeline Factory."
  exit 0
fi

python3 - <<'EOF'
import json, sys
from pathlib import Path

repo = Path(__file__).parent.parent
state_file = repo / ".factory-state.json"

with open(state_file) as f:
    s = json.load(f)

project   = s.get("project", "?")
gate      = s.get("last_checkpoint", "?")
saved     = s.get("last_saved", s.get("timestamp", "?"))
module    = s.get("current_module", "none")
agent     = s.get("agent_running", "—")
last_act  = s.get("last_action", "—")
files     = s.get("files_modified", [])
status    = s.get("status", {})
context   = s.get("context", {})

gate_order = ["gate-0", "gate-1", "gate-2", "gate-3", "done"]
gate_label = {
    "gate-0": "brainstorm validé",
    "gate-1": "specs validées",
    "gate-2": "architecture validée",
    "gate-3": "implémentation terminée",
    "done":   "déployé ✅",
}

print("=" * 60)
print(f"📍 SESSION PRÉCÉDENTE — {project}")
print("=" * 60)
print(f"  Checkpoint  : {gate} ({gate_label.get(gate, '?')})")
print(f"  Sauvegardé  : {saved}")
print(f"  Module      : {module}")
print(f"  Agent actif : {agent}")
print(f"  Dernière action : {last_act}")

if files:
    print(f"\n  Fichiers modifiés :")
    for f in files[:10]:
        print(f"    • {f}")

print(f"\n  Statut pipeline :")
for k, v in status.items():
    icon = "✅" if v == "done" else ("🔄" if v == "in-progress" else "⏳")
    if isinstance(v, list):
        print(f"    {icon} {k}: {', '.join(v) if v else 'none'}")
    else:
        print(f"    {icon} {k}: {v}")

if context:
    print(f"\n  Fichiers de référence :")
    for k, v in context.items():
        p = repo / v if v else None
        exists = "✅" if (p and p.exists()) else "❌"
        print(f"    {exists} {k}: {v}")

# Prochaine étape suggérée
next_gates = {
    "gate-0": "→ Lancer specs-framer",
    "gate-1": "→ Lancer designer / tech-architect (Gate 2)",
    "gate-2": "→ Lancer test-writer + code-implementer (Gate 3)",
    "gate-3": "→ Lancer code-reviewer + doc-writer + deploy",
    "done":   "→ Projet terminé",
}
print(f"\n  Prochaine étape : {next_gates.get(gate, '→ Reprendre depuis ' + gate)}")
print("=" * 60)
EOF
