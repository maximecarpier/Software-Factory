#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# Software Factory — migrate-app.sh
# Usage : ./scripts/migrate-app.sh <chemin-source> <nom-app>
#
# Importe une app externe dans apps/<nom-app>/ du mono-repo.
# Ne commit pas automatiquement — vérifie les fichiers avant de committer.
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

SOURCE="${1:-}"
NOM_APP="${2:-}"

red()   { echo -e "\033[0;31m$*\033[0m"; }
green() { echo -e "\033[0;32m$*\033[0m"; }
yellow(){ echo -e "\033[0;33m$*\033[0m"; }
bold()  { printf "\033[1m%s\033[0m\n" "$*"; }

echo "═══════════════════════════════════════════════"
bold "  MIGRATION — Software Factory"
echo "═══════════════════════════════════════════════"

# Validation des arguments
if [ -z "$SOURCE" ] || [ -z "$NOM_APP" ]; then
  red "Usage : ./scripts/migrate-app.sh <chemin-source> <nom-app>"
  red "Exemple : ./scripts/migrate-app.sh ~/mes-projets/mon-app mon-app"
  exit 1
fi

# Vérifier qu'on est bien à la racine du repo
if [ ! -f "CLAUDE.md" ]; then
  red "Erreur : lance ce script depuis la racine du repo Software-Factory."
  exit 1
fi

if [ ! -d "$SOURCE" ]; then
  red "Erreur : le dossier source '$SOURCE' n'existe pas."
  exit 1
fi

DEST="apps/$NOM_APP"

if [ -d "$DEST" ]; then
  red "Erreur : $DEST existe déjà. Choisis un autre nom ou supprime le dossier."
  exit 1
fi

echo ""
echo "  Source  : $SOURCE"
echo "  Dest    : $DEST"
echo ""

# Copie des fichiers (excl. artéfacts non nécessaires)
echo "→ Copie des fichiers..."
mkdir -p "$DEST"
rsync -a \
  --exclude='node_modules/' \
  --exclude='.git/' \
  --exclude='dist/' \
  --exclude='.next/' \
  --exclude='build/' \
  --exclude='*.pyc' \
  --exclude='__pycache__/' \
  --exclude='.DS_Store' \
  --exclude='.env' \
  --exclude='.env.local' \
  "$SOURCE/" "$DEST/"

# Créer la structure Factory si absente
if [ ! -d "$DEST/docs" ]; then
  echo "→ Création de $DEST/docs/ (structure Factory)"
  mkdir -p "$DEST/docs"
fi

# Compter les fichiers copiés
NB_FICHIERS=$(find "$DEST" -type f | wc -l | tr -d ' ')

echo ""
green "✅ Migration terminée : $NB_FICHIERS fichiers copiés dans $DEST"
echo ""
echo "═══════════════════════════════════════════════"
bold "  PROCHAINES ÉTAPES (pipeline migration)"
echo "═══════════════════════════════════════════════"
echo ""
echo "  1. Vérifier les fichiers copiés :"
echo "     ls $DEST/"
echo ""
echo "  2. Committer la migration brute (V0-raw) :"
echo "     git add $DEST/"
echo "     git commit -m \"chore: migrate $NOM_APP V0-raw into mono-repo\""
echo ""
echo "  3. Lancer doc-writer en mode reverse :"
echo "     → Demander à l'orchestrateur :"
echo "       \"Lance doc-writer mode reverse sur apps/$NOM_APP/\""
echo ""
echo "  4. GATE V0 — valider les docs inférées (Y/N + corrections)"
echo ""
echo "  5. Lancer code-auditor :"
echo "     → Demander à l'orchestrateur :"
echo "       \"Lance code-auditor sur apps/$NOM_APP/\""
echo ""
echo "  6. GATE AUDIT — prioriser les bloquants"
echo ""
echo "  7. Deploy V0 via infra-engineer (Vercel)"
echo ""
