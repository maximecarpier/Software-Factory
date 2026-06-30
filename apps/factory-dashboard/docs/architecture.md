# CDC Technique — factory-dashboard

**Version** : 3.0
**Date** : 2026-06-30
**Statut** : Gate 2 — v3.0 refonte graphique
**Auteur** : tech-architect
**Projet** : `apps/factory-dashboard/`
**Specs source** : `apps/factory-dashboard/docs/specs.md`

---

## Changelog

| Version | Date | Changements |
|---|---|---|
| v3.0 | 2026-06-30 | Refonte graphique iPhone-first — tab bar bottom, FAB, swipe, filter chips, skeleton, pull-to-refresh, toggle forms, vue Projets redessinée |

### v3.0 — 2026-06-30 — Refonte graphique iPhone-first
- **Aucune modification de la couche offline/données.** `store.js`, `sync.js`, `api/backlog.js`, `model.js` restent inchangés (la logique `statut` et `remove(id)` était déjà en place depuis v2.1). La v3.0 est une refonte **présentation pure** (§13).
- **Nouvelle pile z-index officielle** (§13.1) : filter-strip 30, FAB 40, tab bar 50, toast 60, overlay 70.
- **Tab bar fixed bottom** remplace la nav top sticky (`nav.js`). 2 onglets (Backlog, Projets) ; la création passe par le **FAB** (plus de lien « + Nouvel item »).
- **Gestes tactiles** : swipe cartes (droite = terminé, gauche = éditer), pull-to-refresh, désambiguïsation `|deltaX| > |deltaY|` + `touch-action: pan-y` sur `.card-list`.
- **Filtres repensés** : chips multi-sélection + barre de recherche full-text client (remplacent les `<select>`). Skeleton loading au chargement.
- **Formulaires** : toggle buttons (type / priorité / statut) à la place des `<select>` ; champ statut visible en édition uniquement ; bouton suppression en zone danger.
- **PWA** : `theme_color` → `#2563eb`, `background_color` → `#f9fafb`, `orientation: portrait`, apple-touch-icon 180×180.
- **Découpage** : 10 micro-tâches R1–R10 (§13), `style.css` scindé en R1 (fondations) + R5 (composants) car fichier le plus volumineux.

### v2.1 — 2026-06-29 — Correctifs offline-mutations (review Gate 2)
- **Règle vues** ajoutée (§9.7) : les vues ne peuvent appeler que `store.add/update/remove` — jamais `save/pushToGitHub` directement.
- **`store.remove(id)`** ajouté (§9.3) : seul chemin correct pour supprimer un item et alimenter `factory_pending`.
- **`flushPending()` step 6 supprimée** (§9.2) : le court-circuit `items.length === 0 → clearPending sans PUT` est retiré — le PUT tableau-vide est désormais autorisé.
- **API `PUT /api/backlog`** : accepte `items: []` (tableau vide valide, réinitialisé côté Redis).
- **Tableau micro-tâches** (§12) remplace l'ancienne section "modules parallèles" — 7 tâches séquentielles.

### v2.0 — 2026-06-29 — Support offline complet
- **Nouveau** : stratégie offline-first documentée (§9). Mutations possibles hors-ligne, file d'attente `factory_pending` en localStorage, flush automatique au retour réseau.
- **Nouveau** : app transformée en PWA (§10) — `vite-plugin-pwa` + Service Worker Workbox (cache-first app shell). L'app s'ouvre désormais sans réseau depuis zéro.
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

