#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# Software Factory — security-check.sh
# Usage : ./scripts/security-check.sh [chemin-du-projet]
# Lance AVANT code-reviewer pour détecter les problèmes de sécurité automatiquement.
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

PROJECT_DIR="${1:-.}"
PASS=0
FAIL=0

red()   { echo -e "\033[0;31m$*\033[0m"; }
green() { echo -e "\033[0;32m$*\033[0m"; }
yellow(){ echo -e "\033[0;33m$*\033[0m"; }

echo "═══════════════════════════════════════════════"
echo "  SECURITY CHECK — Software Factory"
echo "  Dossier : $PROJECT_DIR"
echo "═══════════════════════════════════════════════"
echo ""

# ─── 1. Secrets côté client ───────────────────────────────────────────
echo "🔍 [1/5] Secrets côté client (fichiers public/ et *.html)"

CLIENT_DIRS="$PROJECT_DIR/public $PROJECT_DIR/src/app $PROJECT_DIR/pages"
SECRET_PATTERNS='(GITHUB_TOKEN|VERCEL_TOKEN|API_KEY|SECRET_KEY|ACCESS_TOKEN|ANTHROPIC_API_KEY|Bearer [A-Za-z0-9_\-]{20,})'

FOUND_SECRETS=0
for dir in $CLIENT_DIRS; do
  if [[ -d "$dir" ]]; then
    matches=$(grep -rEn "$SECRET_PATTERNS" "$dir" --include="*.js" --include="*.html" --include="*.ts" --include="*.tsx" 2>/dev/null || true)
    if [[ -n "$matches" ]]; then
      red "  ❌ BLOQUANT — Secret trouvé côté client :"
      echo "$matches" | head -10
      FOUND_SECRETS=1
    fi
  fi
done
if [[ $FOUND_SECRETS -eq 0 ]]; then
  green "  ✅ Aucun secret détecté côté client"
  ((PASS++))
else
  ((FAIL++))
fi

echo ""

# ─── 2. Variables d'env sensibles dans le HTML généré ─────────────────
echo "🔍 [2/5] Variables d'env interpolées dans du HTML/JS serveur"

