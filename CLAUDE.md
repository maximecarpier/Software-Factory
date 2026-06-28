# Software Factory — Instructions pour Claude

## Contexte

Ce repo est une usine à applications mono-repo. Il contient le dashboard de monitoring Claude
et toutes les applications produites par la Factory.

- **Tokens** : `.env.local` à la racine (gitignored) — GITHUB_TOKEN + VERCEL_TOKEN
- **Vercel org** : `team_jzUtIdasxc8rAZTu9kpaucyL` (maximecarpier)
- **GitHub user** : `maximecarpier`

---

## ARCHITECTURE MONO-REPO (obligatoire)

**Toutes les applications vivent dans ce repo unique, sous `apps/<nom-app>/`.**
Ne jamais créer de nouveau repo GitHub par application — l'ancien workflow multi-repo est abandonné.

```
Software-Factory/
├── apps/
│   ├── dashboard/          ← monitoring Claude tokens
│   ├── mon-mvp/            ← nouvelle app
│   └── autre-app/
├── factory/                ← scripts et templates Factory
├── .claude/agents/         ← définitions des agents
└── .factory/               ← livrables inter-agents (specs, designs, archi)
```

Chaque `apps/<nom>/` est autonome : son propre `package.json`, ses dépendances, son point d'entrée.

---

## Déploiement Vercel — Instructions iPad (manuel)

Pour connecter un nouveau `apps/<nom>/` à Vercel depuis Safari :

1. Aller sur **vercel.com → Add New → Project**
2. Importer le repo `maximecarpier/Software-Factory`
3. Champ **Root Directory** : `apps/<nom-app>/`
4. Framework : Auto-detect (ou préciser si nécessaire)
5. **Environment Variables** : ajouter `GITHUB_TOKEN` (valeur depuis `.env.local`)
6. Cliquer **Deploy**

L'URL générée sera `https://<nom-app>.vercel.app` (ou un slug Vercel si le nom est pris).

Chaque push sur `main` redéploie automatiquement toutes les apps connectées à leur Root Directory respectif.

---

## Dashboard monitoring (apps/dashboard/)

App Express.js qui affiche l'usage des tokens Claude.

```bash
cd apps/dashboard && npm install && npm start   # port 3001
```

Déployée sur : `https://dashboard-usine.vercel.app`

---

## Sécurité

- Les tokens ne vont **jamais** dans `settings.local.json` ni dans un fichier commité
- Stockage local : `.env.local` (gitignored, racine du repo)
- Stockage production : Vercel Environment Variables (configurées manuellement sur iPad)

---

## Orchestration — Règles globales de la Factory

### RÈGLE ANTI-USINE À GAZ (prioritaire sur tout le reste)

Calibrer la lourdeur du processus à la complexité réelle de l'application :

| Complexité | Pipeline |
|---|---|
| Simple (≤ 3 écrans, pas d'API tierce) | brainstorm → specs → tech-architect seul → code-implementer → review → deploy |
| Complexe (API, auth, multi-rôles, data) | Pipeline complet ci-dessous |

Ne jamais lancer designer + tech-architect en parallèle si l'app est simple. Ne jamais découper en modules si le code tient en 1-2 fichiers.

---

### Questions obligatoires avant specs-framer et tech-architect

L'orchestrateur DOIT poser lui-même les questions clés à l'utilisateur **avant** de lancer ces agents — ne jamais leur passer un brief si complet qu'il court-circuite leur Phase Zéro.

**Avant specs-framer**, poser au moins 2 questions parmi :
- Qui sont les utilisateurs et dans quel contexte ?
- Quelles contraintes techniques ou d'intégration ?
- Quels critères de succès mesurables ?

**Avant tech-architect**, poser au moins 2 questions parmi :
- Contraintes de déploiement spécifiques (Vercel serverless, env vars, etc.) ?
- Volumétrie / charge attendue ?
- Systèmes existants à intégrer ou remplacer ?

Ne lancer l'agent qu'après avoir reçu les réponses et les inclure dans le prompt.

---

### Workflow pipeline adaptatif (ordre obligatoire)

```
0. brainstorm-agent  → challenge l'idée + génère idées librement (sans trier)
                                         ↓
   ORCHESTRATEUR     → pose 2 questions clés à l'utilisateur (voir section ci-dessus)
                                         ↓
1. specs-framer      → tri MVP / V2+ avec l'utilisateur + CdC fonctionnel
                       (MVP détaillé + V2+ documentées pour l'archi)
                                         ↓
                     ┌─── [GATE 0 : périmètre MVP validé ? Y/N] ───┐
                     ↓ (oui)                              ↓ (non → ajuster)
                                         ↓
                     ┌─── [GATE 1 : specs validées ? Y/N] ─────────┐
                     ↓ (oui)                              ↓ (non → révision)

     SI SIMPLE                      SI COMPLEXE
         │                    ┌─────────┴──────────┐
         ▼                    ▼                    ▼
  tech-architect         designer             tech-architect    ← PARALLÈLE
      seul               (UI/UX)           (CDC + modules)
         │                    └──── discussion inter-agents ────┘
         │                          dans .factory/<projet>/
         └──────────────────────────────┘
                                         ↓
                     ┌─── [GATE 2 : architecture validée ? Y/N] ───┐
                     ↓ (oui)                              ↓ (non → révision)
3. test-writer (TDD) → tests par module
4. code-implementer  → implémentation par module (parallélisable)
   [+ expert-claude-code en audit continu des configs .factory/]
                                         ↓
                     security-check.sh avant Gate 3
                     ┌─── [GATE 3 : implémentation terminée ? Y/N] ┐
                     ↓ (oui)                              ↓ (non → retour impl.)
5. code-reviewer     → revue + verdict
6. doc-writer        → README + CLAUDE.md de l'app
7. infra-engineer    → déploiement Vercel (instructions iPad si besoin)
```

---

### Discussion inter-agents (cohérence avant Gate 2)

Quand designer et tech-architect travaillent en parallèle, leurs livrables sont déposés dans `.factory/<projet>/` :
- `design.md` — wireframes et système visuel
- `architecture.md` — CDC technique et modules

Avant de présenter Gate 2, l'orchestrateur vérifie la cohérence entre les deux fichiers et signale les divergences à résoudre (ex: composants prévus dans design mais absents de l'archi).

