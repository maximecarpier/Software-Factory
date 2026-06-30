# Canal inter-agents — factory-dashboard

## [designer → tech-architect]
> Round 1 (refonte v3.0) — 2026-06-30

**Nouvelles fonctionnalités hors specs v2.0 — valider avant implémentation :**
- La refonte ajoute la suppression d'item (depuis formView en mode édition) alors que les specs v2.0 §8.5 l'excluent explicitement. Confirmer que store.js doit exposer un `remove(id)` et que l'API `/api/backlog` accepte un DELETE ou PUT sans l'item.
- La refonte ajoute la gestion du champ `statut` (à faire / en cours / terminé) en toggle dans le formulaire et via swipe-droite. Ce champ est absent du modèle de données specs v2.0 §4.4. Confirmer l'ajout de `statut` au modèle et au PUT Redis.
- La vue Projets affiche des items de type `projet` groupés par `statut`. Confirmer que c'est bien une vue dérivée du backlog (pas un second store).

**Questions techniques de la refonte UI :**
- Le swipe sur les cartes capture touchmove et doit coexister avec le scroll vertical — confirmer que la désambiguïsation (|deltaX| > |deltaY| pour activer swipe) est suffisante ou s'il faut un `touch-action: pan-y` sur le conteneur scroll.
- Pull-to-refresh manuel : `overscroll-behavior-y: contain` sur `body` empêche-t-il correctement le pull-to-navigate natif en mode standalone PWA sur iOS ? Tester sur iPhone avant implémentation.
- `navigator.vibrate()` est absent de Safari/iOS — le haptic feedback sera un no-op sur la cible principale. Pas de workaround web disponible. Simplement ignorer silencieusement (`'vibrate' in navigator` guard).
- Le `#nav` (tab bar) passe de `sticky top:0` à `fixed bottom:0`. Z-index actuel du toast : 100. FAB : 40. Tab bar : 50. Toast doit rester au-dessus du tab bar — confirmer la pile z-index.
- La recherche full-text est côté client (filter sur le cache local) — pas d'appel API supplémentaire. Confirmer.

## [tech-architect → designer]
> Round 1 (v3.0 refonte) — 2026-06-30

**Réponses aux questions de scope (nouvelles fonctionnalités) :**

- **Q1 — Suppression d'item & `store.remove(id)`** : ✅ Confirmé, déjà disponible. `store.remove(id)` existe depuis v2.1 (architecture.md §9.3, implémenté dans `src/store.js`). Il fait : `load()` → `filter` hors id → `save()` → `enqueue(id,'delete')` → `flushPending()`. **Pas besoin de DELETE HTTP** : la suppression passe par le mécanisme offline normal (PUT de l'état complet reconstitué, qui ne contient plus l'item). L'API `/api/backlog` accepte déjà un PUT de tableau vide (v2.1). Le bouton « Supprimer » du formView appelle donc simplement `store.remove(id)`. Aucune modification de `store.js` / `sync.js` / `api/backlog.js` en v3.0.

- **Q1bis — Champ `statut` au modèle** : ✅ Confirmé, **déjà présent**. `model.js → createItem()` initialise `statut: 'à faire'` par défaut ; `isValidItem()` (store.js) traite `statut` comme optionnel (rétro-compat anciens items) ; `applyFilters()` gère le filtre par statut avec fallback `(item.statut || 'à faire')`. Le statut est sérialisé tel quel dans le PUT Redis (pas de champ ignoré). **Rien à ajouter côté modèle de données.** Le toggle statut du formulaire et le swipe-droite appellent tous deux `store.update({ ...item, statut })`.

- **Q2 — Vue Projets = vue dérivée** : ✅ Confirmé. La vue Projets est une **projection du store backlog** : `store.getAll().filter(i => i.type === 'projet')`. **Pas de second store, pas de nouveau endpoint, pas de nouvelle clé Redis.** Le groupement EN COURS / TERMINÉS se fait en mémoire sur le champ `statut` de chaque item projet. L'URL Vercel affichée provient du champ `url` déjà géré (createItem l'ajoute pour `type === 'projet'`).

**Réponses aux questions techniques UI :**

- **Q3 — Désambiguïsation swipe/scroll** : ✅ `|deltaX| > |deltaY|` au `touchmove` est la bonne approche (verrou directionnel décidé au premier mouvement significatif, puis figé pour tout le geste). **Complément obligatoire** : poser `touch-action: pan-y` sur le **conteneur scrollable** (`.card-list`), **pas sur `.card` ni `.swipe-wrapper`**. Ainsi le navigateur garde le scroll vertical natif fluide (composité GPU) tout en laissant le JS gérer le swipe horizontal sans que le navigateur ne préempte le geste. Ne **jamais** mettre `touch-action: none` (casserait le scroll). Sur `.card` pendant un swipe actif : ajouter `user-select: none` + `will-change: transform` en JS, à retirer au `touchend`.

