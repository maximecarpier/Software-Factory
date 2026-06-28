#!/usr/bin/env bash
# Infère l'état du projet depuis les artefacts dans .factory/<projet>/
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FACTORY_DIR="$REPO_ROOT/.factory"

if [[ ! -d "$FACTORY_DIR" ]]; then
  echo "ℹ️  Aucun projet en cours trouvé."
  exit 0
fi

PROJECTS=()
while IFS= read -r -d '' dir; do
  name=$(basename "$dir")
  PROJECTS+=("$name")
done < <(find "$FACTORY_DIR" -mindepth 1 -maxdepth 1 -type d -print0 2>/dev/null)

if [[ ${#PROJECTS[@]} -eq 0 ]]; then
  echo "ℹ️  Aucun projet en cours trouvé dans .factory/."
  exit 0
fi

python3 - "$REPO_ROOT" "${PROJECTS[@]}" <<'PYEOF'
import sys
from pathlib import Path

repo = Path(sys.argv[1])
projects = sys.argv[2:]

for proj in projects:
    factory = repo / ".factory" / proj
    app_dir = repo / "apps" / proj

    has_brainstorm = (factory / "brainstorm.md").exists()
    has_specs      = (factory / "specs.md").exists()
    has_arch       = (factory / "architecture.md").exists() or (factory / "design.md").exists()
    has_code       = app_dir.exists() and any(f for f in app_dir.iterdir() if f.name not in ("node_modules", ".git"))

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

    files = sorted(f.name for f in factory.iterdir() if f.is_file())

    print("=" * 52)
    print(f"📍 PROJET : {proj}")
    print(f"   Checkpoint     : {gate} ({label})")
    print(f"   Artefacts      : {', '.join(files) if files else 'aucun'}")
    print(f"   Prochaine étape: {next_step}")
    print("=" * 52)

PYEOF
