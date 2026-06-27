# Claude & Codespace Monitor

Dashboard de monitoring en temps réel pour :
- **Tokens Claude** — consommation input/output du jour + tendance 7 jours + coût estimé par modèle
- **GitHub Codespace** — liste des codespaces actifs + facturation si disponible

## Architecture

```
dashboard/
  server.js          — Express backend (port 3001)
  public/
    index.html       — Interface HTML
    style.css        — Styles
    app.js           — Logique JS (polling, Chart.js, rendu)
  data/
    tokens.json      — Cache local généré automatiquement (gitignored)
```

Le backend lit directement les fichiers JSONL de Claude Code :
`~/.claude/projects/{project-hash}/{session-uuid}.jsonl`  
et leur équivalent subagents :
`~/.claude/projects/{project-hash}/{session-uuid}/subagents/agent-*.jsonl`

Chaque entrée `"type": "assistant"` contient un objet `message.usage` avec `input_tokens`,
`output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`.

## Prérequis

- Node.js >= 18
- Claude Code installé (pour les données tokens)
- Token GitHub avec scopes `read:user` et `codespace`

## Variables d'environnement

| Variable       | Requis | Description                              |
|----------------|--------|------------------------------------------|
| `GITHUB_TOKEN` | Oui    | Personal Access Token GitHub             |
| `PORT`         | Non    | Port du serveur (défaut : `3001`)        |

### Configuration recommandée — Codespace Secrets

Ne pas créer de fichier `.env`. Configurer via GitHub :

**Settings > Codespaces > Secrets > New secret**

Créez `GITHUB_TOKEN` avec un [Personal Access Token](https://github.com/settings/tokens/new)
ayant les scopes :
- `read:user`
- `codespace`

> **Sécurité** : le port 3001 doit rester en visibilité **Private** dans l'onglet
> **Ports** de votre Codespace. Ne jamais le passer en Public.

## Lancement

```bash
cd dashboard
npm install
npm start
# → Dashboard: http://localhost:3001
```

Ouvrez l'URL forwarded du port 3001 dans votre navigateur Codespace.

## Fonctionnement

- Refresh automatique toutes les **5 minutes** (polling côté client)
- Bouton **Actualiser** pour un refresh immédiat
- Les données tokens sont mises en cache serveur pendant **60 secondes**
  pour ne pas relire tous les JSONL à chaque requête

## Estimation des coûts

| Type de token          | Tarif appliqué          |
|------------------------|-------------------------|
| Input régulier         | Plein tarif input       |
| Cache creation         | 1,25× tarif input       |
| Cache read             | 0,10× tarif input       |
| Output                 | Plein tarif output      |

Modèles reconnus : `claude-opus-*`, `claude-sonnet-*` (défaut), `claude-haiku-*`.