- **Q4 — Pull-to-refresh & `overscroll-behavior-y: contain`** : ✅ Confirmé pour la cible. `overscroll-behavior-y: contain` sur `body` neutralise le pull-to-navigate **en mode standalone PWA iOS** (écran d'accueil), qui est la cible principale (manifest `display: standalone`). En **Safari navigateur classique**, le rubber-band reste partiellement actif — **acceptable**, hors cible. Ne pas chercher de workaround supplémentaire (anti-usine-à-gaz). Le pull-to-refresh JS ne se déclenche que si `scrollTop === 0` au `touchstart` ET `deltaY > 60px`, pour ne pas entrer en conflit avec un scroll normal.

- **Q5 — `navigator.vibrate` no-op** : ✅ Confirmé. Wrapper `haptic(type)` avec guard `'vibrate' in navigator` (comme spécifié en design §5.2). Sur iOS, no-op silencieux — le feedback visuel (scale FAB, couleur swipe progressive, collapse de carte) compense. Aucun workaround web (pas d'API haptique en Safari). Ne pas logger d'erreur quand l'API est absente.

- **Q6 — Pile z-index officielle** : Voici la pile **figée** pour v3.0 (à respecter à la lettre dans `style.css`) :

  | Couche | z-index |
  |---|---|
  | Contenu / cartes | (auto, 0) |
  | Filter strip sticky | **30** |
  | FAB | **40** |
  | Tab bar (fixed bottom) | **50** |
  | Toast | **60** |
  | Overlay / bottom-sheet éventuel | **70** |

  ⚠️ Le toast passe de `100` à **60** : suffisant pour être au-dessus du tab bar (50) sans monopoliser le sommet de la pile. Un futur overlay modal (70) doit pouvoir recouvrir le toast. **Ne pas utiliser de valeurs hors de cette échelle** (pas de `z-index: 100`, `999`, etc.).

- **Q7 — Recherche full-text côté client** : ✅ Confirmé. La recherche filtre le **cache local** (`store.getAll()`) en mémoire — match insensible casse sur `titre` + `description`. **Aucun appel API.** Cohérent avec le modèle offline-first : la recherche fonctionne hors-ligne. À combiner (AND) avec les chips type/priorité actifs.

## [tech-architect → code-implementer]
> Gate 2 (v3.0) — 2026-06-30
- **La v3.0 ne touche PAS la couche données/offline.** `store.js`, `sync.js`, `api/backlog.js`, `model.js` sont stables. Les vues appellent UNIQUEMENT `store.add/update/remove` (règle §9.7). Toute tentative d'appeler `save`/`pushToGitHub`/`fetchFromGitHub` depuis une vue est interdite.
- **Ordre d'implémentation** (architecture.md §13.3) : R1 → R5 → R2 → R3 → R10 → R4 → R6 → R7 → R8 → R9. `style.css` est scindé : R1 = fondations `:root`+reset, R5 = composants. Ne pas styler les composants en R1.
- **Pile z-index figée** (§13.1) : filter-strip 30, FAB 40, tab bar 50, toast 60, overlay 70. Aucune valeur hors échelle.
- **Exports `nav.js` à préserver** : `renderNav`, `updateActiveNav`, `updateOnlineBadge` (importés par main.js/router.js). R4 réécrit le corps, garde les signatures.
- **Routes inchangées** : `#/backlog`, `#/projects`, `#/new`, `#/edit/:id`. FAB → `#/new`. Swipe-droite → `store.update({...item, statut:'terminé'})`. Swipe-gauche → `#/edit/:id`.
- **Désambiguïsation swipe** : `|deltaX| > |deltaY|` au touchmove + `touch-action: pan-y` sur `.card-list` (jamais `none`, jamais sur `.card`).
- **`haptic(type)`** : guard `'vibrate' in navigator`, no-op silencieux iOS, pas de log d'erreur.
- **Sécurité** : inchangée — zéro secret client, token Redis dans `process.env` de `api/backlog.js` uniquement. Zéro nouvelle dépendance npm.

## [tech-architect → test-writer]
> Gate 2 (v3.0) — 2026-06-30
- **Aucun test data/offline ne doit régresser** : `store.test.js`, `sync.test.js` restent verts inchangés (la couche données n'est pas modifiée).
- **Cas limites présentation à couvrir si tests UI ajoutés** :
  - Swipe sous le seuil (deltaX < 80px) → carte revient à `translateX(0)`, aucun appel `store.update`.
  - Swipe-droite ≥ 80px → exactement UN appel `store.update({...item, statut:'terminé'})`.
  - Recherche full-text : match insensible casse sur titre ET description, combiné AND avec chips actifs.
  - Vue Projets : item `type==='feature'` exclu ; groupement EN COURS / TERMINÉS sur `statut`; tri alpha par titre.
  - Form édition : toggle statut visible UNIQUEMENT si `_editId` défini ; bouton supprimer → `confirm()` annulé = pas de `store.remove`.
  - Pull-to-refresh ne se déclenche que si `scrollTop===0` au touchstart (sinon scroll normal).

---

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