SERVER_FILES=$(find "$PROJECT_DIR" -name "*.js" -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/public/*" 2>/dev/null || true)

ENV_IN_HTML=0
for f in $SERVER_FILES; do
  if grep -qE 'res\.send.*process\.env|innerHTML.*process\.env|template.*\$\{process\.env' "$f" 2>/dev/null; then
    red "  ❌ BLOQUANT — process.env interpolé dans du HTML envoyé au client :"
    grep -nE 'res\.send.*process\.env|innerHTML.*process\.env|template.*\$\{process\.env' "$f" | head -5 | sed "s|^|  $f:|"
    ENV_IN_HTML=1
  fi
done
if [[ $ENV_IN_HTML -eq 0 ]]; then
  green "  ✅ Aucune interpolation de process.env dans le HTML"
  ((PASS++))
else
  ((FAIL++))
fi

echo ""

# ─── 3. APIs externes appelées depuis le frontend ─────────────────────
echo "🔍 [3/5] Appels directs à des APIs externes depuis le frontend"

EXTERNAL_API_PATTERNS='(fetch\s*\(\s*['"'"'"`]https://api\.|axios\.(get|post)\s*\(\s*['"'"'"`]https://api\.|fetch\s*\(\s*['"'"'"`]https://api\.anthropic|fetch\s*\(\s*['"'"'"`]https://api\.github)'

DIRECT_API=0
for dir in $CLIENT_DIRS; do
  if [[ -d "$dir" ]]; then
    matches=$(grep -rEn "$EXTERNAL_API_PATTERNS" "$dir" --include="*.js" --include="*.ts" --include="*.tsx" 2>/dev/null || true)
    if [[ -n "$matches" ]]; then
      red "  ❌ BLOQUANT — Appel API externe depuis le frontend (doit passer par /api/*) :"
      echo "$matches" | head -10
      DIRECT_API=1
    fi
  fi
done
if [[ $DIRECT_API -eq 0 ]]; then
  green "  ✅ Aucun appel API externe direct depuis le frontend"
  ((PASS++))
else
  ((FAIL++))
fi

echo ""

# ─── 4. Tests stubs (assertions factices) ─────────────────────────────
echo "🔍 [4/5] Tests stubs / assertions factices"

TEST_DIRS="$PROJECT_DIR/tests $PROJECT_DIR/__tests__ $PROJECT_DIR/src/__tests__"
STUBS=0
STUB_FILES=""

for dir in $TEST_DIRS; do
  if [[ -d "$dir" ]]; then
    # Cherche les patterns de stubs : expect(true), it.todo, xit, describe.skip, assertions commentées
    stub_matches=$(grep -rEn '(expect\(true\)\.toBe\(true\)|it\.todo|xit\(|describe\.skip|xdescribe\()' "$dir" --include="*.test.*" --include="*.spec.*" 2>/dev/null || true)
    if [[ -n "$stub_matches" ]]; then
      count=$(echo "$stub_matches" | wc -l)
      yellow "  ⚠️  $count ligne(s) de tests stubs/skipped détectées"
      echo "$stub_matches" | head -10
      STUBS=1
    fi
  fi
done
if [[ $STUBS -eq 0 ]]; then
  green "  ✅ Aucun test stub évident détecté"
  ((PASS++))
else
  yellow "  ⚠️  Vérifier manuellement la couverture réelle (vitest --coverage)"
  ((FAIL++))
fi

echo ""

# ─── 5. Couverture de tests réelle ────────────────────────────────────
echo "🔍 [5/5] Couverture de tests réelle"

if [[ -f "$PROJECT_DIR/package.json" ]]; then
  HAS_VITEST=$(grep -q '"vitest"' "$PROJECT_DIR/package.json" && echo "yes" || echo "no")
  HAS_JEST=$(grep -q '"jest"' "$PROJECT_DIR/package.json" && echo "yes" || echo "no")

  cd "$PROJECT_DIR"

  if [[ "$HAS_VITEST" == "yes" ]]; then
    echo "  Exécution : npx vitest run --coverage ..."
    COVERAGE_OUTPUT=$(npx vitest run --coverage --reporter=verbose 2>&1 | tail -20 || true)
    echo "$COVERAGE_OUTPUT"

    # Extraire le % de couverture global
    COVERAGE_PCT=$(echo "$COVERAGE_OUTPUT" | grep -oE 'All files[^|]*\|[^|]*\|[^|]*\|[^|]*\|' | grep -oE '[0-9]+\.[0-9]+' | head -1 || echo "0")
    if [[ -n "$COVERAGE_PCT" ]] && (( $(echo "$COVERAGE_PCT >= 75" | bc -l 2>/dev/null || echo 0) )); then
      green "  ✅ Couverture : ${COVERAGE_PCT}% (≥ 75%)"
      ((PASS++))
    else
      red "  ❌ BLOQUANT — Couverture : ${COVERAGE_PCT}% (< 75% requis)"
      ((FAIL++))
    fi
  elif [[ "$HAS_JEST" == "yes" ]]; then
    echo "  Exécution : npx jest --coverage ..."
    COVERAGE_OUTPUT=$(npx jest --coverage --coverageReporters=text 2>&1 | tail -20 || true)
    echo "$COVERAGE_OUTPUT"
    COVERAGE_PCT=$(echo "$COVERAGE_OUTPUT" | grep -oE 'All files[^|]*\|[^|]*\|' | grep -oE '[0-9]+\.[0-9]+' | head -1 || echo "0")
    if [[ -n "$COVERAGE_PCT" ]] && (( $(echo "$COVERAGE_PCT >= 75" | bc -l 2>/dev/null || echo 0) )); then
      green "  ✅ Couverture : ${COVERAGE_PCT}%"
      ((PASS++))
    else
      red "  ❌ BLOQUANT — Couverture : ${COVERAGE_PCT}% (< 75% requis)"
      ((FAIL++))
    fi
  else
    yellow "  ⚠️  Aucun runner de tests détecté (vitest/jest). Couverture non mesurable."
  fi
else
  yellow "  ⚠️  Pas de package.json trouvé dans $PROJECT_DIR"
fi

echo ""
echo "═══════════════════════════════════════════════"
echo "  RÉSULTAT : $PASS vérifications OK, $FAIL bloquant(s)"
echo "═══════════════════════════════════════════════"

if [[ $FAIL -gt 0 ]]; then
  red "  🔴 $FAIL BLOQUANT(S) — Ne pas passer en code-review avant correction"
  exit 1
else
  green "  ✅ Toutes les vérifications passent — OK pour code-reviewer"
  exit 0
fi
