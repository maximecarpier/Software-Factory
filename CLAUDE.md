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

### Vercel (option par défaut pour le web) — Déploiement automatique via API

**RÈGLE ABSOLUE : ne jamais donner d'instructions manuelles Vercel à l'utilisateur. Claude fait tout via l'API avec le token disponible dans `.env.local`.**

Séquence de déploiement (via API Vercel, token = `VERCEL_TOKEN` dans `.env.local`) :

```bash
VERCEL_TOKEN=$(grep VERCEL_TOKEN .env.local | cut -d= -f2)
TEAM_ID="team_jzUtIdasxc8rAZTu9kpaucyL"

# 1. Créer le projet lié au repo GitHub
curl -s -X POST "https://api.vercel.com/v10/projects?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"<nom-app>","framework":null,"rootDirectory":"apps/<nom-app>","gitRepository":{"type":"github","repo":"maximecarpier/Software-Factory"}}'

# 2. Déclencher le déploiement production
PROJECT_ID=<prj_xxx>  # récupéré à l'étape 1
COMMIT=$(git rev-parse HEAD)
REPO_ID=1281091420
curl -s -X POST "https://api.vercel.com/v13/deployments?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
  -d "{\"name\":\"<nom-app>\",\"project\":\"$PROJECT_ID\",\"target\":\"production\",\"gitSource\":{\"type\":\"github\",\"repoId\":$REPO_ID,\"ref\":\"main\",\"sha\":\"$COMMIT\"}}"

# 3. Attendre READY (polling toutes les 10s)
```

L'URL de production sera `https://<nom-app>.vercel.app`. Chaque push sur `main` redéploie automatiquement.

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

