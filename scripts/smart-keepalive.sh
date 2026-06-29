#!/usr/bin/env bash
# Empêche le Codespace de dormir pendant une session remote (Claude iOS, iPad).
# Pingue toutes les 4 min pour rester sous le seuil d'inactivité GitHub (5 min).
# S'arrête automatiquement après la durée demandée pour économiser les heures gratuites.
#
# Usage : ./scripts/smart-keepalive.sh [durée]
#   durée : ex. 1h, 90m, 2h (défaut : 2h)
#
# Lancer en fond : ./scripts/smart-keepalive.sh 2h &
# Arrêter manuellement : kill $(cat /tmp/keepalive.pid)

set -euo pipefail

PING_INTERVAL=240  # 4 minutes — sous le seuil de 5 min de GitHub
LOG_FILE="/tmp/keepalive.log"
PID_FILE="/tmp/keepalive.pid"

# Parse durée (ex: 2h → 7200s, 90m → 5400s)
parse_duration() {
  local input="${1:-2h}"
  local value="${input%[hHmM]}"
  local unit="${input: -1}"
  case "$unit" in
    h|H) echo $(( value * 3600 )) ;;
    m|M) echo $(( value * 60 )) ;;
    *)   echo $(( input * 60 )) ;;  # nombre seul → minutes
  esac
}

MAX_SECONDS=$(parse_duration "${1:-2h}")
MAX_HUMAN="${1:-2h}"

# Éviter deux instances simultanées
if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "⚠️  Keepalive déjà actif (PID $(cat "$PID_FILE")). Arrête-le d'abord :"
  echo "   kill \$(cat $PID_FILE)"
  exit 1
fi

echo $$ > "$PID_FILE"

START=$(date +%s)
END=$(( START + MAX_SECONDS ))

echo "$(date '+%H:%M:%S') ▶ Keepalive démarré — durée max : $MAX_HUMAN" | tee "$LOG_FILE"
echo "$(date '+%H:%M:%S')   Arrêt automatique à $(date -d "@$END" '+%H:%M' 2>/dev/null || date -r "$END" '+%H:%M' 2>/dev/null || echo '?')" | tee -a "$LOG_FILE"
echo "$(date '+%H:%M:%S')   PID $$ — pour arrêter : kill \$(cat $PID_FILE)" | tee -a "$LOG_FILE"

cleanup() {
  rm -f "$PID_FILE"
  echo ""
  echo "$(date '+%H:%M:%S') ■ Keepalive arrêté." | tee -a "$LOG_FILE"
}
trap cleanup EXIT INT TERM

TICK=0
while true; do
  NOW=$(date +%s)
  REMAINING=$(( END - NOW ))

  if [[ $REMAINING -le 0 ]]; then
    echo "$(date '+%H:%M:%S') ⏹  Durée écoulée ($MAX_HUMAN) — arrêt." | tee -a "$LOG_FILE"
    break
  fi

  TICK=$(( TICK + 1 ))
  MINS_LEFT=$(( REMAINING / 60 ))

  # Activité réelle : git status (détecté par GitHub comme activité Codespace)
  git -C "$(dirname "$0")/.." status --short > /dev/null 2>&1 || true

  echo "$(date '+%H:%M:%S') ♥ ping #$TICK — encore ${MINS_LEFT}min" | tee -a "$LOG_FILE"

  sleep "$PING_INTERVAL"
done
