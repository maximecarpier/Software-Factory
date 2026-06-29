# CDC Technique — factory-dashboard

**Version** : 2.0
**Date** : 2026-06-29
**Statut** : Gate 2 — support offline (v2.0)
**Auteur** : tech-architect
**Projet** : `apps/factory-dashboard/`
**Specs source** : `apps/factory-dashboard/docs/specs.md`

---

## Changelog

### v2.0 — 2026-06-29 — Support offline complet
- **Nouveau** : stratégie offline-first documentée (§9). Mutations possibles hors-ligne, file d'attente `factory_pending` en localStorage, flush automatique au retour réseau.
- **Nouveau module** : `src/sync.js` (file d'attente + `flushPending()` + helpers réseau).
- **Modifié** : `src/store.js` expose désormais `add()` **et** `update()` qui enfilent les mutations ; `fetchFromGitHub()`/`pushToGitHub()` documentés comme couche de sync Redis.
- **Modifié** : `src/main.js` enregistre le listener `online` et applique la séquence de boot **flush-puis-fetch**.
- **Modifié** : `src/components/nav.js` affiche un badge « Hors ligne » piloté par les events `online`/`offline`.
- **Correction de doc** : la section Stack (§2) décrivait à tort une persistance « localStorage uniquement, aucun backend ». Le vrai état est **localStorage (cache) + Redis (Upstash) via la serverless function `api/backlog.js`**. La doc v1.0 était en retard sur le code.

### v1.0 — 2026-06-27 — Architecture initiale
- SPA Vite + Vanilla JS, 2 vues, persistance localStorage (avant ajout de la couche Redis).

---

## 0. Résumé exécutif

`factory-dashboard` est une **SPA Vite + Vanilla JS** de gestion de backlog (projets / features) pour un usage **solo**. Elle suit un modèle **offline-first à deux couches** :

1. **localStorage** = source de vérité locale et cache de lecture (affichage instantané, fonctionne hors-ligne).
2. **Redis (Upstash)** = stockage distant partagé entre appareils, accédé **uniquement** via la serverless function `api/backlog.js` (le token Redis ne quitte jamais le serveur).

Le client ne parle jamais directement à Redis : tout passe par `/api/backlog` (GET = lecture, PUT = écriture).

**Décision d'architecture centrale (inchangée v1.0)** : Vite + Vanilla JS (ES modules), build statique servi par Vercel.

**Décision structurante v2.0 — Stratégie offline sans Service Worker** :
- Pas de Service Worker, pas de Background Sync API, aucune nouvelle dépendance runtime.
- Une file d'attente légère en localStorage (`factory_pending`) + un module `sync.js` + un listener `online`.
- Modèle de résolution : **last-write-wins**, justifié par l'usage solo (pas de conflits multi-utilisateurs à arbitrer).

**Trade-off assumé** : pas de synchronisation différentielle ni de résolution de conflits. Au flush, on **reconstitue le tableau complet depuis localStorage et on écrase Redis**. Simple, lisible, suffisant pour un usage solo — surdimensionner serait contraire à la philosophie anti-usine-à-gaz de la Factory.

---

## 1. RÈGLE SÉCURITÉ (rappel impératif Factory)

Cette app manipule désormais un secret (le token Redis Upstash). La règle Factory s'applique strictement et **est respectée** :

- **Zéro secret côté client** : ✅ `KV_REST_API_URL` et `KV_REST_API_TOKEN` ne vivent que dans `process.env` côté serveur (`api/backlog.js`). Jamais interpolés dans le HTML, jamais renvoyés dans une réponse, jamais présents dans le bundle client.
- **Route Handlers obligatoires pour APIs externes** : ✅ tout accès à Redis passe par la serverless function `/api/backlog`. Le frontend ne connaît que cette route relative, jamais l'URL ni le token Upstash.
- **`process.env` jamais interpolé côté client** : ✅ aucun `process.env` dans `src/`.

**Conséquence déploiement** : Vercel doit exposer `KV_REST_API_URL` et `KV_REST_API_TOKEN` en Environment Variables (côté serveur uniquement). Aucune variable `VITE_*` ne doit contenir de secret (les `VITE_*` sont inlinées dans le bundle client).

---

## 2. Stack technique retenue

| Couche | Choix | Justification |
|---|---|---|
| Langage | JavaScript (ES2022, modules natifs) | Pas de surcouche TS pour ce périmètre |
| Build / dev | **Vite 5** | Dev server HMR + build statique ; preset Vercel auto-détecté |
| UI | HTML + CSS vanilla | Pas de design system complexe imposé |
| Framework UI | **Aucun** | Sur-dimensionné pour ce périmètre |
| Routing | Hash-based maison (`#/projects`, `#/new`, `#/backlog`) | Pas de lib router ; pas de rewrite serveur |
| Persistance locale | **localStorage** (clé `factory_backlog`) | Cache + source de vérité offline |
| File d'attente offline | **localStorage** (clé `factory_pending`) | Mutations en attente de flush vers Redis |
| Persistance distante | **Redis (Upstash)**, clé `factory:backlog` | Partage entre appareils, accédé via `/api/backlog` |
| Backend | **Serverless function Vercel** (`api/backlog.js`) | Proxy sécurisé vers Redis, garde le token côté serveur |
| Détection réseau | `navigator.onLine` + events `online`/`offline` | Natif, zéro dépendance |
| Tests | Jest (cf. politique Factory) | Couvrir model.js, store.js, sync.js |

**Versions Node** : Node ≥ 18 (Vite 5). Vercel : Node 20 par défaut.

> Note : les fonctions de sync historiques s'appellent `fetchFromGitHub()` / `pushToGitHub()`. Le nom « GitHub » est **hérité** d'une itération antérieure ; elles parlent en réalité à **Redis via `/api/backlog`**. Noms conservés pour ne pas casser les vues existantes ; à renommer en V2+ (cf. §10).

---

## 3. Structure des fichiers

```
apps/factory-dashboard/
├── api/
│   └── backlog.js          # Serverless Vercel : GET/PUT Redis (token côté serveur)
├── package.json
├── vite.config.js
├── index.html
└── src/
    ├── main.js             # M-SHELL : bootstrap, listener `online`, séquence boot flush→fetch
    ├── router.js           # M-ROUTER : hash routing
    ├── store.js            # M-STORE : cache localStorage + add()/update() + sync Redis
    ├── sync.js             # M-SYNC (NOUVEAU) : file factory_pending, flushPending(), helpers réseau
    ├── model.js            # M-MODEL : createItem, validate, filtres, tri (pur, sans DOM)
    ├── views/
    │   ├── formView.js     # M-F1 : formulaire de création
    │   ├── backlogView.js  # M-F2 : liste + filtres + tri
    │   └── projectsView.js # vue Projets
    ├── components/
    │   ├── nav.js          # nav + badge « Hors ligne » (NOUVEAU)
    │   └── toast.js        # toasts
    └── style.css
```

**Principe inchangé** : `model.js` reste pur (sans DOM, sans réseau). `store.js` + `sync.js` encapsulent toute la logique de persistance et de réseau ; les vues n'appellent jamais `fetch` directement.

---

## 4. Modèle de données

### 4.1 Item backlog

```json
{
  "id": "string (crypto.randomUUID(), fallback Date.now().toString())",
  "type": "projet | feature",
  "titre": "string (1..100)",
  "description": "string (0..1000) | null",
  "priorite": "haute | moyenne | basse",
  "statut": "string (optionnel — absent des anciens items)",
  "createdAt": "string (ISO 8601)"
}
```

### 4.2 Stockage local (`factory_backlog`)

- **Clé** : `factory_backlog`
- **Valeur** : `JSON.stringify(Item[])`
- **Lecture** (`store.load()`) : parse + validation de forme ; si corrompu → reset `[]` + `corrupted: true`. (Implémenté.)
- **Écriture** : `save(items)` (écrase), `add(item)` (push), `update(item)` (remplace par id). Toutes synchrones et immédiates.

### 4.3 File d'attente offline (`factory_pending`) — NOUVEAU v2.0

Map indexée par `id` d'item. **L'indexation par id garantit l'anti-doublon** : remuter le même item avant un flush écrase simplement son entrée, sans créer de doublon dans la file.

- **Clé** : `factory_pending`
- **Valeur** :

```json
{
  "abc-123": { "op": "upsert", "queuedAt": "2026-06-29T10:00:00.000Z" },
  "def-456": { "op": "upsert", "queuedAt": "2026-06-29T10:01:00.000Z" }
}
```

- `op` vaut toujours `"upsert"` en v2.0 (création et modification sont traitées identiquement, puisque le flush ré-écrit le tableau complet). Le champ existe pour préparer `"delete"` en V2+.
- `queuedAt` : horodatage informatif (debug / futur affichage « N changements en attente »).
- **La file ne porte pas le contenu des items** — seulement leurs id. La source de vérité du contenu est `factory_backlog`. La file agit comme un **drapeau « sale » détaillé** : tant qu'elle est non vide, c'est qu'il reste des mutations locales non poussées vers Redis.

### 4.4 Stockage distant (Redis Upstash)

- **Clé** : `factory:backlog`, valeur = `JSON.stringify(Item[])`.
- Accédé exclusivement par `api/backlog.js`. **Contrainte forte** : le PUT **rejette un tableau vide** (HTTP 400) — voir §9.5 et Risques §11.

---

## 5. Routing

Inchangé v1.0, étendu à 3 onglets : `#/projects`, `#/new`, `#/backlog` (défaut). Hash-based, sans rewrite serveur.

---

## 6. Dépendances npm

- **devDependencies** : `vite` (+ Jest pour les tests).
- **Runtime** : **zéro dépendance**. `crypto.randomUUID()` natif, `fetch` natif, `navigator.onLine` natif, `localStorage` natif.

La stratégie offline v2.0 **n'ajoute aucune dépendance** — conformité explicite à la contrainte du brief.

---

## 7. Commandes dev / build

```jsonc
{ "scripts": { "dev": "vite", "build": "vite build", "preview": "vite preview", "test": "jest" } }
```

### Déploiement Vercel

| Paramètre | Valeur |
|---|---|
| Root Directory | `apps/factory-dashboard/` |
| Framework Preset | Vite (auto) ; serverless `api/` détectée automatiquement |
| Environment Variables | `KV_REST_API_URL`, `KV_REST_API_TOKEN` (serveur uniquement) |

---

## 8. Contrat de l'API `/api/backlog`

| Méthode | Entrée | Sortie OK | Erreurs |
|---|---|---|---|
| `GET` | — | `200 { items: Item[] }` | `500 { error }` (Redis indispo / env manquante) |
| `PUT` | `{ items: Item[] }` (non vide) | `200 { ok: true }` | `400 { error }` (items absent / vide), `500 { error }` |
| autre | — | — | `405 { error }` |

Côté client (`store.js`) :
- `fetchFromGitHub()` → `GET`, met à jour le cache local sur succès, **throw** sur échec.
- `pushToGitHub(items)` → `PUT`, **throw** sur échec.

---

## 9. Stratégie offline (v2.0) — cœur de cette itération

### 9.1 Principe offline-first

L'UI lit **toujours** depuis localStorage en premier → affichage instantané, fonctionne hors-ligne par défaut. Le réseau n'est qu'une couche de synchronisation opportuniste par-dessus. Toute mutation est d'abord écrite localement, puis poussée vers Redis si possible.

### 9.2 Nouveau module `src/sync.js`

Encapsule la file d'attente et le réseau. Aucune logique DOM. Surface publique :

```js
// État réseau
export function isOnline()              // -> navigator.onLine

// File d'attente factory_pending
export function enqueue(id, op = 'upsert')  // ajoute/écrase une entrée (anti-doublon par id)
export function getPending()                // -> { [id]: { op, queuedAt } }
export function hasPending()                // -> boolean
export function clearPending()              // vide la file

// Synchronisation
export async function flushPending()        // pousse l'état local complet vers Redis si online + file non vide
```

**`flushPending()` — algorithme** :
1. Si un flush est déjà en cours (`flushing` guard) → retour immédiat (anti-réentrance, évite double PUT si `online` et boot se chevauchent).
2. Si `!isOnline()` → retour (la file reste, on réessaiera au prochain `online`).
3. Si `!hasPending()` → retour (rien à faire).
4. `flushing = true`.
5. `const { items } = store.load()` → reconstitue **l'état complet** depuis localStorage.
6. Si `items.length === 0` → `clearPending()` et retour (le PUT rejette un tableau vide ; rien de valide à pousser — cf. §11).
7. `await store.pushToGitHub(items)` (PUT, écrase Redis = last-write-wins).
8. Succès → `clearPending()`. Échec (throw) → **conserver la file**, log silencieux ; réessai au prochain `online`.
9. `finally { flushing = false }`.

### 9.3 Modifications de `src/store.js`

- **`add(item)`** : (1) `save` local (push dans le tableau), (2) `sync.enqueue(item.id)`, (3) `sync.flushPending()` (fire-and-forget — flushe immédiatement si online, sinon ne fait rien et la file attend).
- **`update(item)`** (NOUVEAU) : (1) charge, remplace l'item de même `id` dans le tableau, `save`, (2) `sync.enqueue(item.id)`, (3) `sync.flushPending()`.
- En **ligne**, le parcours est donc : écriture locale immédiate → PUT immédiat → file vidée. En **hors-ligne** : écriture locale immédiate → file conservée → flush au retour réseau.

> Découplage : `store.js` importe `sync.js`, mais `sync.js` n'importe de `store.js` que `load`/`pushToGitHub`. Pour éviter une dépendance circulaire dure, `sync.flushPending()` reçoit ces fonctions par import direct (les deux modules sont stables) — l'interface est figée (cf. inter-agent).

### 9.4 Modifications de `src/main.js` — séquence de boot

Ordre **critique** (corrige un bug latent : `fetchFromGitHub()` écrase le cache local et effacerait des mutations offline non poussées) :

1. `renderNav()` + `initRouter()` → rendu immédiat depuis le cache localStorage (offline-first, instantané).
2. `window.addEventListener('online', flushPending)` → flush automatique au retour réseau.
3. `window.addEventListener('online'/'offline', updateOnlineBadge)` → bascule du badge nav.
4. Séquence de synchronisation initiale (async, non bloquante) :
   - **Si `hasPending()`** → `await flushPending()` **d'abord** (le local est plus récent → on le pousse), **puis** `fetchFromGitHub()` pour rafraîchir le cache.
   - **Sinon** → `fetchFromGitHub()` (pull Redis → cache).
   - **Si offline / échec** → ne rien écraser, le cache déjà affiché suffit ; toast « Mode hors-ligne ».
   - Re-render de la vue backlog si elle est active après mise à jour du cache.

**Règle d'or** : ne jamais laisser `fetchFromGitHub()` écraser le cache local tant que la file `factory_pending` n'est pas vidée. Le flush précède toujours le fetch au boot.

### 9.5 Détection réseau et badge UI

- `nav.js` : nouvel élément badge masqué par défaut, affiché quand `!navigator.onLine`. Mis à jour par `updateOnlineBadge()` branchée sur les events `online`/`offline` (et appelée une fois au boot pour l'état initial).
- Léger, non bloquant : informe l'utilisateur que ses changements sont locaux et seront synchronisés au retour du réseau.

### 9.6 Flux complet (résumé)

```
Création/édition  → store.add/update → save(localStorage) → enqueue(id) → flushPending()
                                                                              │
                                          online ? ──oui──> PUT /api/backlog → clearPending()
                                              │
                                             non → file conservée
                                                      │
                              event 'online' ────────> flushPending() → PUT → clearPending()

Boot → render(cache) → [hasPending ? flush d'abord] → fetchFromGitHub() → cache à jour → re-render
```

---

## 10. Considérations architecturales V2+

| Feature V2+ | Impact architectural | Décision prise aujourd'hui |
|---|---|---|
| Suppression d'item offline | La file doit distinguer `upsert` / `delete` ; un PUT d'array vide est rejeté (400) | Champ `op` déjà présent dans `factory_pending` (toujours `"upsert"` en v2.0). Préparer côté API un endpoint/sémantique tolérant le vide |
| Multi-appareils avec conflits réels | Last-write-wins ne suffit plus ; besoin de versions/timestamps par item | `createdAt` déjà présent ; ajouter `updatedAt` par item ouvrirait une résolution par horodatage sans refonte |
| Affichage « N changements en attente » | Besoin de compter la file | `getPending()`/`hasPending()` déjà exposés ; `queuedAt` permet un tri chronologique |
| Renommage `fetchFromGitHub`/`pushToGitHub` → `pull`/`push` | Touche store.js + toutes les vues | Isolé dans `store.js` ; les vues passent par ces deux points. Renommage mécanique, faible risque |
| Retry/backoff sur flush échoué | Aujourd'hui : réessai uniquement au prochain `online` | La garde `flushing` et la conservation de file sont en place ; ajouter un timer de retry serait additif, sans refonte |

---

## 11. Risques et mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| **`fetchFromGitHub()` au boot écrase des mutations offline non flushées** | Perte de données locales | Séquence boot **flush-puis-fetch** (§9.4) : ne jamais fetch tant que `factory_pending` n'est pas vide |
| **PUT rejette un tableau vide (400)** | Flush échoue si le backlog local est vidé alors qu'il reste des entrées en file | `flushPending()` court-circuite et vide la file si `items.length === 0` (§9.2). À revoir si suppression d'item arrive (V2+ §10) |
| Double flush (`online` + boot concurrents) | Deux PUT simultanés | Garde de réentrance `flushing` dans `sync.js` |
| Flush réseau échoue en cours de session | Mutations non synchronisées | File conservée, réessai automatique au prochain event `online` ; toast informatif |
| Données localStorage corrompues | App ne charge pas | Garde-fou `store.load()` (reset + flag `corrupted`) — déjà implémenté |
| `crypto.randomUUID` indisponible (HTTP local) | Crash création | Fallback `Date.now()` |
| Quota localStorage atteint | Écriture échoue | `try/catch` autour de `setItem` (déjà présent) ; < 100 items attendus |
| `navigator.onLine` faux positif (connecté au LAN mais pas à Internet) | `flushPending` tente un PUT qui échoue | Acceptable : l'échec laisse la file intacte, réessai ultérieur. Pas de ping de vérif (anti-usine-à-gaz) |

---

## MODULES INDÉPENDANTS — Développement parallèle (v2.0)

Le contrat clé à figer en premier est la **surface publique de `sync.js`** (§9.2) et les signatures `store.add()/update()`. Une fois ces interfaces gelées, les modules se développent en parallèle.

| Module | Description | Fichiers concernés | Dépendances | Branche suggérée |
|--------|-------------|-------------------|-------------|-----------------|
| M-SYNC | File `factory_pending`, `flushPending()`, helpers réseau, garde de réentrance | `src/sync.js` | M-STORE (contrat `load`/`pushToGitHub` figé) | feat/fd-sync-offline |
| M-STORE | Ajout `update()`, branchement `enqueue`+`flushPending` dans `add()`/`update()` | `src/store.js` | M-SYNC (contrat `enqueue`/`flushPending` figé) | feat/fd-store-mutations |
| M-SHELL | Séquence boot flush→fetch, listener `online`, branchement badge | `src/main.js` | M-SYNC (`flushPending`/`hasPending`), M-NAV (`updateOnlineBadge`) | feat/fd-boot-online |
| M-NAV | Badge « Hors ligne », `updateOnlineBadge()`, events online/offline | `src/components/nav.js`, `src/style.css` (classe `.badge-offline`) | Aucune (contrat = `updateOnlineBadge()`) | feat/fd-offline-badge |

**Ordre de finalisation** : figer le contrat M-SYNC ↔ M-STORE en premier (interfaces croisées), puis M-SHELL et M-NAV en parallèle. M-MODEL et les vues F1/F2 sont inchangés par cette itération.

---

## Traçabilité comportements offline

| Comportement attendu (brief v2.0) | Couvert par |
|---|---|
| Cache au chargement (offline → localStorage) | M-SHELL §9.4 + `store.load()` |
| Création offline → localStorage + file | M-STORE `add()` §9.3 |
| Modification offline → localStorage + file | M-STORE `update()` §9.3 |
| Anti-doublons (file indexée par id) | M-SYNC `enqueue` §4.3 / §9.2 |
| Flush au retour réseau (event `online`) | M-SHELL listener §9.4 + M-SYNC `flushPending` §9.2 |
| Flush = reconstitution complète → écrase Redis | M-SYNC `flushPending` étapes 5-7 |
| Badge « hors ligne » | M-NAV §9.5 |
