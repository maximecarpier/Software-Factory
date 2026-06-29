# TravelFinance

Journal de voyage multi-pays avec suivi des dépenses par catégorie, conversion de devises en temps réel et synchronisation cloud.

**URL** : https://travelfinance.vercel.app

## Lancer en local

```bash
cd apps/travelfinance
npx serve . -p 3003
# → http://localhost:3003
```

> Les API `/api/get-journal` et `/api/save-journal` ne fonctionnent qu'en déploiement Vercel. En local, l'app démarre avec un état vide (pas d'erreur bloquante).

## Tests

```bash
cd apps/travelfinance
npm install
npm test
```

Couverture : `GET /api/get-journal` (lecture KV, migration legacy, double encodage), `POST /api/save-journal` (écriture KV, validation méthode), fonctions pures (`dayTotalLocal`, `toEur`, `getRate`, `formatDate`, logique visa).

## Structure

```
├── index.html            ← SPA (HTML + CSS + JS inline)
├── api/
│   ├── get-journal.js    ← serverless GET (lecture Upstash KV)
│   └── save-journal.js   ← serverless POST (écriture Upstash KV)
├── Donnees.json          ← backup données réelles
├── tests/                ← Jest
└── docs/                 ← specs, architecture, design
```

## Déploiement

Push sur `main` → Vercel redéploie automatiquement.

**Variables d'environnement requises sur Vercel** :
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
