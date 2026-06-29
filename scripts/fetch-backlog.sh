#!/bin/bash
# Fetches factory:backlog from Upstash KV and injects it as context at session start.

ENV_FILE="/workspaces/Software-Factory/.env.local"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

if [ -z "$KV_REST_API_URL" ] || [ -z "$KV_REST_API_TOKEN" ]; then
  exit 0
fi

RESULT=$(curl -sf -H "Authorization: Bearer $KV_REST_API_TOKEN" "$KV_REST_API_URL/get/factory:backlog")

if [ $? -ne 0 ] || [ -z "$RESULT" ]; then
  exit 0
fi

RAW=$(echo "$RESULT" | jq -r '.result // empty' 2>/dev/null)

if [ -z "$RAW" ]; then
  exit 0
fi

ITEMS=$(echo "$RAW" | jq '.' 2>/dev/null)

if [ -z "$ITEMS" ] || [ "$ITEMS" = "null" ]; then
  exit 0
fi

# Suppression automatique des terminés (hors projets) au démarrage
TERMINES_COUNT=$(echo "$ITEMS" | jq '[.[] | select(.statut == "terminé" and .type != "projet")] | length')
if [ "$TERMINES_COUNT" -gt 0 ]; then
  ACTIFS=$(echo "$ITEMS" | jq '[.[] | select(.statut != "terminé" or .type == "projet")]')
  curl -sf -X PUT "https://factory-dashboard-alpha.vercel.app/api/backlog" \
    -H "Content-Type: application/json" \
    -d "{\"items\": $ACTIFS}" \
    --max-time 5 >/dev/null 2>&1 || true
  ITEMS="$ACTIFS"
fi

COUNT=$(echo "$ITEMS" | jq 'length')

LINES=$(echo "$ITEMS" | jq -r '.[] | "- [\(.statut // "à faire")] \(.titre // .name // "sans titre") (\(.type // "?"))"' 2>/dev/null)

CONTEXT="## Backlog Factory — factory:backlog (${COUNT} items)

${LINES}"

jq -n --arg ctx "$CONTEXT" '{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": $ctx
  }
}'
