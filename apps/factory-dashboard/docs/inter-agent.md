# Canal inter-agents — factory-dashboard

## [tech-architect → designer]
> Round 1 (v2.0 offline) — 2026-06-29
- Nouveau badge « Hors ligne » à intégrer dans la nav (`nav.js`). État visuel : masqué quand en ligne, visible quand `!navigator.onLine`. Doit signaler de façon non bloquante que les changements sont locaux et seront synchronisés au retour réseau.
- Classe CSS attendue : `.badge-offline` (dans `style.css`). Style discret, non alarmant (info, pas erreur).
- Aucun autre changement d'écran : F1, F2, Projets inchangés sur cette itération.

## [tech-architect → code-implementer]
> Gate 2 — 2026-06-29
- **Contrat M-SYNC (`src/sync.js`)** à implémenter en premier :
  ```
  isOnline(): boolean
  enqueue(id: string, op?: 'upsert'): void
  getPending(): { [id: string]: { op: string, queuedAt: string } }
  hasPending(): boolean
  clearPending(): void
  flushPending(): Promise<void>
  ```
- **Ordre d'implémentation** : figer le contrat M-SYNC ↔ M-STORE d'abord (interfaces croisées), puis M-SHELL et M-NAV en parallèle.
- **Format file `factory_pending`** : map indexée par id → `{ op, queuedAt }`. L'indexation par id EST l'anti-doublon (remuter le même item écrase l'entrée).
- **flushPending()** : garde de réentrance obligatoire (`flushing`) ; no-op si offline OU file vide ; reconstitue l'état complet via `store.load()` ; **court-circuite si `items.length === 0`** (le PUT rejette le tableau vide → 400) ; sur succès `clearPending()`, sur échec conserver la file.
- **RÈGLE D'OR boot (`main.js`)** : ne JAMAIS laisser `fetchFromGitHub()` écraser le cache local tant que `factory_pending` n'est pas vidée. Séquence : render(cache) → si `hasPending()` flush d'abord → puis `fetchFromGitHub()`.
- **store.add()/update()** : écriture locale d'abord, puis `enqueue(id)`, puis `flushPending()` (fire-and-forget). `update()` remplace l'item de même id.
- **Sécurité** : aucun secret côté client. Le token Redis reste dans `process.env` de `api/backlog.js`. Aucune variable `VITE_*` ne doit contenir de secret. Le frontend ne connaît que la route relative `/api/backlog`.
- Zéro nouvelle dépendance runtime.

## [tech-architect → test-writer]
> Gate 2 — 2026-06-29
- **Cas critique #1** : mutation hors-ligne (mock `navigator.onLine = false`) → item présent en localStorage ET id présent dans `factory_pending`. Aucun PUT émis.
- **Cas critique #2** : retour en ligne (dispatch event `online`) → `flushPending` émet un PUT avec l'état complet du backlog, puis `factory_pending` est vidée.
- **Cas critique #3 (anti-doublon)** : éditer 2× le même item hors-ligne → `factory_pending` contient UNE seule entrée pour cet id.
- **Cas critique #4 (boot flush-puis-fetch)** : au boot avec file non vide, `flushPending` (PUT) doit être appelé AVANT `fetchFromGitHub` (GET) — vérifier l'ordre, sinon des mutations locales seraient écrasées.
- **Cas limite #5 (PUT vide rejeté)** : backlog local vidé mais file non vide → `flushPending` ne doit PAS émettre de PUT (court-circuit `length === 0`), et vide la file.
- **Cas limite #6 (échec réseau au flush)** : `pushToGitHub` rejette → la file `factory_pending` est CONSERVÉE (pas de clearPending).
- **Cas limite #7 (réentrance)** : deux appels concurrents à `flushPending` → un seul PUT (garde `flushing`).
