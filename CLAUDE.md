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
├── scripts/                ← scripts et templates Factory
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

### Réévaluation du pipeline à chaque gate (obligatoire)

Avant de présenter chaque gate Y/N à l'utilisateur, l'orchestrateur se pose les 3 questions suivantes :

**1. La complexité a-t-elle changé ?**
Les specs ou l'archi ont-ils révélé une complexité non anticipée au départ (nouvelles intégrations, multi-rôles, volumétrie, etc.) ?
→ Si oui : upgrader le pipeline (ex: passer de "simple" à "complexe", ajouter un module, lancer designer si initialement omis).

**2. Les agents prévus sont-ils encore les bons ?**
Les livrables du gate courant suggèrent-ils qu'un agent différent serait plus pertinent que celui planifié ?
→ Si oui : substituer ou ajouter avant de continuer.

**3. Manque-t-il un agent spécialisé ?**
→ Voir section "Détection de domaine et agents spécialisés" ci-dessous.

Si la réponse à l'une des 3 questions est oui, signaler l'ajustement à l'utilisateur avant de présenter le gate.

---

### Détection de domaine et agents spécialisés

**Déclenchement** : après brainstorm-agent, lire le champ `domaine:` et `agents-specialises-utiles:` de son output.

**Vérification** : lister les agents disponibles dans `.claude/agents/` et comparer avec `agents-specialises-utiles`.

**Si un agent utile manque**, afficher ce signal **avant de lancer specs-framer** :

```
⚠️  Domaine détecté : [domaine / sous-domaine]
    Agents spécialisés utiles : [liste suggérée par brainstorm]
    Agents disponibles dans la Factory : [liste réelle]
    Gap : [nom-agent] n'existe pas.

    Un agent [nom-agent] permettrait de [valeur concrète — ex: "raisonner en termes de
    game loop, économie de jeu et progression plutôt qu'en UX générique"].

    → [A] Continuer avec les agents génériques disponibles
    → [B] Créer [nom-agent] maintenant (expert-claude-code le rédige avec toi, ~5 min)
```

Si l'utilisateur choisit B → lancer `expert-claude-code` pour créer l'agent, puis reprendre le pipeline.
Si l'utilisateur choisit A → noter le gap dans `.factory/<projet>/notes.md` pour une création future.

**Domaines reconnus et agents typiques à suggérer :**

| Domaine | Agents spécialisés utiles |
|---|---|
| jeu-video | game-designer, narrative-writer |
| fintech | compliance-expert, risk-analyst |
| e-commerce | conversion-specialist, catalog-architect |
| sante | regulatory-expert (RGPD santé, HDS) |
| education | pedagogy-designer, curriculum-architect |
| rh | hr-process-expert |
| reseau-social | feed-algorithm-designer, trust-safety-expert |

Ne pas inventer d'agents en dehors de ce tableau sans signal explicite du brainstorm.

---

### Audit continu (expert-claude-code)

L'agent `expert-claude-code` peut être lancé à tout moment pour auditer `.claude/agents/` et `scripts/` :
- Éliminer les doublons de règles entre agents
- Corriger les contradictions
- Signaler les instructions mortes (ex: références à l'ancien create-app.sh)
- Créer de nouveaux agents spécialisés (voir section "Détection de domaine")

Lancer systématiquement après l'ajout de nouveaux agents ou après une refonte du pipeline.

---

### Pré-vérification automatisée (avant Gate 3)

```bash
./scripts/security-check.sh <chemin-du-projet>
```

Vérifie : secrets côté client, `process.env` dans le HTML, appels API directs depuis le frontend, tests stubs, couverture réelle ≥ 75%. Si exit 1 → corriger avant code-reviewer.

---

## Crash-Proof — Résilience aux coupures de session

### Démarrage de session — OBLIGATOIRE

**Avant toute action**, exécuter :

```bash
bash scripts/resume.sh
```

Le script lit les artefacts dans `.factory/<projet>/` et infère l'état du pipeline :

| Artefact présent | Gate atteint | Prochaine étape |
|---|---|---|
| `brainstorm.md` | Gate 0 | specs-framer |
| `specs.md` | Gate 1 | designer / tech-architect |
| `architecture.md` ou `design.md` | Gate 2 | test-writer + code-implementer |
| `apps/<projet>/` avec code | Gate 2+ | code-reviewer + deploy |

Si un projet en cours est détecté, afficher le résumé et demander :
> "📍 Projet [nom] détecté — [gate] ([label]). Prochaine étape : [X]. On reprend ? [Y/N]"

Si Y → lire les artefacts indiqués (specs.md, architecture.md) avant de continuer.
Ne jamais repartir de zéro si des artefacts existent.

### Auto-sauvegarde (hook Stop)

Le hook Stop dans `.claude/settings.json` appelle automatiquement `scripts/autosave.sh`
à chaque fin de réponse. Il crée un commit git silencieux si des changements existent
dans `.factory/`, `apps/`, `scripts/` ou `.claude/`.
