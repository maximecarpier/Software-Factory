# Software Factory — Instructions pour Claude

## Contexte
Ce repo est une usine à applications. Il contient le dashboard de monitoring Claude
et les outils pour créer et déployer de nouvelles apps en autonomie.

- **Tokens** : `.env.local` à la racine (gitignored) — GITHUB_TOKEN + VERCEL_TOKEN
- **Vercel org** : `team_jzUtIdasxc8rAZTu9kpaucyL` (maximecarpier)
- **GitHub user** : `maximecarpier`

---

## Créer une nouvelle application

```bash
chmod +x factory/create-app.sh
./factory/create-app.sh <nom-app> "<description>"
```

Le script fait **tout** de manière autonome :
1. Crée le repo GitHub `maximecarpier/<nom-app>` (public)
2. Copie les templates (workflow CI/CD Vercel, .gitignore)
3. Crée le projet Vercel lié au repo
4. Configure les 3 GitHub Secrets (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID)
5. Configure GITHUB_TOKEN comme env var sur Vercel
6. Push initial → déploiement automatique

Résultat : l'app est disponible sur `https://<nom-app>.vercel.app`

### Ajouter du code après création
```bash
cd /tmp/<nom-app>
# ajouter server.js, public/, package.json, etc.
git add -A && git commit -m "feat: ..." && git push
```
Chaque push sur `main` redéploie automatiquement sur Vercel.

---

## Workflow de déploiement Vercel (déjà configuré sur chaque app)

Le template `factory/templates/.github/workflows/vercel-deploy.yml` utilise
la **Vercel CLI** directement (pas BetaHuhn — incompatible Node 24).

```yaml
run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }} --yes
```

---

## Dashboard monitoring (dashboard/)

App Express.js qui affiche l'usage des tokens Claude.

```bash
cd dashboard && npm install && npm start   # port 3001
```

Déployée sur : `https://dashboard-usine.vercel.app`
Repo dédié : `https://github.com/maximecarpier/Dashboard_usine`

---

## Sécurité

- Les tokens ne vont **jamais** dans `settings.local.json` ni dans un fichier commité
- Stockage local : `dashboard/.env.local` (gitignored)
- Stockage CI/CD : GitHub Secrets (configurés par le script)
- Stockage production : Vercel Environment Variables (configurés par le script)

---

## Renouveler les tokens

Si les tokens expirent, mettre à jour `dashboard/.env.local` puis relancer
`factory/create-app.sh` sur les nouvelles apps. Pour les apps existantes,
mettre à jour les secrets GitHub manuellement ou via :

```bash
source dashboard/.env.local
gh secret set VERCEL_TOKEN --body "$VERCEL_TOKEN" -R maximecarpier/<app>
gh secret set GITHUB_TOKEN --body "$GITHUB_TOKEN" -R maximecarpier/<app>
```
