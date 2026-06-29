# One Piece Speedrun

PWA de suivi des arcs One Piece. Navigue dans les arcs canon/filler/mixte, marque ta progression, génère des résumés IA des fillers via Gemini.

**URL** : https://one-piece-speedrun.vercel.app

## Lancer en local

```bash
cd apps/one-piece-speedrun
npx serve . -p 3002
# → http://localhost:3002
```

> La serverless function `/api/summary` ne fonctionne qu'en déploiement Vercel. En local, les boutons "Résumé" retourneront une erreur réseau.

## Tests

```bash
cd apps/one-piece-speedrun
npm install
npm test
```

Couverture : `FilterEngine`, `escapeAttr`, `SummaryService` (clés + cache + appel API), `DataService` (cache hit/miss, refresh), `api/summary` (proxy Gemini).

## Structure

```
├── app.js              ← services + renderer (vanilla JS)
├── style.css           ← thème pirate sombre
├── index.html          ← point d'entrée
├── sw.js               ← service worker (offline)
├── manifest.json       ← déclaration PWA
├── data/
│   └── one-piece.json  ← données arcs/épisodes
├── api/
│   └── summary.js      ← serverless function (proxy Gemini)
├── tests/              ← Jest
└── docs/               ← specs, architecture, design
```

## Mise à jour des données

```bash
node scrape.js  # régénère data/one-piece.json
```

## Déploiement

Push sur `main` → Vercel redéploie automatiquement.

**Variable d'environnement requise sur Vercel** : `GEMINI_API_KEY`
