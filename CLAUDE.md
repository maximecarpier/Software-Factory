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
│   ├── mon-mvp/
│   │   ├── docs/           ← specs.md, architecture.md, design.md
│   │   ├── src/
│   │   ├── tests/
│   │   └── package.json
│   └── autre-app/
├── scripts/                ← scripts et templates Factory
└── .claude/agents/         ← définitions des agents
```

Chaque `apps/<nom>/` est autonome : son propre `package.json`, ses dépendances, son point d'entrée.

---

## Déploiement — Liberté et pragmatisme

**Aucun hébergeur n'est imposé.** La règle est : **gratuit et simple en premier**.

### Règle infra (obligatoire pour tech-architect)

Stack libre, préférence : léger, web-first, bien rendu sur mobile/tablette (responsive ou PWA — pas de natif iOS/Android).
Toujours proposer l'option la plus simple et gratuite (Vercel hobby, SQLite, localStorage, fichiers JSON...).
Si une option payante ou complexe est nécessaire → présenter les alternatives avec coût/complexité et **valider avec l'utilisateur** avant de l'inclure dans l'architecture.

### Vercel (option par défaut pour le web) — Instructions iPad (manuel)

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

### Versionnage des apps (V1 → V2+)

**Un seul fichier vivant** : `docs/specs.md` évolue en place à chaque itération. Pas de `specs_v2.md` — le git log assure la traçabilité.

#### Structure obligatoire du changelog en tête de specs.md

```markdown
## Changelog
| Version | Date | Changements |
|---|---|---|
| v2.0 | 2026-07-01 | Ajout F4 (export CSV), F5 (filtres avancés) |
| v1.0 | 2026-06-27 | MVP initial — F1, F2, F3 |
```

#### Règles de mise à jour

- **Lancer une itération V2+** : specs-framer lit `specs.md` existant, sélectionne les features V2+ à activer, les déplace dans la section MVP, incrémente la version, ajoute une ligne de changelog
- **Section V2+** : les features activées disparaissent de V2+, les restantes demeurent
- **architecture.md** suit le même principe (un fichier, changelog en tête)
- **design.md** idem si l'UI est impactée

#### Pipeline pour une itération V2+

Le brainstorm est **optionnel** si les features V2+ sont déjà dans la roadmap de specs.md. Le pipeline démarre directement à specs-framer en mode "mise à jour" :

```
specs-framer (update) → sélectionne features V2+ à activer
                       → met à jour specs.md (version + changelog + sections)
                                    ↓
                 [GATE 1 : specs V2 validées ? Y/N]
                                    ↓
         tech-architect (update)  ±  designer (update si UI impactée)
                                    ↓
                 [GATE 2 : architecture V2 validée ? Y/N]
                                    ↓
         test-writer → code-implementer → doc-writer sync → code-reviewer → doc-writer
```

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
         │                          dans apps/<projet>/docs/
         └──────────────────────────────┘
                                         ↓
                     ┌─── [GATE 2 : architecture validée ? Y/N] ───┐
                     ↓ (oui)                              ↓ (non → révision)
3. test-writer (TDD) → tests par module
4. code-implementer  → implémentation par module (parallélisable)
   [+ expert-claude-code en audit continu des configs agents]
4b. doc-writer (sync) → synchronise specs.md / architecture.md / design.md avec le code réel
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

Les agents communiquent via `apps/<projet>/docs/inter-agent.md` — canal partagé structuré par sections.

**Format du fichier :**
```markdown
## [designer → tech-architect]
> Round 1 — YYYY-MM-DD
- La sidebar est fixe (sticky). Compatible plan Vercel hobby ?

## [tech-architect → designer]
> Round 1 — YYYY-MM-DD
- Auth via cookies HTTP-only — prévoir état visuel si session expirée.

## [tech-architect → code-implementer]
> Gate 2 — YYYY-MM-DD
- Interface commune : `Item { id, type, titre, statut, priorite, projectId }`
- M1 (API) à finaliser avant M2 (UI).

## [tech-architect → test-writer]
> Gate 2 — YYYY-MM-DD
- Redis down → retourner 503, pas liste vide.

## [test-writer → code-implementer]
> TDD — YYYY-MM-DD
- Spec §3 ambiguë : "priorite" absente → 400 ou valeur par défaut ?
```

**Rôle de l'orchestrateur — relay en 2 rounds :**

- **Round 1** : lancer designer + tech-architect en parallèle. Chacun écrit sa section dans `inter-agent.md`.
- **Relay** : lire `inter-agent.md`, extraire les questions croisées, relancer chaque agent avec les questions de l'autre (second appel Agent avec le fichier en contexte).
- **Gate 2** : vérifier que toutes les questions dans `inter-agent.md` ont une réponse avant de valider.

Si aucune question croisée après Round 1 → pas de Round 2, passer directement à Gate 2.

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
Si l'utilisateur choisit A → noter le gap dans `apps/<projet>/docs/notes.md` pour une création future.

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

### Cohérence documentation-code (obligatoire)

**Le code est la source de vérité.** Si l'implémentation s'écarte de la doc, c'est la doc qui doit être corrigée — jamais l'inverse.

**Déclenchement** : après chaque run de `code-implementer` (étape 4b), avant de présenter Gate 3.

**L'orchestrateur lance doc-writer en mode sync** avec pour mission :
1. Lire `apps/<projet>/docs/specs.md`, `architecture.md`, `design.md`
2. Lire le code produit dans `apps/<projet>/src/`
3. Identifier les divergences (module supprimé, API renommée, composant substitué, modèle de données modifié, bibliothèque changée)
4. Mettre à jour les docs pour qu'elles reflètent ce qui est réellement construit

**Divergences typiques à corriger :**
- Un module planifié a été simplifié ou fusionné avec un autre → mettre à jour architecture.md
- Une route API a changé de nom ou de signature → mettre à jour architecture.md et specs.md
- Un composant UI a été remplacé par une approche différente → mettre à jour design.md
- Une dépendance a été substituée → mettre à jour architecture.md

Si aucune divergence : doc-writer le note explicitement et passe la main.

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

Le script lit les artefacts dans `apps/<projet>/docs/` et infère l'état du pipeline :

| Artefact présent | Gate atteint | Prochaine étape |
|---|---|---|
| `docs/brainstorm.md` | Gate 0 | specs-framer |
| `docs/specs.md` | Gate 1 | designer / tech-architect |
| `docs/architecture.md` ou `docs/design.md` | Gate 2 | test-writer + code-implementer |
| `src/` avec code | Gate 2+ | code-reviewer + deploy |

Si un projet en cours est détecté, afficher le résumé et demander :
> "📍 Projet [nom] détecté — [gate] ([label]). Prochaine étape : [X]. On reprend ? [Y/N]"

Si Y → lire les artefacts indiqués (specs.md, architecture.md) avant de continuer.
Ne jamais repartir de zéro si des artefacts existent.

### Auto-sauvegarde (hook Stop)

Le hook Stop dans `.claude/settings.json` appelle automatiquement `scripts/autosave.sh`
à chaque fin de réponse. Il crée un commit git silencieux si des changements existent
dans `apps/`, `scripts/` ou `.claude/`.
