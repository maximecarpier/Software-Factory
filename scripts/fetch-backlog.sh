#!/bin/bash
# Fetches backlog from dashboard API at session start, cleans up "terminé" items,
# and injects remaining items as context for Claude.

DASHBOARD_URL="https://factory-dashboard-alpha.vercel.app/api/backlog"

RESULT=$(curl -sf --max-time 8 "$DASHBOARD_URL" 2>/dev/null)

if [ -z "$RESULT" ]; then
  exit 0
fi

ITEMS=$(echo "$RESULT" | jq '.items // .' 2>/dev/null)

if [ -z "$ITEMS" ] || [ "$ITEMS" = "null" ]; then
  exit 0
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Snapshot complet avant nettoyage (avec terminés) pour historique git
mkdir -p "$REPO_ROOT/backlog"
echo "$RESULT" | jq '{items: (.items // .)}' > "$REPO_ROOT/backlog/latest.json" 2>/dev/null || true

# Suppression automatique des terminés (hors projets) au démarrage
TERMINES_COUNT=$(echo "$ITEMS" | jq '[.[] | select(.statut == "terminé" and .type != "projet")] | length')
if [ "$TERMINES_COUNT" -gt 0 ]; then
  ACTIFS=$(echo "$ITEMS" | jq '[.[] | select(.statut != "terminé" or .type == "projet")]')
  curl -sf -X PUT "$DASHBOARD_URL" \
    -H "Content-Type: application/json" \
    -d "{\"items\": $ACTIFS}" \
    --max-time 5 >/dev/null 2>&1 || true
  ITEMS="$ACTIFS"
fi

COUNT=$(echo "$ITEMS" | jq 'length')

LINES=$(echo "$ITEMS" | jq -r '.[] | "- [\(.statut // "à faire")] \(.titre // .name // "sans titre") (\(.type // "?"))"' 2>/dev/null)

CONTEXT="## Backlog Factory — ${COUNT} items (terminés supprimés automatiquement)

${LINES}"

jq -n --arg ctx "$CONTEXT" '{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": $ctx
  }
}'
