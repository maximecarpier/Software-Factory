#!/usr/bin/env bash
# Auto-sauvegarde légère — appelé par le hook Stop de Claude Code.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Commit silencieux si des changements existent (hors node_modules)
if ! git diff --quiet HEAD 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
  git add .factory/ apps/ scripts/ .claude/ CLAUDE.md 2>/dev/null || true
  git -c commit.gpgsign=false commit -m "autosave: $(date -u +%H:%M:%S)" --no-verify -q 2>/dev/null || true
fi
