# CDC Technique — factory-dashboard

**Version** : 1.0
**Date** : 2026-06-27
**Statut** : Gate 2 — en attente de validation
**Auteur** : tech-architect
**Projet** : `apps/factory-dashboard/`
**Specs source** : `apps/factory-dashboard/docs/specs.md` (v1.0)

---

## 0. Résumé exécutif

`factory-dashboard` est une **SPA statique client-only** : deux vues (formulaire F1, backlog F2), persistance exclusive en `localStorage`, aucun backend, aucune API tierce, aucun secret.

**Décision d'architecture centrale** : **Vite + Vanilla JS (ES modules)**, build statique servi par Vercel.

Justification synthétique :
- Le besoin (2 vues, état local simple, pas de réseau) ne justifie pas le coût d'un framework. React/Next ajouteraient un runtime et une chaîne de build plus lourde sans bénéfice fonctionnel.
- Vanilla JS modularisé reste parfaitement lisible et maintenable à cette échelle (< 500 lignes de logique).
- Vite donne un dev server à rechargement instantané + un build statique optimisé, **auto-détecté par Vercel** (preset Vite officiel) — bootstrap en minutes.
- Cohérent avec la philosophie « anti-usine-à-gaz » de la Factory et proche de l'esprit vanilla de `safecalc`/`one-piece-speedrun`.

**Trade-off assumé** : pas de système de composants réactifs → on gère le rendu par re-render manuel d'une vue à partir de l'état. À cette taille c'est un atout (transparence totale), pas une dette.

---

## 1. RÈGLE SÉCURITÉ (rappel impératif Factory)

Bien que cette application n'ait **aucun secret, aucun token, aucun appel réseau**, les règles Factory s'appliquent et sont ici **trivialement satisfaites** :

- **Zéro secret côté client** : ✅ l'app ne manipule aucune clé/token. Aucune variable d'environnement n'est requise.
- **Route Handlers pour APIs externes** : ✅ non applicable — aucune communication avec une API externe. Toute la donnée vit dans `localStorage` du navigateur.
- **`process.env` jamais interpolé côté client** : ✅ aucun usage de `process.env` dans le code livré.

**Conséquence déploiement** : aucune Environment Variable à configurer sur Vercel pour cette app (contrairement au `dashboard` qui requiert `GITHUB_TOKEN`).

---

## 2. Stack technique retenue

| Couche | Choix | Justification |
|---|---|---|
| Langage | JavaScript (ES2022, modules natifs) | Pas de surcouche TS nécessaire pour ce périmètre ; bootstrap immédiat |
| Build / dev | **Vite 5** | Dev server HMR + build statique ; preset Vercel auto-détecté |
| UI | HTML + CSS vanilla (un seul `style.css`) | 2 vues, pas de design system complexe imposé par les specs |
| Framework UI | **Aucun** | Sur-dimensionné pour 2 vues + état local |
| Routing | Hash-based maison (`#/new`, `#/backlog`) | Pas de lib router ; supporte deep-link `/new` demandé en §3.1 des specs |
| Persistance | `localStorage` (clé `factory_backlog`) | Imposé par les specs |
| Tests | Aucun (hors périmètre MVP, §7 specs) | Peuvent être ajoutés plus tard (Vitest, déjà présent au repo racine) |

**Versions Node** : Node ≥ 18 (requis par Vite 5). Vercel utilise Node 20 par défaut.

---

## 3. Structure des fichiers

```
apps/factory-dashboard/
├── package.json            # scripts + dépendance vite (dev uniquement)
├── vite.config.js          # config minimale (root, base relative)
├── index.html              # point d'entrée unique (SPA shell)
├── public/
│   └── favicon.svg         # optionnel
└── src/
    ├── main.js             # bootstrap : init store, router, premier render
    ├── router.js           # M-ROUTER : hash routing #/new ↔ #/backlog
    ├── store.js            # M-STORE : lecture/écriture localStorage + intégrité
    ├── model.js            # M-MODEL : création item, validation, énums, tri/filtre
    ├── views/
    │   ├── formView.js     # M-F1 : rendu + logique du formulaire de création
    │   └── backlogView.js  # M-F2 : rendu liste + filtres + tri + états vides
    ├── components/
    │   ├── nav.js          # barre de navigation (2 onglets)
    │   └── toast.js        # toast de confirmation "Item ajouté au backlog."
    └── style.css           # styles globaux + badges priorité/type
```

