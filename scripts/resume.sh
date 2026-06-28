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
