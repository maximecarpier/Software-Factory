## Changelog
| Version | Date | Changements |
|---|---|---|
| v1.0 | 2024-11 | Architecture initiale — SPA monofichier + Vercel KV |

---

# Architecture technique — TravelFinance

## Vue d'ensemble

SPA vanilla JS en fichier unique (`index.html`) déployée sur Vercel. Deux serverless functions exposent une API REST pour lire/écrire le journal dans Upstash KV (Redis).

```
Browser
  └── index.html    ← HTML + CSS (custom props + Tailwind CDN) + JS inline

Vercel Serverless
  ├── api/get-journal.js   ← GET  /api/get-journal  (lecture KV)
  └── api/save-journal.js  ← POST /api/save-journal (écriture KV)

Upstash KV (Redis REST)
  └── clé: travelfinance:journal  ← données sérialisées JSON
```

## Dépendances frontend (CDN)

| Lib | Usage |
|---|---|
| Tailwind CSS | Utilitaires de layout/spacing via CDN |
| Chart.js | Donut chart répartition des dépenses |
| Google Fonts | Inter (corps) + Space Grotesk (titres) |
| open.er-api.com | Taux de change EUR (gratuit, sans clé) |

## API serverless

### GET `/api/get-journal`

Lit `travelfinance:journal` dans Upstash KV. Gère :
- Clé absente → `{ pays: [], jours: [] }`
- Double encodage JSON (le résultat peut être `"[\"{\\"pays\\":...}\""]"`)
- Migration lazy depuis l'ancienne clé `journal_de_voyage` (SET + DEL)

**Env vars** : `KV_REST_API_URL`, `KV_REST_API_TOKEN`

### POST `/api/save-journal`

Écrit dans Upstash KV au format `[JSON.stringify(body)]` (tableau contenant une chaîne — format strict attendu par le client Upstash REST).

**Env vars** : `KV_REST_API_URL`, `KV_REST_API_TOKEN`

## Modèle de données

```json
{
  "pays": [
    {
      "id": "string (uid)",
      "nom": "Thaïlande",
      "devise": "THB",
      "visa": 0,
      "emoji": "🇹🇭"
    }
  ],
  "jours": [
    {
      "id": "string (uid)",
      "paysId": "string",
      "date": "YYYY-MM-DD",
      "ville": "string",
      "duree": 1,
      "categories": {
        "trajet_aller": 0,
        "deplacements": 0,
        "nourriture": 0,
        "activites": 0,
        "logement": 0,
        "autre": 0
      },
      "notes": "string"
    }
  ]
}
```

## État applicatif (JS)

```js
let state = { pays: [], jours: [], rates: {} };
```

Pas de framework — rendu DOM impératif déclenché par les mutations de `state`.

## Logique métier clé

**`getStopsWithVisa()`** : groupe les journées en stops (pays+ville consécutifs), identifie le premier jour de chaque entrée dans un nouveau pays → visa imputé à ce jour uniquement.

**`toEur(amount, devise)`** : division par le taux de change. Retourne `null` si le taux est inconnu (devise non couverte ni par le state ni par le fallback).

**`save()`** : debounce 800ms → `POST /api/save-journal`. Indicateur de statut dans le header.

## Sécurité

- `KV_REST_API_URL` et `KV_REST_API_TOKEN` uniquement côté serveur (serverless functions)
- Aucun token jamais injecté dans `index.html`
- Import JSON côté client : validation minimale (`parsed.pays && parsed.jours`)

## Déploiement

- **Hébergeur** : Vercel (hobby plan)
- **Root Directory** : `apps/travelfinance/`
- **Env vars Vercel** : `KV_REST_API_URL`, `KV_REST_API_TOKEN`
