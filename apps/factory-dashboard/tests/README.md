# Test Suite — factory-dashboard v2.0

## Overview

85 tests Jest couvrant le support offline (v2.0) de factory-dashboard.

**Mode** : TDD (tests-first). Les tests échouent aujourd'hui (sync.js n'existe pas) — c'est normal et attendu. Implémentation suivra.

**Coverage cible** : >75% des lignes, >70% des branches.

---

## Structure

```
tests/
├── sync.test.js          # 47 tests — M-SYNC (file d'attente + sync réseau)
├── store.test.js         # 38 tests — M-STORE (persistance locale + mutations)
└── README.md             # ce fichier
```

---

## Exécution

```bash
# Installer dépendances (si pas encore fait)
npm install

# Lancer tous les tests
npm test

# Mode watch (idéal pour développement)
npm test:watch

# Coverage report
npm test:coverage
```

**Attention** : Au premier `npm test`, vous verrez 85 tests échouer avec l'erreur :
```
Cannot find module '../src/sync.js'
```

C'est normal — sync.js n'existe pas encore. Une fois implémenté, les tests commenceront à passer.

---

## Ce que testent les suites

### sync.test.js — M-SYNC (Synchronisation offline)

**Interface publique** (6 fonctions) :
- `isOnline(): boolean` — retourne `navigator.onLine`
- `enqueue(id, op?): void` — ajoute un id à la file `factory_pending`
- `getPending(): Object` — retourne la file complète
- `hasPending(): boolean` — true si file non vide
- `clearPending(): void` — vide la file
- `flushPending(): Promise<void>` — synchronise le local vers Redis si online + file non vide

**Cas critiques** (nommés dans architecture.md §11 Risques) :
1. **Garde de réentrance** : deux appels concurrents à flushPending() → un seul PUT
2. **Offline no-op** : flushPending() quand `!navigator.onLine` → ne rien faire
3. **PUT 400 si vide** : si backlog local est vide → vider la file sans PUT
4. **Réseau échoue** : si fetch() rejette → conserver la file
5. **Anti-doublons** : même id enqueueé 2× → une seule entrée en file

**Scénarios BDD** (tracés aux specs.md) :
- F3.2 : création offline → item présent + file non-vide → sync au retour réseau
- F3.3 : modification offline → idem

### store.test.js — M-STORE (Persistance locale)

**Fonctions existantes** :
- `load(): { items: [], corrupted: boolean }` — charge et valide le cache
- `getAll(): []` — retourne items sans flag
- `save(items)` — écrit dans localStorage
- `fetchFromGitHub(): Promise` — GET /api/backlog
- `pushToGitHub(items): Promise` — PUT /api/backlog

**Fonctions modifiées (v2.0)** :
- `add(item)` — ajout local + enqueue + flushPending
- `update(item)` — NOUVEAU v2.0, remplace par id + enqueue + flushPending

**Cas couverts** :
- Validation stricte des items (id, type, titre, priorite, createdAt requis)
- Recovery en cas de corruption localStorage
- Fire-and-forget flushPending() (pas de await, ne bloque pas l'UI)
- Intégration offline complète (création + modification offline → sync au retour réseau)

---

## Traçabilité Specs → Tests

Chaque scenario BDD des specs.md sections F3/F4 a un test correspondant :

| Spec | Test | Fichier | Lignes |
|---|---|---|---|
| F3.1 cache nominal | "cache sauvegardé au chargement" | store.test.js | ~XX |
| F3.1 offline sans cache | "chargement depuis cache hors-ligne" | store.test.js | ~XX |
| F3.2 création offline | "création d'item sans réseau" | sync.test.js | "Cas critique #1" |
| F3.2 sync retour réseau | "sync automatique au retour du réseau" | sync.test.js | "Scénarios intégrés" |
| F3.2 anti-doublon | "anti-doublon lors de sync multiple" | sync.test.js | "Cas critique #3" |
| F3.3 modification offline | "modification d'un item sans réseau" | store.test.js | `update()` offline |
| F3.3 sync modification | "sync de la modification" | store.test.js | intégration offline |
| F4 modification connecté | "modification réussie en mode connecté" | store.test.js | `update()` online |

---

## Architecture des Tests

### Mocking Strategy

| Cible | Mock | Raison |
|---|---|---|
| `localStorage` | `jest-localstorage-mock` | Isolation, zéro I/O réel |
| `fetch()` | `jest.fn().mockResolvedValue()` | Simuler réponses Redis |
| `navigator.onLine` | `Object.defineProperty()` | Basculer online/offline au cours des tests |
| `crypto.randomUUID()` | `jest.fn()` counter | Déterministe (test-uuid-0, test-uuid-1...) |

### Setup files

| Fichier | Rôle |
|---|---|
| `jest.config.js` | Config Jest pour ESM (`transform: {}`) |
| `jest.setup.js` | Imports globales (jest-localstorage-mock + mocks navigator/crypto) |

---

## Interprétation des résultats

### Quand les tests passent

- [ ] sync.test.js : 47/47 ✓
- [ ] store.test.js : 38/38 ✓
- [ ] Coverage : >75% lignes, >70% branches

→ L'implémentation respecte le contrat offline. Prêt pour code-reviewer.

### Quand un test échoue

Lire le message d'erreur Jest. Exemples :

```
FAIL sync.test.js
  ● flushPending() — double flush concurrent
    expect(fetch).toHaveBeenCalledTimes(1)
    Received: 2
```
→ La garde réentrance (`flushing`) n'est pas implémentée. Ajouter un sémaphore.

```
FAIL store.test.js
  ● add() appelle sync.flushPending()
    expect(sync.flushPending).toHaveBeenCalled()
    Received: jest.fn() was not called
```
→ store.add() n'appelle pas flushPending(). Ajouter l'appel après enqueue().

---

## Checklist implémentation

Avant de passer le code à code-reviewer :

- [ ] `npm test` → 85/85 tests passent
- [ ] `npm test:coverage` → >75% couverture
- [ ] Aucun console.error non-géré
- [ ] Aucun TODO/FIXME bloquant en comment
- [ ] sync.js implémente exactement les 6 fonctions du contrat
- [ ] store.js modifié : add() + update() + sync imports
- [ ] architecture.md §9 mis à jour avec vraies implémentations

---

## Dépannage

### "Cannot find module '../src/sync.js'"
Cela signifie sync.js n'existe pas encore. C'est attendu avant l'implémentation. Une fois sync.js créé, les imports se résoudront.

### Tests hanging / timeout
Possible si flushPending() n'a pas la garde réentrance (`flushing`). Ajouter un flag global et le mettre à true/false avant/après le fetch.

### "QuotaExceededError" en localStorage
Les tests gèrent ce cas. Mais si vous voyez ça en production → réduire la taille des items ou implémenter de la compression (hors scope v2.0).

---

## Pour plus de détails

- Voir `docs/specs.md` pour les scénarios BDD complets (sections F3/F4)
- Voir `docs/architecture.md` §9 pour le design de sync.js
- Voir `docs/inter-agent.md` pour les clarifications technique et ambiguïtés résolues

---

**Status** : TDD phase 1 ✓ (tests écrits) → phase 2 = implémentation → phase 3 = review