**Décision structurante v2.0 — Stratégie offline-first** :
- **Service Worker (Workbox via `vite-plugin-pwa`)** : cache l'app shell (HTML/CSS/JS) au premier chargement. L'app s'ouvre depuis zéro sans réseau. Le SW ne cache **pas** `/api/backlog` (dynamique, géré par la couche localStorage).
- **File d'attente** `factory_pending` en localStorage + module `sync.js` + listener `online` : gère les mutations offline et la sync au retour réseau.
- Aucun Background Sync API (non supporté sur iOS Safari). Une seule dépendance devDependency ajoutée : `vite-plugin-pwa`.
- Modèle de résolution : **last-write-wins**, justifié par l'usage solo.

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
| Build / dev | **Vite 5** + **vite-plugin-pwa** | Dev server HMR + build statique + génération SW/manifest PWA |
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
├── public/
│   └── manifest.json       # PWA manifest (généré par vite-plugin-pwa ou écrit manuellement)
├── package.json
├── vite.config.js          # VitePWA plugin configuré ici
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
- Accédé exclusivement par `api/backlog.js`. **Le PUT accepte un tableau vide** `[]` depuis v2.1 — cela réinitialise Redis à vide (suppression de tous les items).

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
| `PUT` | `{ items: Item[] }` (tableau vide autorisé) | `200 { ok: true }` | `400 { error }` (body absent ou items non-array), `500 { error }` |
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
6. `await store.pushToGitHub(items)` (PUT, écrase Redis = last-write-wins). **Tableau vide autorisé** — indique une suppression totale offline.
7. Succès → `clearPending()`. Échec (throw) → **conserver la file**, log silencieux ; réessai au prochain `online`.
8. `finally { flushing = false }`.

> **Supprimé en v2.1** : l'ancien step 6 (`items.length === 0 → clearPending sans PUT`) est retiré. Il vidait silencieusement la file sans mettre Redis à jour, causant la restauration des items supprimés au prochain boot.

### 9.3 Modifications de `src/store.js`

- **`add(item)`** : (1) `save` local (push dans le tableau), (2) `sync.enqueue(item.id, 'upsert')`, (3) `sync.flushPending()` (fire-and-forget).
- **`update(item)`** : (1) charge, remplace l'item de même `id` dans le tableau, `save`, (2) `sync.enqueue(item.id, 'upsert')`, (3) `sync.flushPending()`.
- **`remove(id)`** (NOUVEAU v2.1) : (1) charge, filtre l'item hors du tableau, `save`, (2) `sync.enqueue(id, 'delete')`, (3) `sync.flushPending()`.
- En **ligne** : écriture locale immédiate → PUT immédiat → file vidée. En **hors-ligne** : écriture locale immédiate → file conservée → flush au retour réseau.

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

### 9.7 RÈGLE VUES — Accès au store (v2.1, obligatoire)

**Les vues (`formView.js`, `backlogView.js`, `projectsView.js`) n'appellent JAMAIS directement :**
- `save()` — écriture brute sans enqueue
- `pushToGitHub()` — PUT direct sans enqueue
- `fetchFromGitHub()` — réservé à `main.js` (boot + listener online)

**Les vues utilisent UNIQUEMENT les 3 fonctions de mutation du store :**

| Action utilisateur | Fonction à appeler | Fichier |
|---|---|---|
| Créer un item (formulaire) | `store.add(newItem)` | `formView.js` |
| Modifier un item (formulaire) | `store.update(updatedItem)` | `formView.js` |
| Changer le statut (select inline) | `store.update({ ...item, statut })` | `backlogView.js` |
| Supprimer un item (bouton) | `store.remove(id)` | `backlogView.js` |

Ces fonctions encapsulent save + enqueue + flushPending. C'est le **seul chemin autorisé** vers la synchronisation Redis. Toute tentative de contournement brise la garantie offline.

### 9.6 Flux complet (résumé)

```
Création    → store.add(item)       → save(localStorage) → enqueue(id,'upsert') → flushPending()
Édition     → store.update(item)    → save(localStorage) → enqueue(id,'upsert') → flushPending()
Suppression → store.remove(id)      → save(localStorage) → enqueue(id,'delete') → flushPending()
                                                                                        │
                                              online ? ──oui──> PUT /api/backlog ──────>│
                                                  │                                 clearPending()
                                                 non → file conservée
                                                          │
                                event 'online' ──────────> flushPending() → PUT → clearPending()

Boot → render(cache) → [hasPending ? flush d'abord] → fetchFromGitHub() → cache à jour → re-render
```

---

## 10. PWA — App shell cachée (F5)

### 10.1 Objectif

