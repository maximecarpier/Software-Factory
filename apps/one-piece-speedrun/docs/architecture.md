## Changelog
| Version | Date | Changements |
|---|---|---|
| v1.0 | 2025-06 | Architecture initiale — PWA vanilla + Vercel serverless |

---

# Architecture technique — One Piece Speedrun

## Vue d'ensemble

PWA vanilla JS (sans framework) déployée sur Vercel. Une serverless function sert de proxy vers l'API Gemini pour ne jamais exposer la clé API côté client.

```
Browser (PWA)
  ├── app.js          ← logique applicative (services + renderer)
  ├── style.css       ← styles (dark theme pirate)
  ├── index.html      ← point d'entrée
  ├── sw.js           ← service worker (cache offline)
  ├── manifest.json   ← déclaration PWA
  └── data/
      └── one-piece.json   ← données statiques (arcs + épisodes)

Vercel Serverless
  └── api/
      └── summary.js  ← proxy Gemini 2.5 Flash (POST /api/summary)
```

## Services (app.js)

| Service | Responsabilité |
|---|---|
| `DataService` | Chargement et cache de `one-piece.json` (localStorage) |
| `ProgressService` | Persistance de l'arc courant (localStorage) |
| `SummaryService` | Génération et cache des résumés IA (localStorage + `/api/summary`) |
| `FilterEngine` | Filtrage des arcs par type (fonction pure) |
| `UIRenderer` | Rendu DOM : liste des arcs, détail arc, filtres, recherche |
| `escapeAttr` | Échappement XSS pour les attributs HTML générés dynamiquement |

## Flux de données

```
Chargement initial:
  DataService.fetchData()
    → localStorage hit  →  render immédiat
    → localStorage miss →  fetch(data/one-piece.json) → cache → render

Résumé IA (filler):
  SummaryService.callGemini(prompt)
    → localStorage hit  →  affichage immédiat
    → localStorage miss
        → navigator.onLine false  →  message "connexion requise"
        → navigator.onLine true   →  POST /api/summary → cache → affichage
```

## API serverless — `/api/summary`

**Méthode** : POST  
**Body** : `{ prompt: string }`  
**Réponse** : `{ text: string }`  
**Env var requise** : `GEMINI_API_KEY`  
**Modèle** : `gemini-2.5-flash`  
**Retry** : 2 tentatives sur HTTP 503 (backoff 500ms × tentative)

## Données — `data/one-piece.json`

```json
[
  {
    "id": "string",
    "name": "string",
    "type": "canon" | "filler" | "mixte",
    "episodes": [
      { "number": 1, "title": "string", "type": "canon" | "filler" }
    ]
  }
]
```

Fichier statique mis à jour via `node scrape.js` (script de scraping ponctuel).

## Déploiement

- **Hébergeur** : Vercel (hobby plan, gratuit)
- **Root Directory** : `apps/one-piece-speedrun/`
- **Env var Vercel** : `GEMINI_API_KEY`
- **CI** : GitHub Actions — tests Jest à chaque push/PR

## Sécurité

- `GEMINI_API_KEY` uniquement côté serveur (serverless function)
- `escapeAttr()` appliqué sur toutes les données injectées dans les attributs HTML
- Aucune donnée utilisateur transmise à l'API (uniquement les prompts générés en interne)
