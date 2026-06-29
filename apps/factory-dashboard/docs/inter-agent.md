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

## [test-writer → code-implementer]
> TDD — 2026-06-29

### Ambiguïtés clarifiées avant implémentation

1. **flushPending() fire-and-forget** (architecture.md §9.3)
   - Les tests supposent que `store.add()` et `store.update()` appellent `sync.flushPending()` **sans await** (fire-and-forget).
   - Justification : specs §4.3/§7.4 indiquent que l'item doit être "enregistré localement" immédiatement et ajouté à la vue F2 sans attendre la sync réseau.
   - **Implémentation** : `add(item)` → save local → enqueue(id) → flushPending() (pas de await). Le formulaire revient immédiatement, la sync se fait en arrière-plan.

2. **syncStatus sur l'item vs flag dirty dans la file**
   - Les specs.md §4.4 et §6.4/§6.5 définissent `syncStatus: "synced" | "pending_create" | "pending_update"` sur les items.
   - L'architecture.md §9.2 définit `factory_pending` comme un simple flag "dirty" indexé par id, sans distinction create/update.
   - **Résolution** : ajouter `syncStatus` à chaque item en localStorage. Mise à jour :
     - À la création (add) → `syncStatus: "pending_create"` si offline, `"synced"` si online et flush réussi
     - À la modification (update) → `syncStatus: "pending_update"` si offline, `"synced"` si online et flush réussi
     - Après flushPending réussi → tous les items en `factory_pending` passent à `"synced"`
   - La file `factory_pending` reste un drapeau "dirty" technique; le vrai état utilisateur est dans l'item.

3. **Distinction create vs update offline**
   - Quand un item est créé offline puis modifié avant sa première sync : remains `syncStatus: "pending_create"` (une seule sync attempt sera needed).
   - Quand un item synced est modifié offline : `syncStatus: "pending_update"`.
   - **Implémentation** : dans `store.update()`, vérifier si l'item existe dans le cache. Si syncStatus == "pending_create", garder ce status ; sinon mettre à "pending_update".

4. **Orchestration boot (main.js hors scope test-writer)**
   - La séquence **flush-puis-fetch** critique est orchestrée en main.js (M-SHELL), pas dans store.js.
   - store.js expose `fetchFromGitHub()` et `pushToGitHub()` ; main.js les appelle.
   - sync.js expose `hasPending()` et `flushPending()` ; main.js les appelle.
   - Tests sync.test.js et store.test.js vérifient chaque module indépendamment.

### Couverture tests vs specs/archi

**sync.test.js** (47 tests) :
- Interface publique complète (isOnline, enqueue, getPending, hasPending, clearPending, flushPending)
- Garde de réentrance (2 flush concurrents → 1 PUT)
- Offline no-op (!navigator.onLine → flushPending() ne fait rien)
- File conservée en cas d'erreur réseau
- Court-circuit si backlog local vide (400)
- Anti-doublons (enqueue même id deux fois → une seule entrée)
- Scénarios BDD F3.2/F3.3 (création offline + sync, modification offline + sync)

**store.test.js** (38 tests) :
- load() avec validation stricte et recovery en cas de corruption
- add() : persistance locale + enqueue + flushPending (fire-and-forget)
- update() : remplace par id + enqueue + flushPending (fire-and-forget)
- save() avec gestion d'erreur quota
- fetchFromGitHub() : GET + cache local update
- pushToGitHub() : PUT avec items du cache
- Intégration offline complète (création/modification offline → sync au retour réseau)

**Total : 85 tests TDD, tous échouant avant implémentation de sync.js et modifications de store.js.**

### Installation et exécution

```bash
npm install
npm test                # Voir les 85 tests échouer avec "Cannot find module '../src/sync.js'"
npm test:watch         # Exécuter en mode watch pendant l'implémentation
npm test:coverage      # Coverage report après implémentation
```

Les tests définissent le contrat exact que sync.js et store.js doivent respecter.
