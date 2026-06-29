#!/usr/bin/env bash
# Garde le Codespace éveillé pendant une session remote (Claude iOS, iPad).
# Pingue toutes les 4 min pour rester sous le seuil d'inactivité GitHub (5 min).
#
# Arrêt automatique si AUCUN fichier modifié depuis IDLE_THRESHOLD minutes
# (signal que Claude Code ne travaille plus → session terminée).
#
# Usage  : ./scripts/smart-keepalive.sh [idle_threshold]
#   idle_threshold : minutes sans activité avant arrêt (défaut : 30)
#   ex.  : ./scripts/smart-keepalive.sh 45 &
#
# Arrêt manuel : kill $(cat /tmp/keepalive.pid)
# Logs        : tail -f /tmp/keepalive.log

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PING_INTERVAL_SECS=240          # 4 min — sous le seuil de 5 min GitHub
IDLE_THRESHOLD_MINS="${1:-30}"  # minutes sans modif fichier avant arrêt auto
IDLE_COUNTER_MINS=0

LOG_FILE="/tmp/keepalive.log"
PID_FILE="/tmp/keepalive.pid"
ANCHOR_FILE="/tmp/keepalive_anchor"

# Éviter deux instances simultanées
if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "⚠️  Keepalive déjà actif (PID $(cat "$PID_FILE")). Arrête-le d'abord :"
  echo "   kill \$(cat $PID_FILE)"
  exit 1
fi

echo $$ > "$PID_FILE"
touch "$ANCHOR_FILE"

cleanup() {
  rm -f "$PID_FILE" "$ANCHOR_FILE"
  echo ""
  echo "$(date '+%H:%M:%S') ■ Keepalive arrêté (idle ${IDLE_COUNTER_MINS}min / seuil ${IDLE_THRESHOLD_MINS}min)." | tee -a "$LOG_FILE"
}
trap cleanup EXIT INT TERM

echo "$(date '+%H:%M:%S') ▶ Keepalive démarré — arrêt auto après ${IDLE_THRESHOLD_MINS}min sans activité fichier" | tee "$LOG_FILE"
echo "$(date '+%H:%M:%S')   PID $$ — arrêt manuel : kill \$(cat $PID_FILE)" | tee -a "$LOG_FILE"

TICK=0
while true; do
  # Compte les fichiers modifiés depuis le dernier ping (hors node_modules et .git)
  CHANGES=$(find "$REPO_ROOT/apps" "$REPO_ROOT/scripts" "$REPO_ROOT/.claude" \
    -newer "$ANCHOR_FILE" -type f \
    ! -path "*/node_modules/*" \
    ! -path "*/.git/*" \
    2>/dev/null | wc -l)

  if [[ "$CHANGES" -gt 0 ]]; then
    IDLE_COUNTER_MINS=0
    touch "$ANCHOR_FILE"
  else
    IDLE_COUNTER_MINS=$(( IDLE_COUNTER_MINS + PING_INTERVAL_SECS / 60 ))
  fi

  if [[ "$IDLE_COUNTER_MINS" -ge "$IDLE_THRESHOLD_MINS" ]]; then
    echo "$(date '+%H:%M:%S') 💤 Aucune activité depuis ${IDLE_THRESHOLD_MINS}min — session terminée, arrêt." | tee -a "$LOG_FILE"
    break
  fi

  TICK=$(( TICK + 1 ))
  IDLE_REMAINING=$(( IDLE_THRESHOLD_MINS - IDLE_COUNTER_MINS ))

  # Activité réelle détectée par GitHub
  git -C "$REPO_ROOT" status --short > /dev/null 2>&1 || true

  echo "$(date '+%H:%M:%S') ♥ ping #$TICK — modifs depuis dernier ping: ${CHANGES} — idle: ${IDLE_COUNTER_MINS}min / seuil: ${IDLE_THRESHOLD_MINS}min (arrêt dans ${IDLE_REMAINING}min sans activité)" | tee -a "$LOG_FILE"

  sleep "$PING_INTERVAL_SECS"
done