| Complexité | Mode | Pipeline |
|---|---|---|
| Simple (≤ 3 écrans, pas d'API tierce) | A | brainstorm → specs → tech-architect seul → code-implementer → review → deploy |
| Complexe (API, auth, multi-rôles, data) | A | Pipeline complet ci-dessous |
| UX incertaine / validation visuelle nécessaire | B | Pipeline Prototype UI first (voir section dédiée) |

Ne jamais lancer designer + tech-architect en parallèle si l'app est simple. Ne jamais découper en modules si le code tient en 1-2 fichiers.

---

### Modes de création — Choix du pipeline au démarrage

**Poser ce choix avant specs-framer** si l'utilisateur n'a pas exprimé de préférence :

> "Comment veux-tu démarrer ?
> - **[A] MVP fonctionnel** — on livre quelque chose qui marche end-to-end, par tranches verticales (backend + frontend ensemble). Idéal quand les fonctionnalités sont claires.
> - **[B] Prototype UI d'abord** — on construit une coquille navigable complète (tous les écrans, données hard-codées) pour valider l'UX, puis on câble la logique réelle en V1. Idéal quand l'UX est incertaine ou qu'on veut valider le produit visuellement avant d'investir."

**Signaux qui suggèrent Mode B :**
- "Je veux voir à quoi ça ressemble avant de développer"
- L'app a beaucoup d'écrans interconnectés et la navigation est au cœur de l'UX
- Le projet est à présenter à des parties prenantes avant développement
- L'UX est expérimentale ou non standard

**Signaux qui suggèrent Mode A :**
- Les fonctionnalités sont bien définies et la valeur métier dépend du backend
- App simple (≤ 3 écrans, logique métier claire)
- L'utilisateur veut "quelque chose qui marche" rapidement

---

### Questions obligatoires avant specs-framer et tech-architect

L'orchestrateur DOIT poser lui-même les questions clés à l'utilisateur **avant** de lancer ces agents — ne jamais leur passer un brief si complet qu'il court-circuite leur Phase Zéro.

#### Contraintes fortes — extraction obligatoire avant tout agent

**Avant brainstorm et specs-framer**, identifier et noter explicitement les contraintes non négociables de l'utilisateur. Si elles ne sont pas claires, les demander explicitement :
- Contraintes de contenu (ex : "pas de génération IA", "contenu humain uniquement")
- Contraintes légales ou éthiques
- Contraintes techniques dures (ex : "doit marcher offline", "pas de backend")
- Contraintes utilisateur (ex : "uniquement pour enfants")

Ces contraintes doivent apparaître en tête de **chaque** brief agent sous la section `## CONTRAINTES ABSOLUES` — distincte du reste du contexte pour ne pas être noyées.

**Avant specs-framer**, poser au moins 2 questions parmi :
- Qui sont les utilisateurs et dans quel contexte ?
- Quelles contraintes techniques ou d'intégration ?
- Quels critères de succès mesurables ?

**Avant tech-architect**, poser au moins 2 questions parmi :
- Contraintes de déploiement spécifiques (Vercel serverless, env vars, etc.) ?
- Volumétrie / charge attendue ?
- Systèmes existants à intégrer ou remplacer ?

**Avant designer** (obligatoire — évite un blocage Phase Zéro coûteux) :
- Quel registre visuel ? (ex : sombre/technique, clair/épuré, dark-first, cohérent avec l'existant)
- Quelle cible principale ? (iPhone, tablette, desktop, tous)

Inclure les réponses directement dans le prompt de chaque agent. Ne jamais laisser un agent poser ces questions lui-même — chaque aller-retour coûte ~30K tokens et un délai inutile.

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

### Migration d'app externe (V0-raw → V0 déployée)

Utiliser ce pipeline quand une app a été développée **hors de la Factory** et doit être intégrée dans `apps/<nom>/`.

#### Pipeline de migration

```
PHASE 0 — IMPORT (script bash)
  ./scripts/migrate-app.sh <chemin-source> <nom-app>
    → copie dans apps/<nom>/ (excl. node_modules, .git, dist)
    → crée docs/ si absent
  git add apps/<nom>/ && git commit -m "chore: migrate <nom> V0-raw into mono-repo"

PHASE 1 — REVERSE DOC
  doc-writer (mode reverse)
    → lit apps/<nom>/ et infère docs/specs.md + architecture.md + design.md (V0)
    → chaque fichier taggé "⚠️ V0 inférée — à valider"

  [GATE V0 : "Ces docs reflètent bien l'app ? Y/N + corrections"]
  → si N : doc-writer relancé avec corrections avant de continuer

PHASE 2 — AUDIT
  code-auditor
    → lit code + docs V0 validées
    → produit docs/audit.md (living document)
    → règle migration partielle : signale UNIQUEMENT ce qui est cassé/risqué
    → tout ce qui fonctionne = "CONSERVÉ — OK"
    → pour chaque bloquant : demande Y/N avant toute correction
  security-check.sh

  [GATE AUDIT : "Quels bloquants corriger avant deploy V0 ?"]

PHASE 3 — DEPLOY V0
  infra-engineer → Vercel setup (instructions iPad si besoin)
  git commit -m "chore: V0 deployed — <nom>"
  Mettre à jour le backlog : source = "external", version = "v0"

PHASE 4 — ROADMAP V1 (Factory standard)
  specs-framer (mode update)
    → importe les gaps sélectionnés de audit.md comme features V1
    → pipeline Factory standard reprend ici
```

#### Règles du pipeline migration

- **Migration partielle** : ne changer que ce qui est cassé ou risqué. Demander avant tout changement.
- **GATE V0 obligatoire** : ne jamais lancer code-auditor sans validation des docs inférées.
- **audit.md est vivant** : relancer code-auditor à chaque version (V1, V2…), mettre à jour les statuts.
- **Version et source dans le backlog** : tout projet migré reçoit `source: "external"` et `version: "v0"` dans le backlog.

---

### Mode B — Pipeline Prototype UI first

Ce mode déploie une coquille navigable complète (données hard-codées) avant tout backend, puis évolue vers un MVP fonctionnel en V1.

**Contrainte architecturale obligatoire** : le prototype DOIT avoir ses données **séparées du rendu** — toutes les données factices dans `src/data/fixtures.js` (pas de magic strings dispersés dans les composants). Cela permet le wiring V1 sans réécriture UI.

```
PHASE PROTOTYPE
  0. brainstorm-agent → SESSION INTERACTIVE MULTI-TOURS (idem Mode A)
     L'agent dialogue directement avec l'utilisateur jusqu'au "stop".
  1. specs-framer (mode UI) → CdC axé sur les écrans et parcours utilisateur
                              Pas de specs backend/API à ce stade.
                              V2+ = toutes les fonctionnalités réelles (reportées à Phase V1)
     [GATE 0 : périmètre écrans validé ? Y/N]
     [GATE 1 : specs UI validées ? Y/N]
  2. designer → wireframes de TOUS les écrans prévus
               + note structure composants (contrat données/rendu)
     [GATE 2P : checkpoint wireframes obligatoire]
     > "Ces wireframes couvrent bien tous les écrans ? [Y/N ou corrections]"
     Ne pas lancer code-implementer sans ce Y.
  2b. MINI-BRIEF TECHNIQUE (obligatoire avant code-implementer) :
     Après Gate 2P, l'orchestrateur présente à l'utilisateur et valide :
     - Stack choisie (vanilla JS, React, Vue…) et pourquoi
     - Structure de fichiers prévue
     - Choix techniques notables (ex : TTS via Web Speech API, routing SPA vs multi-page)
     > "Stack : [X]. Structure : [Y]. On part là-dessus ? [Y/N]"
     Ce brief remplace tech-architect en Mode B prototype — il prend 2 lignes, pas 2 agents.
  3. code-implementer (front only) :
     - Tous les écrans du wireframe, navigation complète et fonctionnelle
     - Données hard-codées dans src/data/fixtures.js uniquement
     - Zéro backend, zéro appel API réel
     - Composants découplés des données (props ou état local)
  4. infra-engineer → deploy prototype (Vercel, static)

  [GATE P : "Le prototype valide-t-il l'UX ? [Y/N + retours]"]
    Si N → retour designer (corrections) → code-implementer → re-deploy
    Si Y → Phase V1

PHASE V1 (wiring fonctionnel)
  specs-framer (update) → ajoute specs backend/logique métier depuis retours Gate P
                          Incrémente version : prototype → v1.0
  [GATE 1-V1 : specs V1 validées ? Y/N]
  tech-architect → lit le prototype existant + conçoit le backend
                   → définit les interfaces de données (remplacent fixtures.js)
  [db-architect si entités persistantes hors localStorage]
  [GATE 2-V1 : architecture V1 validée ? Y/N]
  test-writer → tests logique métier + intégration
  code-implementer (wiring) :
    - Remplace fixtures.js par les vraies sources de données
    - Connecte les appels API/BDD
    - Ne touche les composants UI que si les données réelles l'imposent
  doc-writer (sync) → synchronise docs avec le code réel
  security-check.sh
  [GATE 3 : implémentation V1 terminée ? Y/N]
  code-reviewer → revue + verdict
  doc-writer → README + CLAUDE.md
  infra-engineer → deploy V1
  BILAN (obligatoire)
```

**Règles du Mode B :**
- Ne jamais lancer tech-architect avant Gate P — il analyserait un prototype non validé.
- `src/data/fixtures.js` est le contrat entre prototype et wiring — ne jamais disperser les données factices dans les composants.
- Si le wiring révèle des incohérences UI (données réelles ≠ hard-codées), corriger dans le même run code-implementer, pas en tâche séparée.
- Le bilan de la Phase Prototype est optionnel ; le bilan de la Phase V1 est obligatoire.
- resume.sh détecte le Mode B via la présence de `src/data/fixtures.js` sans backend — afficher : "📍 Mode B détecté — Prototype déployé. Gate P atteint ? [Y/N]"

---

### Workflow pipeline adaptatif (ordre obligatoire)

```
0. brainstorm-agent  → SESSION INTERACTIVE MULTI-TOURS (pas un agent en arrière-plan)
                       L'agent dialogue directement avec l'utilisateur :
                       - Pose ses questions une par une ou par groupe
                       - Attend les réponses de l'utilisateur
                       - Rebondit, creuse, challenge, génère de nouvelles pistes
                       - Continue jusqu'à ce que l'utilisateur dise "stop" / "c'est bon"
                       L'orchestrateur NE lance PAS de questions pré-vol avant brainstorm.
                       L'orchestrateur NE résume PAS après brainstorm.
                       C'est l'agent lui-même qui mène le dialogue de bout en bout.
                       → Quand l'utilisateur dit stop : brainstorm synthétise les idées
                         retenues et passe la main à specs-framer.
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
      seul           (snippets HTML         (CDC + modules)
                      dans docs/            analyse snippets
                      design-snippets/)     pour micro-tâches
         │                    └──── discussion inter-agents ────┘
         │                          dans apps/<projet>/docs/
         └──────────────────────────────┘
                                         ↓
                     ┌─── [GATE 2 : architecture validée ? Y/N] ───┐
                     ↓ (oui)                              ↓ (non → révision)
2b. [SI REFONTE UI] checkpoint wireframes obligatoire :
    Résumer les wireframes clés (ASCII ou description) dans la réponse et demander :
    > "Ces wireframes correspondent à ton idée ? [Y/N ou corrections]"
    Ne pas passer à l'étape 3 sans cette validation — un Y/N sur specs textuelles
    ne suffit pas pour du visuel. Intégrer les corrections avant de continuer.
2c. [SI REFONTE UI] test-writer ciblé post-design.md :
    Identifier les éléments DOM supprimés/remplacés par le nouveau design
    (boutons, selects, classes CSS, IDs). Mettre à jour les tests qui les référencent
    AVANT de lancer code-implementer. Évite les cassures en cours d'implémentation.
2d. [SI APP AVEC BDD] db-architect → schéma détaillé + docs/schema.md + canaux inter-agents
    Déclenché si : l'architecture contient des entités persistantes hors localStorage/JSON
                   (SQLite, PostgreSQL, MongoDB, Supabase, Turso, etc.)
    Non déclenché : app localStorage-only, stockage JSON statique, pas de BDD
    Lit : architecture.md section données + [tech-architect → db-architect] dans inter-agent.md
    Produit : docs/schema.md + sections [db-architect → code-implementer] et [db-architect → test-writer]
3. test-writer (TDD) → tests par module
4. code-implementer  → une micro-tâche à la fois (voir protocole ci-dessous)
   [+ expert-claude-code en audit continu des configs agents]
4b. doc-writer (sync) → synchronise specs.md / architecture.md / design.md avec le code réel
                                         ↓
                     security-check.sh avant Gate 3
                     ┌─── [GATE 3 : implémentation terminée ? Y/N] ┐
                     ↓ (oui)                              ↓ (non → retour impl.)
4c. [SI REFONTE UI] /verify obligatoire avant code review :
    Lancer /verify ou /run pour tester le golden path dans le vrai navigateur
    (navigation, création, interactions principales). Ne pas pousser si des bugs
    visuels ou fonctionnels sont détectés. C'est le dernier verrou qualité réel —
    les tests Jest ne couvrent pas le rendu DOM.
5. code-reviewer     → revue + verdict
    Règle effort : diff > 500 lignes OU > 5 fichiers modifiés → /code-review medium minimum.
    /code-review low insuffisant pour une refonte UI complète.
6. doc-writer        → README + CLAUDE.md de l'app
7. infra-engineer    → déploiement Vercel via API (JAMAIS d'instructions manuelles à l'utilisateur — voir section Vercel)
8. BILAN             → obligatoire pour tout processus complexe (voir section ci-dessous)
```

---

### Protocole d'appel de code-implementer (obligatoire)

Après Gate 2, lire la section `## Micro-tâches — Ordre d'exécution` dans `apps/<projet>/docs/architecture.md`.

**Règle : une micro-tâche à la fois, dans l'ordre du tableau.**

#### Création du "pipe" (token-efficient)

Pour chaque micro-tâche T[n], l'orchestrateur construit un contexte minimal avant d'appeler code-implementer :

```
PIPE T[n] :
  1. Spec logique     ← ligne T[n] du tableau + section [tech-architect → code-implementer] d'inter-agent.md
                        + section [db-architect → code-implementer] si Type = "db" ou "back" (accès BDD)
  2. Snippet designer ← lire docs/design-snippets/<snippet>.html si la colonne "Snippet designer" est renseignée
                        (sinon : ne pas joindre de snippet)
  → Transmettre UNIQUEMENT ces éléments à code-implementer
  → Ne pas joindre les specs complètes, architecture.md, schema.md complet ou d'autres snippets non liés à T[n]
  → Vérifier la colonne "Type" : si la tâche T[n] est "front" et qu'une tâche "back" dont elle dépend
    n'est pas COMPLETED dans state.md → NE PAS lancer T[n], corriger l'ordre d'abord
```

Ce principe minimise le contexte de chaque appel et évite que code-implementer ne modifie du code hors périmètre.

```
Pour chaque ligne T[n] du tableau :
  1. Construire le pipe : spec T[n] + snippet designer si applicable
  2. Appeler code-implementer avec ce pipe uniquement
  3. Attendre la complétion
  4. Lire apps/<projet>/docs/inter-agent.md — chercher une section [code-implementer → *]
     - Si [→ tech-architect] : relancer tech-architect avec la question, attendre réponse, puis relancer T[n]
     - Si [→ test-writer]    : relancer test-writer avec la question, attendre réponse, puis relancer T[n]
     - Si [→ orchestrateur]  : redécoupe T[n] en sous-tâches, relancer
     - Si aucun blocage      : passer à T[n+1]
  5. Mettre à jour docs/state.md : T[n] → COMPLETED + delta technique (1-2 lignes max)
```

Ne jamais envoyer plusieurs micro-tâches en un seul appel à code-implementer.
Ne jamais passer à T[n+1] sans avoir vérifié inter-agent.md après T[n].

**Règle micro-tâches triviales** : si une tâche représente < 5 lignes de diff et ne contient
pas de logique métier, la grouper avec une autre tâche de même nature dans le même appel agent.
Seuil de regroupement : cumul ≤ 3 fichiers ET ≤ 15 lignes → 1 seul agent.
Exemple : changements de config (manifest, index.html, meta tags) = 1 tâche, pas 3.

---

### Token Diet — Discipline du contexte (obligatoire)

L'orchestrateur est responsable de la santé de la fenêtre de contexte. Ces règles s'appliquent à toutes les sessions et à tous les appels d'agents.

#### Règle 1 — Lecture ciblée du code source

Préférer la lecture ciblée à la lecture intégrale pour les fichiers de code (`.js`, `.ts`, `.html`, `.css`, `.py`…) :

| Besoin | Outil recommandé |
|---|---|
| Trouver une fonction | `grep -n "nomFonction" fichier.js` |
| Lire un bloc précis | `Read` avec `offset` + `limit` |
| Comprendre la structure | `grep -n "^function\|^const \|^class\|^export"` |
| Diff récent | `git diff HEAD -- fichier.js` |

**Exception** : les fichiers `.md` (specs, architecture, design) peuvent être lus en entier pour garder la vision globale.

#### Règle 2 — Briefs enclavés pour les sous-agents

Chaque appel à un sous-agent reçoit **uniquement** ce dont il a besoin pour sa micro-tâche :
- La spec de T[n] (ligne du tableau architecture.md)
- Le snippet designer si applicable
- Les directives `[tech-architect → code-implementer]` d'inter-agent.md
- Les directives `[db-architect → code-implementer]` si T[n] touche la couche données

**Interdiction d'injecter** : l'historique du chat, specs.md complet, architecture.md complet, ou le contexte de tâches déjà validées.

#### Règle 3 — Registre d'état par projet (`docs/state.md`)

Créer `apps/<projet>/docs/state.md` à Gate 2 depuis `scripts/templates/state.md`.

Après chaque T[n] validé, l'orchestrateur met à jour `state.md` :
- Marquer T[n] `COMPLETED`
- Écrire 1-2 lignes dans "Dernier incrément" (fichiers touchés, comportement validé)
- Effacer le détail des incréments précédents (garder seulement le dernier)

`state.md` est le point d'entrée de reprise — il évite de relire architecture.md en entier.

#### Règle 4 — Signal de nettoyage

Si la session dépasse ~10 échanges depuis le dernier Gate, terminer la réponse par :
> 🧹 **`state.md` mis à jour. Tape `/compact` si le contexte est lourd avant la prochaine tâche.**

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

## [tech-architect → db-architect]
> Gate 2 — YYYY-MM-DD
- Entités / relations brutes : [User(id, email), Project(id, userId), Task(id, projectId, statut)]
- Moteur BDD retenu : SQLite (< 10k records, Vercel hobby)
- Features V2+ impactant le schéma : [export CSV → pas d'impact, filtres avancés → index sur statut]

## [tech-architect → code-implementer]
> Gate 2 — YYYY-MM-DD
- Interface commune : `Item { id, type, titre, statut, priorite, projectId }`
- M1 (API) à finaliser avant M2 (UI).

## [tech-architect → test-writer]
> Gate 2 — YYYY-MM-DD
- Redis down → retourner 503, pas liste vide.

## [db-architect → code-implementer]
> Post-Gate 2 — YYYY-MM-DD
- Schéma final : voir docs/schema.md
- Moteur : SQLite — fichier : `data/app.db`
- ORM : Knex 3.x
- Points de vigilance : [FK explicites obligatoires, PRAGMA foreign_keys=ON à activer, index créé après CREATE TABLE]

## [db-architect → test-writer]
> Post-Gate 2 — YYYY-MM-DD
- Contraintes à tester : [UNIQUE sur email → 409, FK violation → 400, NOT NULL → 400]
- Seeds de test : voir docs/schema.md section "Données de seed"

## [test-writer → code-implementer]
> TDD — YYYY-MM-DD
- Spec §3 ambiguë : "priorite" absente → 400 ou valeur par défaut ?

## [code-implementer → tech-architect]
> Blocage T[n] — YYYY-MM-DD
- Interface attendue mais absente : [nom du type/export]
- Action requise : définir le contrat avant de relancer T[n]

## [code-implementer → test-writer]
> Blocage T[n] — YYYY-MM-DD
- Test en échec : [nom, fichier]
- Doute sur le test (pas le code) : [raisonnement]
- Action requise : valider ou corriger la spec

## [code-implementer → orchestrateur]
> Blocage T[n] — YYYY-MM-DD
- Raison : tâche dépasse 2 fichiers / périmètre trop large
- Micro-tâches suggérées : [liste]
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

L'agent `expert-claude-code` audite **toutes les couches de configuration** de la Factory :

| Couche | Fichiers |
|---|---|
| Agents | `.claude/agents/*.md` |
| Scripts | `scripts/*.sh` |
| Instructions projet | `CLAUDE.md` |
| Mémoire persistante | `memory/*.md` (projet + utilisateur) |
| Configuration Claude Code | `.claude/settings.json`, settings globaux |
| Bilans de sessions | `apps/*/docs/bilan-*.md` |

**Checks prioritaires :**
- P1 — Contradictions inter-couches (mémoire ↔ CLAUDE.md, bilan ↔ agent, etc.)
- P2 — Doublons et gonflement entre agents
- P3 — Instructions mortes (fichiers supprimés, workflows abandonnés)
- P4 — Calibrage modèles et qualité des règles

**Déclencher après :** ajout d'agent, session bilan, refonte pipeline, ou quand un comportement inattendu suggère une incohérence de config.

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

### Bilan de pipeline (obligatoire pour tout processus complexe)

**Déclenchement** : après toute opération complexe liée à une application.
Types couverts : `création` | `feature` | `bug` | `refonte` | `itération V2+`
Non déclenché : corrections < 10 lignes, mises à jour config, tâches triviales (< 3 agents mobilisés).

**Timing** : immédiatement après step 7 (deploy), ou après Gate 3 si déploiement différé.

**Fichier** : `apps/<projet>/docs/bilan-<YYYY-MM-DD>-<type>.md`

**Template obligatoire :**

```markdown
# Bilan — [type] [nom-projet] — [YYYY-MM-DD]

## Consommation tokens
| Métrique | Valeur |
|---|---|
| Total session | [résultat de /cost — lancer juste avant de rédiger] |
| Durée | [heure début → heure fin] |

## Workflow agentique
| Ordre | Agent | Nb appels | Observations |
|---|---|---|---|
| 1 | brainstorm-agent | 1 | — |
| 2 | specs-framer | 2 | 1 relance après Gate 0 |
| 3 | designer + tech-architect | 1 chacun (parallèle) | — |
| … | … | … | … |

## Consommation estimée par agent
Estimation basée sur nb appels × complexité perçue (heavy ≈ 40K tokens, medium ≈ 20K, light ≈ 8K).
| Agent | Nb appels | Complexité | % estimé du total |
|---|---|---|---|
| code-implementer | 8 | heavy | ~45% |
| designer | 1 | medium | ~10% |
| … | … | … | … |

## ✅ Ce qui s'est bien passé
- [workflow fluide, sans retour en arrière]
- [gate passé du premier coup]

## ❌ Ce qui ne s'est pas bien passé
- [blocage inter-agents — impact : X appels en plus]
- [spec ambiguë détectée en implémentation — impact : relance tech-architect]
- [bug post-deploy — impact : cycle supplémentaire]

## 🔧 Plan d'amélioration
| Problème | Cause racine | Action corrective | Priorité |
|---|---|---|---|
| [problème 1] | [cause] | [règle CLAUDE.md à modifier / agent à créer / étape à ajouter] | haute |
| [problème 2] | [cause] | [action concrète] | moyenne |
```

**Règles de rédaction :**
- Lancer `/cost` juste avant de rédiger pour capturer le total de session
- La consommation par agent est une estimation — la noter honnêtement comme telle
- "Ce qui s'est bien passé" = moments fluides, gates passés du premier coup, agents qui n'ont pas eu besoin d'une relance
- "Ce qui ne s'est pas bien passé" = blocages, relances imprévues, gates ratés, ambiguïtés specs, bugs post-deploy
- Le plan d'amélioration doit être **actionnable** : nommer la règle CLAUDE.md à modifier, l'agent à créer, ou l'étape à ajouter — pas de généralités

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
