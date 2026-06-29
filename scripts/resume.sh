#!/usr/bin/env bash
# Infère l'état du pipeline depuis les artefacts dans apps/<projet>/docs/
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APPS_DIR="$REPO_ROOT/apps"

if [[ ! -d "$APPS_DIR" ]]; then
  echo "ℹ️  Aucun projet trouvé dans apps/."
  exit 0
fi

PROJECTS=()
while IFS= read -r -d '' dir; do
  docs="$dir/docs"
  [[ -d "$docs" ]] && PROJECTS+=("$(basename "$dir")")
done < <(find "$APPS_DIR" -mindepth 1 -maxdepth 1 -type d -print0 2>/dev/null)

if [[ ${#PROJECTS[@]} -eq 0 ]]; then
  echo "ℹ️  Aucun projet avec docs/ trouvé dans apps/."
  exit 0
fi

python3 - "$REPO_ROOT" "${PROJECTS[@]}" <<'PYEOF'
import sys
from pathlib import Path

repo = Path(sys.argv[1])
projects = sys.argv[2:]

for proj in projects:
    docs    = repo / "apps" / proj / "docs"
    src     = repo / "apps" / proj / "src"

    has_brainstorm = (docs / "brainstorm.md").exists()
    has_specs      = (docs / "specs.md").exists()
    has_arch       = (docs / "architecture.md").exists() or (docs / "design.md").exists()
    has_code       = src.exists() and any(
        f for f in src.iterdir() if f.name not in ("node_modules", ".git")
    ) if src.exists() else False

    if has_code:
        gate, label, next_step = "gate-2+", "développement en cours", "→ code-reviewer + doc-writer + deploy"
    elif has_arch:
        gate, label, next_step = "gate-2", "architecture validée", "→ test-writer + code-implementer"
    elif has_specs:
        gate, label, next_step = "gate-1", "specs validées", "→ designer / tech-architect"
    elif has_brainstorm:
        gate, label, next_step = "gate-0", "brainstorm fait", "→ specs-framer"
    else:
        continue

    files = sorted(f.name for f in docs.iterdir() if f.is_file())

    print("=" * 52)
    print(f"📍 PROJET : {proj}")
    print(f"   Checkpoint     : {gate} ({label})")
    print(f"   Docs           : {', '.join(files) if files else 'aucun'}")
    print(f"   Prochaine étape: {next_step}")
    print("=" * 52)

PYEOF

# ── Backlog Redis ─────────────────────────────────────────────────────────────
DASHBOARD_URL="https://factory-dashboard-alpha.vercel.app/api/backlog"
BACKLOG_JSON=$(curl -sf --max-time 5 "$DASHBOARD_URL" 2>/dev/null || echo "")

if [[ -n "$BACKLOG_JSON" ]]; then
  python3 - "$BACKLOG_JSON" <<'PYEOF2'
import sys, json

raw = sys.argv[1]
try:
    data = json.loads(raw)
    items = data.get("items", data) if isinstance(data, dict) else data
except Exception:
    sys.exit(0)

PRIO_ORDER = {"haute": 0, "moyenne": 1, "basse": 2}
PRIO_ICON  = {"haute": "🔴", "moyenne": "🟡", "basse": "⚪"}

projects = {i["id"]: i["titre"] for i in items if i.get("type") == "projet"}
todo = [i for i in items if i.get("statut") in ("à faire", None) and i.get("type") != "projet"]
todo.sort(key=lambda x: (PRIO_ORDER.get(x.get("priorite", "basse"), 2), x.get("titre", "")))

by_proj = {}
for i in todo:
    pid = i.get("projectId", "_orphan")
    by_proj.setdefault(pid, []).append(i)

print("\n" + "─" * 52)
print("📋 BACKLOG — items à faire")
if not todo:
    print("   (aucun item à faire)")
else:
    for pid, group in sorted(by_proj.items(), key=lambda kv: PRIO_ORDER.get(kv[1][0].get("priorite","basse"), 2)):
        proj_name = projects.get(pid, pid)
        top_prio  = group[0].get("priorite", "basse")
        print(f"\n   {PRIO_ICON.get(top_prio,'⚪')} {proj_name}")
        for item in group:
            icon = PRIO_ICON.get(item.get("priorite", "basse"), "⚪")
            print(f"      {icon} {item['titre']}")
print("─" * 52)
PYEOF2
else
  echo "   ⚠️  Backlog Redis inaccessible (dashboard hors ligne ?)"
fi
