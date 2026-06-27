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

---

## Orchestration — Règles globales de la Factory

### Workflow pipeline (ordre obligatoire)

```
1. specs-framer      → Phase Zéro (Q/R) → CdC fonctionnel
                                              ↓
                        ┌─── [GATE 1 : Y/N] ──────────────────┐
                        ↓ (oui)                                 ↓ (non → retour specs)
2a. designer         2b. tech-architect     ← PARALLÈLE ──────┘
    (UI/UX)              (CDC technique + modules)
                        ↓
                        ┌─── [GATE 2 : Y/N] ──────────────────┐
                        ↓ (oui)                                 ↓ (non → révision archi)
3. test-writer (TDD) → tests par module
4. code-implementer  → implémentation par module (parallélisable)
                        ↓
                        ┌─── [GATE 3 : Y/N] ──────────────────┐
                        ↓ (oui)                                 ↓ (non → retour impl.)
5. code-reviewer     → revue + verdict
6. doc-writer        → README + CLAUDE.md
```

### Pré-vérification automatisée (avant Gate 3)

Avant de lancer `code-reviewer`, exécuter le script de sécurité :

```bash
./factory/security-check.sh <chemin-du-projet>
```

Ce script vérifie automatiquement : secrets côté client, `process.env` dans le HTML, appels API directs depuis le frontend, tests stubs, couverture réelle ≥ 75%. Si exit 1, corriger avant d'appeler code-reviewer.

### Gates de validation obligatoires

En tant qu'orchestrateur, tu DOIS demander une confirmation explicite (Y/N) à l'utilisateur :

- **Gate 1** — Après validation du CdC fonctionnel, avant de lancer design + architecture :
  > "✅ Les specs sont prêtes. Lance-t-on design + architecture en parallèle ? [Y/N]"

- **Gate 2** — Après validation du CDC technique et de la décomposition modules, avant implémentation :
  > "✅ L'architecture est validée en [N] modules indépendants. Lance-t-on le développement ? [Y/N]"

- **Gate 3** — Après l'implémentation, avant la revue finale :
  > "✅ L'implémentation est terminée. Lance-t-on la revue de code ? [Y/N]"

Ne jamais sauter un Gate sans réponse explicite de l'utilisateur.

### Parallélisation (P1)

Dès que les specs fonctionnelles sont validées (Gate 1 passé), lancer **simultanément** :
- `designer` — wireframes et système visuel
- `tech-architect` — CDC technique et découpage modules

Ces deux agents s'exécutent en parallèle via des appels `Agent` indépendants dans le même message.

### Développement modulaire (P1)

Le découpage produit par `tech-architect` définit des modules indépendants. Chaque module est développé par un agent `code-implementer` séparé. Les appels peuvent être parallélisés si les modules n'ont aucune dépendance de code entre eux (uniquement des contrats d'interface).

---

## Crash-Proof — Résilience aux coupures de session

### Sauvegarder un checkpoint

À chaque Gate validé, l'orchestrateur doit :

1. **Écrire le fichier d'état** `.factory-state.json` à la racine :

```json
{
  "project": "<nom-app>",
  "last_checkpoint": "gate-2",
  "timestamp": "2026-06-27T14:30:00Z",
  "status": {
    "specs": "done",
    "design": "done",
    "architecture": "done",
    "modules": ["M1-done", "M2-in-progress", "M3-pending"],
    "review": "pending",
    "deploy": "pending"
  },
  "context": {
    "spec_file": "<chemin vers le CdC>",
    "arch_file": "<chemin vers le CDC technique>",
    "current_module": "M2"
  }
}
```

2. **Commit Git local de sauvegarde** :
```bash
git add .factory-state.json
git commit -m "checkpoint: gate-2 validé — M1 done, M2 in-progress"
```

### Reprendre après une déconnexion

Au démarrage d'une nouvelle session, **avant toute action**, lire `.factory-state.json` s'il existe :

```bash
cat .factory-state.json 2>/dev/null
```

Si le fichier existe, afficher l'état et proposer de reprendre :
> "📍 Session précédente trouvée — Projet : [nom], checkpoint : [gate], module courant : [M]. On reprend là ? [Y/N]"

Ne jamais repartir de zéro si un état valide existe.

### Script helper

```bash
# Sauvegarder un checkpoint (usage interne orchestrateur)
factory/checkpoint.sh <nom-projet> <gate> <module-courant>
```