**Principe** : `model.js` et `store.js` sont **purs et sans DOM** (logique testable isolément). Les vues consomment ces modules et produisent le DOM.

---

## 4. Modèle de données

### 4.1 Item backlog (conforme §4.4 specs)

```json
{
  "id": "string (UUID v4, fallback Date.now().toString())",
  "type": "projet | feature",
  "titre": "string (1..100)",
  "description": "string (0..1000) | null",
  "priorite": "haute | moyenne | basse",
  "createdAt": "string (ISO 8601, new Date().toISOString())"
}
```

### 4.2 Stockage

- **Clé** : `factory_backlog`
- **Valeur** : `JSON.stringify(Item[])` — un tableau plat.
- **Lecture** (`store.load()`) :
  1. `localStorage.getItem('factory_backlog')`
  2. `JSON.parse` ; si `null` → `[]`
  3. Validation de forme (Array + chaque item a `id`, `type`, `titre`, `priorite`, `createdAt`)
  4. Si parse échoue OU forme invalide (§6.4 specs) → retourner `[]`, **écraser** le localStorage avec `[]`, et lever un drapeau `corrupted=true` pour que la vue affiche l'avertissement « Données locales illisibles, backlog réinitialisé. »
- **Écriture** (`store.add(item)`) : charge, push, `setItem` immédiat (§6.3).

### 4.3 Énumérations (centralisées dans `model.js`)

```js
export const TYPES = ['projet', 'feature'];
export const PRIORITES = ['haute', 'moyenne', 'basse'];
export const PRIORITE_RANK = { haute: 3, moyenne: 2, basse: 1 }; // pour le tri
```

### 4.4 Fonctions pures de présentation (`model.js`)

- `createItem({ type, titre, description, priorite }) -> Item` (génère id + createdAt)
- `validate({ type, titre, description, priorite }) -> { ok, errors: {champ: message} }` (messages exacts du §4.3 specs)
- `applyFilters(items, { type, priorite }) -> Item[]` (AND, valeurs "tous" = pas de filtre)
- `applySort(items, sortKey) -> Item[]` (4 modes du §5.3)

---

## 5. Stratégie de routing

Routing **hash-based** minimal, sans dépendance :

| Hash | Vue |
|---|---|
| `#/backlog` (et `#/`, vide) | F2 — Backlog (vue par défaut au chargement, §3.2) |
| `#/new` | F1 — Formulaire de création |

- `router.js` écoute `window.addEventListener('hashchange', ...)` et appelle le `render(route)` correspondant dans un conteneur racine `#app`.
- Après soumission réussie de F1, redirection programmatique : `location.hash = '#/backlog'` puis affichage du toast (§4.3).
- La nav (`nav.js`) utilise des liens `<a href="#/new">` / `<a href="#/backlog">` — pas de JS d'interception nécessaire.

Le hash-routing évite toute config de réécriture serveur sur Vercel (pas de `vercel.json` rewrites nécessaire).

---

## 6. Dépendances npm

```jsonc
// devDependencies uniquement — l'app livrée est 100% statique
{
  "devDependencies": {
    "vite": "^5.4.0"
  }
}
```

Pour la génération d'UUID : utiliser **`crypto.randomUUID()`** natif (disponible sur tous les navigateurs cibles du §7 specs) — **aucune dépendance runtime**. Fallback `Date.now().toString()` si indisponible (contexte non sécurisé).

→ **Zéro dépendance de production.** Bundle final = HTML + CSS + JS vanilla.

