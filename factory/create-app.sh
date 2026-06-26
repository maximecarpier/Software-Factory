#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# Software Factory — create-app.sh
# Usage : ./factory/create-app.sh <nom-app> [description]
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_NAME="${1:-}"
APP_DESC="${2:-$APP_NAME}"

if [[ -z "$APP_NAME" ]]; then
  echo "Usage: $0 <nom-app> [description]"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES_DIR="$SCRIPT_DIR/templates"
ENV_FILE="$SCRIPT_DIR/../dashboard/.env.local"
WORK_DIR="/tmp/$APP_NAME"
VERCEL_ORG_ID="team_jzUtIdasxc8rAZTu9kpaucyL"
GITHUB_USER="maximecarpier"

# ─── Chargement des tokens ────────────────────────────────────────────
if [[ -f "$ENV_FILE" ]]; then
  set -a; source "$ENV_FILE"; set +a
fi

: "${GITHUB_TOKEN:?GITHUB_TOKEN manquant — vérifier dashboard/.env.local}"
: "${VERCEL_TOKEN:?VERCEL_TOKEN manquant — vérifier dashboard/.env.local}"

VERCEL_PROJECT_NAME=$(echo "$APP_NAME" | tr '[:upper:]' '[:lower:]' | tr '_' '-')

echo "▶ Création de l'app : $APP_NAME"

# ─── Dossier de travail ───────────────────────────────────────────────
rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR/.github/workflows" "$WORK_DIR/.vercel"

# ─── Copie des templates ──────────────────────────────────────────────
cp "$TEMPLATES_DIR/.gitignore" "$WORK_DIR/"
cp "$TEMPLATES_DIR/.github/workflows/vercel-deploy.yml" "$WORK_DIR/.github/workflows/"

# ─── Git init ─────────────────────────────────────────────────────────
cd "$WORK_DIR"
git init
git config user.name "$GITHUB_USER"
git config user.email "lamaxticots@gmail.com"

# ─── Repo GitHub ──────────────────────────────────────────────────────
echo "▶ Création du repo GitHub : $GITHUB_USER/$APP_NAME"
GITHUB_TOKEN="$GITHUB_TOKEN" gh repo create "$GITHUB_USER/$APP_NAME" \
  --public --description "$APP_DESC" 2>&1

# ─── Projet Vercel ────────────────────────────────────────────────────
echo "▶ Création du projet Vercel : $VERCEL_PROJECT_NAME"
VERCEL_RESPONSE=$(curl -s -X POST \
  "https://api.vercel.com/v10/projects?teamId=$VERCEL_ORG_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$VERCEL_PROJECT_NAME\",
    \"framework\": null,
    \"buildCommand\": \"npm run vercel-build\",
    \"installCommand\": \"npm install\",
    \"gitRepository\": {
      \"type\": \"github\",
      \"repo\": \"$GITHUB_USER/$APP_NAME\"
    }
  }")

VERCEL_PROJECT_ID=$(echo "$VERCEL_RESPONSE" | python3 -c \
  "import json,sys; d=json.load(sys.stdin); print(d.get('id','')) if 'id' in d else (print('ERREUR:',json.dumps(d)) or exit(1))")

echo "  Project ID : $VERCEL_PROJECT_ID"

# ─── .vercel/project.json ─────────────────────────────────────────────
cat > "$WORK_DIR/.vercel/project.json" <<EOF
{
  "projectId": "$VERCEL_PROJECT_ID",
  "orgId": "$VERCEL_ORG_ID"
}
EOF

# ─── GitHub Secrets ───────────────────────────────────────────────────
echo "▶ Configuration des GitHub Secrets"
GITHUB_TOKEN="$GITHUB_TOKEN" gh secret set VERCEL_TOKEN \
  --body "$VERCEL_TOKEN" -R "$GITHUB_USER/$APP_NAME"
GITHUB_TOKEN="$GITHUB_TOKEN" gh secret set VERCEL_ORG_ID \
  --body "$VERCEL_ORG_ID" -R "$GITHUB_USER/$APP_NAME"
GITHUB_TOKEN="$GITHUB_TOKEN" gh secret set VERCEL_PROJECT_ID \
  --body "$VERCEL_PROJECT_ID" -R "$GITHUB_USER/$APP_NAME"

# ─── Vercel env vars ──────────────────────────────────────────────────
echo "▶ Configuration des variables d'environnement Vercel"
curl -s -X POST \
  "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_ORG_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"key\": \"GITHUB_TOKEN\",
    \"value\": \"$GITHUB_TOKEN\",
    \"type\": \"sensitive\",
    \"target\": [\"production\", \"preview\"]
  }" > /dev/null

# ─── Commit initial & push ────────────────────────────────────────────
echo "▶ Push initial"
git add -A
git commit -m "Initial commit — $APP_NAME"
git remote add origin "https://$GITHUB_TOKEN@github.com/$GITHUB_USER/$APP_NAME.git"
git push -u origin main

echo ""
echo "✓ App '$APP_NAME' prête !"
echo "  GitHub : https://github.com/$GITHUB_USER/$APP_NAME"
echo "  Vercel : https://$VERCEL_PROJECT_NAME.vercel.app"
echo ""
echo "  Ajoute ton code dans : $WORK_DIR/"
echo "  Puis : cd $WORK_DIR && git add -A && git commit -m '...' && git push"