L'app doit s'ouvrir depuis zéro sans réseau. Le Service Worker met en cache l'app shell (HTML/CSS/JS) au premier chargement connecté. Les visites suivantes servent le shell depuis le cache, même hors ligne.

### 10.2 Stack PWA

| Élément | Choix |
|---|---|
| Plugin | `vite-plugin-pwa` (devDependency) |
| Stratégie SW | `generateSW` (génération automatique par Workbox) |
| Stratégie cache | `CacheFirst` pour les assets statiques (immutables après build) |
| Route `/api/backlog` | **Exclue du cache** — dynamique, gérée par localStorage |
| Manifest | Généré via config `vite-plugin-pwa` ou `public/manifest.json` |

### 10.3 Configuration `vite.config.js`

```js
import { VitePWA } from 'vite-plugin-pwa'

export default {
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        navigateFallback: '/index.html',
        runtimeCaching: [],               // pas de cache runtime des API
        globPatterns: ['**/*.{js,css,html,svg,png,ico}']
      },
      manifest: {
        name: 'Factory Dashboard',
        short_name: 'Factory',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1a1a2e',
        icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }]
      }
    })
  ]
}
```

### 10.4 Points d'attention

- **Vercel + SW** : le SW est un fichier statique (`sw.js`) dans `dist/`, servi normalement par Vercel. Aucune config spéciale requise.
- **`navigateFallback`** : pointe sur `/index.html` (hash routing) — le SW répond aux navigations offline avec le shell en cache.
- **Mise à jour** : `registerType: 'autoUpdate'` — le SW se met à jour silencieusement au prochain chargement connecté. Pas de prompt "Mettre à jour ?" (anti-usine-à-gaz).
- **iOS Safari** : support PWA partiel (pas d'installation automatique) mais le cache app shell fonctionne. Le `display: standalone` n'a d'effet que sur les appareils qui supportent l'installation.

### 10.5 Nouveau module M-PWA

| Module | Description | Fichiers concernés |
|---|---|---|
| M-PWA | Config plugin + manifest + vérification build | `vite.config.js`, `public/manifest.json` |

Aucune modification de `src/` requise — le plugin s'intègre au build Vite.

---

## 11. Considérations architecturales V2+

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
| ~~PUT rejette un tableau vide (400)~~ | ~~Flush échoue si le backlog local est vidé~~ | **Résolu en v2.1** : l'API accepte `items: []` ; `flushPending()` n'a plus de court-circuit sur items vides. |
| Double flush (`online` + boot concurrents) | Deux PUT simultanés | Garde de réentrance `flushing` dans `sync.js` |
| Flush réseau échoue en cours de session | Mutations non synchronisées | File conservée, réessai automatique au prochain event `online` ; toast informatif |
| Données localStorage corrompues | App ne charge pas | Garde-fou `store.load()` (reset + flag `corrupted`) — déjà implémenté |
| `crypto.randomUUID` indisponible (HTTP local) | Crash création | Fallback `Date.now()` |
| Quota localStorage atteint | Écriture échoue | `try/catch` autour de `setItem` (déjà présent) ; < 100 items attendus |
| `navigator.onLine` faux positif (connecté au LAN mais pas à Internet) | `flushPending` tente un PUT qui échoue | Acceptable : l'échec laisse la file intacte, réessai ultérieur. Pas de ping de vérif (anti-usine-à-gaz) |

---

## 12. Micro-tâches — Ordre d'exécution (v2.1) — ✅ TOUTES COMPLÈTES

**Statut au 2026-06-30** : les 7 micro-tâches v2.1 sont **implémentées et vérifiées dans le code**. Conservées ici pour traçabilité. La v3.0 ne les rejoue pas.

**Règle** : une micro-tâche à la fois, dans l'ordre du tableau. Chaque tâche est un fichier unique avec un périmètre strict. Ne pas combiner plusieurs tâches dans un même appel à code-implementer.

| T# | État | Fichier | Périmètre exact | Vérifié dans le code |
|----|------|---------|-----------------|----------------------|
| T1 | ✅ Fait | `api/backlog.js` | Accepter `items: []` dans le PUT — retirer le rejet 400 pour tableau vide. Conserver le rejet 400 si `items` est absent ou n'est pas un array. | `isValidItemsArray` = `Array.isArray` ; `[]` passe, seul non-array → 400 |
| T2 | ✅ Fait | `src/store.js` | Ajouter `export function remove(id)` : `load()` → `filter` → `save` → `enqueue(id,'delete')` → `flushPending().catch()`. Ne pas modifier `add()` ni `update()`. | `remove(id)` présent (l.124-135), `add`/`update` intacts |
| T3 | ✅ Fait | `src/sync.js` | Dans `flushPending()`, supprimer le bloc `if (items.length === 0) { clearPending(); return; }` — laisser `pushToGitHub(items)` s'exécuter même pour `[]`. | Aucun court-circuit `length===0` ; PUT exécuté pour `[]` |
| T4 | ✅ Fait | `src/views/formView.js` | Mode **création** : appel unique `store.add(newItem)`. Supprimer l'import `{ save, pushToGitHub }`. | Branche `else` appelle `add(newItem)` ; import = `{ load, add, update }` |
| T5 | ✅ Fait | `src/views/formView.js` | Mode **édition** : `store.update(updatedItem)`. Retirer les imports `save`/`pushToGitHub`. | Branche `if (_editId)` appelle `update(updatedItem)` |
| T6 | ✅ Fait | `src/views/backlogView.js` | Handler **statut change** : `store.update({ ...item, statut })`. | `update({ ...item, statut: newStatut })` (l.322) |
| T7 | ✅ Fait | `src/views/backlogView.js` | Handler **delete** : `store.remove(id)`. Retirer imports `save`/`pushToGitHub`. | `remove(id)` (l.333) ; import = `{ load, update, remove }` |

**Dépendances entre tâches** :
- T2 et T3 peuvent s'exécuter dans n'importe quel ordre (fichiers disjoints).
- T4 et T5 sont indépendants de T2/T3 du point de vue code (store.add/update existent déjà) — mais T4/T5 doivent être validés après T3 pour que les tests E2E passent.
- T6 dépend de rien de nouveau (store.update existe).
- T7 dépend de T2 (store.remove doit exister).

**Tests de validation** : après chaque tâche, lancer `npm test` depuis `apps/factory-dashboard/`. Les tests `offline-mutations.test.js` doivent passer progressivement (T1→T7 : 0→6 tests verts).

---

## 13. Micro-tâches v3.0 — Refonte graphique

**Nature de la v3.0** : refonte **présentation pure**. La couche données/offline (`store.js`, `sync.js`, `api/backlog.js`, `model.js`) n'est **pas modifiée** — toutes les fonctions nécessaires (`add`, `update`, `remove`, `getAll`, `load`, `fetchFromGitHub`, filtre `statut`, default `statut: 'à faire'`) existent déjà depuis v2.1. Les vues continuent d'appeler **uniquement** `store.add/update/remove` (règle §9.7 inchangée).

**Règle** : une micro-tâche = un fichier, périmètre strict, dans l'ordre. Ne jamais combiner deux Rn dans un même appel à code-implementer. `style.css` est scindé en **R1 (fondations)** et **R5 (composants)** car c'est le plus gros fichier — les fondations doivent exister avant que les composants y fassent référence.

### 13.1 Pile z-index officielle (à respecter dans tout `style.css`)

| Couche | z-index |
|---|---|
| Contenu / cartes | auto (0) |
| Filter strip sticky | 30 |
| FAB | 40 |
| Tab bar (fixed bottom) | 50 |
| Toast | 60 |
| Overlay / bottom-sheet | 70 |

### 13.2 Contrats inter-tâches (interfaces figées)

- **Routes inchangées** : `#/backlog`, `#/projects`, `#/new`, `#/edit/:id`. Le tab bar pointe sur `#/backlog` et `#/projects` ; le FAB navigue vers `#/new`.
- **Exports `nav.js` à préserver** (importés par `main.js` et `router.js`) : `renderNav()`, `updateActiveNav(hash)`, `updateOnlineBadge()`. R4 réécrit leur corps mais **conserve ces signatures**.
- **Variables CSS** : R1 définit le nouveau `:root`. R4–R9 ne consomment QUE des variables définies par R1. Toute couleur/rayon/espacement passe par une variable (pas de valeur en dur hors `:root`).
- **Swipe → statut** : l'action swipe-droite appelle `store.update({ ...item, statut: 'terminé' })`. Swipe-gauche navigue vers `#/edit/:id`. Aucun nouvel export store.
- **`haptic(type)`** : helper best-effort avec guard `'vibrate' in navigator`. À placer dans `main.js` ou un petit util ; importé par les vues qui en ont besoin (périmètre : défini dans le fichier qui le déclenche, ne pas créer de nouveau module dédié pour rester ≤ fichiers existants).

### 13.3 Tableau des micro-tâches

| R# | Fichier | Périmètre exact | Entrée attendue | Sortie attendue | Dépend de |
|----|---------|-----------------|-----------------|-----------------|-----------|
| R1 | `src/style.css` | **Fondations uniquement** : remplacement intégral du bloc `:root` par les variables design §1.1 (couleurs, priorités, statuts, swipe, rayons, ombres, typo, espacements, layout mobile, transitions) ; reset `body` (`overscroll-behavior-y: contain`, `padding-bottom: calc(tab-bar + safe-area)`, font) ; `#app` (max-width 560px, centrage, padding) ; classes utilitaires globales (`.badge`, `.chip` base sans état, `.toggle-btn` base). **NE PAS** styler les composants spécifiques (swipe, skeleton, filter-strip, tab-bar, fab, card v3, toast repositionné, project-card) — réservés à R5. | Anciennes variables `--color-primary`, `--radius`, etc. | `:root` v3.0 complet, body/#app reset, app non cassée (composants encore non stylés) | — |
| R2 | `index.html` | `<meta name="theme-color" content="#2563eb">` (remplace `#1a1a2e`) ; ajouter `<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">` ; conserver `<link rel="manifest">` et le `viewport` existants. Aucune autre modif. | `theme-color #1a1a2e`, pas d'apple-touch-icon | theme-color `#2563eb`, apple-touch-icon déclaré | — |
| R3 | `public/manifest.json` | `theme_color: "#2563eb"`, `background_color: "#f9fafb"`, ajouter `"orientation": "portrait"`. Conserver `name`, `short_name`, `start_url`, `display`, `icons` existants. | manifest v2 (`theme_color #1a1a2e`, pas d'orientation) | manifest v3 cohérent avec R2 | — |
| R4 | `src/components/nav.js` | Réécrire `renderNav()` : tab bar `fixed bottom` 2 onglets (Backlog → `#/backlog`, Projets → `#/projects`) avec structure `.tab-bar > .tab-bar-item > (.tab-bar-icon + .tab-bar-label)`. Adapter `updateActiveNav(hash)` à `.tab-bar-item.active`. Repositionner le badge offline (`updateOnlineBadge()`) selon design §3.9 (dans le filter-strip / non dans le tab bar). **Conserver les 3 exports.** Retirer le lien « + Nouvel item » (remplacé par FAB en R6). | nav top 3 liens | tab bar 2 onglets, exports préservés | R1 (variables) |
| R5 | `src/style.css` | **Composants uniquement** : ajouter les règles `.tab-bar`/`.tab-bar-item`/`.tab-bar-icon`/`.tab-bar-label`, `.fab`, `.card` (nouvelle structure : `.card-prio-stripe`, `.card-body`, `.card-title`, `.card-desc`, `.sync-indicator`, variantes prio), `.swipe-wrapper`/`.swipe-action-left`/`.swipe-action-right`, `.filter-strip`/`.search-bar`/`.chip-row`/`.chip.active`/`.filter-count`, `.toggle-group`/`.toggle-btn.active`, `.skeleton-card` + `@keyframes skeleton-shimmer`, `.toast` repositionné (bottom au-dessus tab bar, z-index 60), `.project-card`/`.project-icon`/badges statut/section labels. `touch-action: pan-y` sur `.card-list`. Respecter la pile z-index §13.1. | `:root` v3.0 (R1) en place | composants stylés, app visuellement complète | R1 |
| R6 | `src/main.js` | Injecter le FAB dans le DOM (bouton `.fab` + listener `click` → `window.location.hash = '#/new'`) ; déclarer le helper `haptic(type)` (guard `'vibrate' in navigator`) et l'appeler au tap FAB (light). Initialiser le pull-to-refresh (touch sur `#app` : `scrollTop===0` + `deltaY>60` → `fetchFromGitHub()` puis re-render). Ne pas toucher à la séquence boot flush→fetch existante. | shell v2 sans FAB | FAB fonctionnel, pull-to-refresh actif, haptic disponible | R1, R5 |
| R7 | `src/views/backlogView.js` | Refonte présentation : remplacer la `.filter-bar` (`<select>`) par filter-strip (search bar + chips multi-sélection type/priorité) ; recherche full-text client (titre+description, AND avec chips) ; skeleton au chargement initial ; rendu cartes nouvelle structure `.swipe-wrapper > (.swipe-action-* + .card)` ; gestes swipe (`touchstart/move/end`, seuil 80px, `|deltaX|>|deltaY|`) → droite `store.update({...item, statut:'terminé'})`, gauche `#/edit/:id` ; **retirer** `.card-actions`, `.btn-edit`, `.btn-delete` et le `.statut-select` inline. Conserver l'usage de `applyFilters`/`applySort`. | items du store, `:root`+composants stylés | liste v3 (chips, search, swipe, skeleton), plus de boutons edit/delete | R1, R5 |
| R8 | `src/views/formView.js` | Remplacer les `<select>` type & priorité par toggle buttons (`.toggle-group`/`.toggle-btn`) ; ajouter un toggle statut **visible uniquement en mode édition** (`[À faire][En cours][Terminé]`, défaut = valeur actuelle) ; bouton « Supprimer » en zone danger en bas (édition uniquement) → `confirm()` puis `store.remove(_editId)` + toast + retour `#/backlog`. Conserver `validateItem`/`createItem` et les appels `add`/`update`. Pas de `maxlength` sur la description. | formView v2 (selects) | form v3 (toggles, statut édition, suppression), logique store inchangée | R1, R5 |
| R9 | `src/views/projectsView.js` | Refonte : vue dérivée `getAll().filter(i => i.type==='projet')` groupée en sections « EN COURS » (statut ≠ terminé) / « TERMINÉS » (statut === terminé), triées alphabétiquement par titre dans chaque groupe. Cartes `.project-card` : `.project-icon` (initiale colorée par hash), badge statut, URL Vercel cliquable (`item.url`, sinon « Pas encore déployé »). | items projet du store | vue Projets v3 groupée/triée | R1, R5 |
| R10 | `src/model.js` | **Vérification/garde** : confirmer que `createItem` initialise `statut: 'à faire'` (déjà le cas) et que `applyFilters` gère le filtre statut avec fallback `(item.statut || 'à faire')` (déjà le cas). N'ajouter du code QUE si une lacune est constatée. Probable **no-op** — tâche de contrôle, pas de régression. | model v2 | logique statut confirmée/complète | — |

**Notes de dépendances** :
- R1, R2, R3, R10 sont **indépendants** entre eux (parallélisables).
- R5 dépend de R1 (les composants consomment les variables `:root`).
- R4, R6, R7, R8, R9 dépendent de R1 **et** R5 (structure HTML stylée). Entre eux, R4/R6/R7/R8/R9 touchent des fichiers disjoints → parallélisables une fois R1+R5 faits.
- Ordre recommandé en séquentiel : **R1 → R5 → R2 → R3 → R10 → R4 → R6 → R7 → R8 → R9** (fondations, puis composants, puis assets/garde, puis vues).

**Tests** : aucun test data/offline ne doit régresser (`store.test.js`, `sync.test.js` inchangés). Après chaque Rn, lancer `npm test` depuis `apps/factory-dashboard/` et vérifier qu'aucun test existant ne casse. La refonte étant présentation, les tests fonctionnels store restent verts.

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