---

## 7. Commandes dev / build

```jsonc
// package.json > scripts
{
  "scripts": {
    "dev": "vite",                    // http://localhost:5173
    "build": "vite build",            // génère dist/
    "preview": "vite preview"         // sert dist/ localement
  }
}
```

### Déploiement Vercel (mono-repo)

| Paramètre Vercel | Valeur |
|---|---|
| Root Directory | `apps/factory-dashboard/` |
| Framework Preset | **Vite** (auto-détecté) |
| Build Command | `npm run build` (auto) |
| Output Directory | `dist` (auto) |
| Environment Variables | **Aucune** |

`vite.config.js` doit définir `base: './'` pour des chemins d'assets relatifs (robustesse sur l'URL Vercel).

---

## 8. Risques et mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| Données localStorage corrompues | App ne charge pas | Garde-fou `store.load()` §4.2 (reset + avertissement non bloquant) |
| `crypto.randomUUID` indisponible (HTTP local) | Crash création | Fallback `Date.now()` |
| Re-render manuel oublié après filtre/tri | UI désynchronisée | Centraliser le rendu de F2 dans une seule fonction `renderBacklog(state)` rappelée à chaque `change` |
| Quota localStorage atteint (> ~5 Mo) | Écriture échoue | Hors périmètre (< 100 items attendus) ; entourer `setItem` d'un try/catch avec message |

---

## MODULES INDÉPENDANTS — Développement parallèle

Le périmètre tient en quelques fichiers ; le découpage ci-dessous permet néanmoins un développement parallèle **piloté par contrats d'interface**. Le contrat clé est la signature des fonctions de `model.js` et `store.js` (§4) — à figer en premier.

| Module | Description | Fichiers concernés | Dépendances | Branche suggérée |
|--------|-------------|-------------------|-------------|-----------------|
| M-STORE | Persistance localStorage + intégrité/reset (§4.2, §6.4) | `src/store.js` | Aucune (contrat = `load()/add()`) | feat/fd-store |
| M-MODEL | Énums, `createItem`, `validate`, `applyFilters`, `applySort` (logique pure) | `src/model.js` | Aucune (contrat = signatures §4.4) | feat/fd-model |
| M-SHELL | Bootstrap, router hash, nav, toast, conteneur `#app` | `index.html`, `src/main.js`, `src/router.js`, `src/components/nav.js`, `src/components/toast.js`, `vite.config.js`, `package.json` | Aucune (expose `#app` + API toast) | feat/fd-shell |
| M-F1 | Vue formulaire : rendu, validation inline, soumission, redirection | `src/views/formView.js` | M-MODEL (validate/createItem), M-STORE (add), M-SHELL (toast/route) — via contrats | feat/fd-form |
| M-F2 | Vue backlog : liste, filtres, tri, états vides/vide-filtré, compteur | `src/views/backlogView.js` | M-MODEL (applyFilters/applySort), M-STORE (load) — via contrats | feat/fd-backlog |
| M-STYLE | Styles globaux, badges type/priorité, responsive minimal | `src/style.css` | Aucune (classes documentées : `.badge-projet`, `.badge-feature`, `.prio-haute/moyenne/basse`) | feat/fd-style |

**Ordre de finalisation recommandé** : figer les contrats M-MODEL + M-STORE en premier (interfaces pures), puis M-SHELL, puis M-F1 / M-F2 / M-STYLE en parallèle.

---

## Traçabilité critères d'acceptation

| Critère specs | Couvert par |
|---|---|
| A1, A2 | M-F1 (soumission + redirection M-SHELL) |
| A3 | M-STORE (persistance) |
| A4, A5, A6 | M-F2 + M-MODEL.applyFilters |
| A7, A8 | M-F2 (états vide / vide-filtré) |
| A9 | M-F1 + M-MODEL.validate |
| A10 | M-F2 + M-MODEL.applySort (PRIORITE_RANK) |