---

### Gates de validation obligatoires

En tant qu'orchestrateur, tu DOIS demander une confirmation explicite (Y/N) à l'utilisateur :

- **Gate 0** — Dans specs-framer, après le tri MVP/V2+ et avant la rédaction du CdC :
  > "✅ MVP : [liste]. V2+ : [liste]. On part sur ce périmètre ? [Y/N]"

- **Gate 1** — Après CdC fonctionnel complet (MVP + V2+ documentées), avant design + archi :
  > "✅ Les specs sont prêtes. Lance-t-on la suite ? [Y/N]"

- **Gate 2** — Après architecture, avant développement :
  > "✅ Architecture validée en [N] modules. Lance-t-on le développement ? [Y/N]"

- **Gate 3** — Après implémentation, avant revue :
  > "✅ Implémentation terminée. Lance-t-on la revue de code ? [Y/N]"

Ne jamais sauter un Gate sans réponse explicite de l'utilisateur.

---

### Parallélisation (P1)

Après Gate 1, si l'app est complexe, lancer **simultanément** :
- `designer` — wireframes et système visuel
- `tech-architect` — CDC technique et découpage modules

Via deux appels `Agent` indépendants dans le même message.

Après Gate 2, si les modules sont disjoints (sans dépendance de code entre eux) :
- N × `code-implementer` en parallèle

---

### Audit continu (expert-claude-code)

L'agent `expert-claude-code` peut être lancé à tout moment pour auditer `.claude/agents/` et `factory/` :
- Éliminer les doublons de règles entre agents
- Corriger les contradictions
- Signaler les instructions mortes (ex: références à l'ancien create-app.sh)

Lancer systématiquement après l'ajout de nouveaux agents ou après une refonte du pipeline.

---

### Pré-vérification automatisée (avant Gate 3)

```bash
./factory/security-check.sh <chemin-du-projet>
```

Vérifie : secrets côté client, `process.env` dans le HTML, appels API directs depuis le frontend, tests stubs, couverture réelle ≥ 75%. Si exit 1 → corriger avant code-reviewer.

---

## Crash-Proof — Résilience aux coupures de session

### Démarrage de session — OBLIGATOIRE

**Avant toute action**, exécuter :

```bash
bash factory/resume.sh
```

Si le fichier `.factory-state.json` existe, afficher le résumé et demander :
> "📍 Session précédente trouvée — Projet : [nom], checkpoint : [gate], module : [M], agent : [A]. On reprend là ? [Y/N]"

Si Y → lire les fichiers de référence indiqués dans `context` (specs.md, architecture.md) avant de continuer.
Ne jamais repartir de zéro si un état valide existe.

### Sauvegarder un checkpoint (aux Gates)

À chaque Gate validé, appeler :

```bash
factory/checkpoint.sh <nom-projet> <gate> [module] [agent-running] [last-action]
```

Exemple :
```bash
factory/checkpoint.sh mon-app gate-2 M2 code-implementer "implémentation module auth"
```

Le script écrit `.factory-state.json` avec le format enrichi :

```json
{
  "project": "<nom-app>",
  "last_checkpoint": "gate-2",
  "timestamp": "2026-06-27T14:30:00Z",
  "last_saved": "2026-06-27T14:30:00Z",
  "current_module": "M2",
  "agent_running": "code-implementer",
  "last_action": "implémentation module auth",
  "files_modified": ["apps/mon-app/src/auth.js"],
  "status": {
    "brainstorm": "done",
    "specs": "done",
    "architecture": "done",
    "modules": ["M1-done", "M2-in-progress", "M3-pending"],
    "review": "pending",
    "deploy": "pending"
  },
  "context": {
    "spec_file": ".factory/<projet>/specs.md",
    "arch_file": ".factory/<projet>/architecture.md",
    "app_path": "apps/<nom-app>/"
  }
}
```

### Auto-sauvegarde (hook Stop)

Le hook Stop dans `.claude/settings.json` appelle automatiquement `factory/autosave.sh`
à chaque fin de réponse. Ce script met à jour `last_saved` et `files_modified` sans
modifier la gate — un commit git silencieux est créé si des changements existent.
