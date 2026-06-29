## Changelog
| Version | Date | Changements |
|---|---|---|
| v2.0 | 2026-06-29 | Correction persistance (Redis/Upstash KV remplace localStorage comme source de vérité), ajout F3 (support offline — cache, création et modification hors-ligne, sync automatique), ajout F4 (modification d'items) |
| v1.0 | 2026-06-27 | MVP initial — F1 (formulaire création), F2 (vue backlog) |

---

# Cahier des charges fonctionnel — factory-dashboard

**Version** : 2.0
**Date** : 2026-06-29
**Statut** : Gate 1 — v2.0 validée
**Auteur** : specs-framer
**Projet** : `apps/factory-dashboard/`

---

## 1. Description du produit

### 1.1 Contexte

`factory-dashboard` est une application web interne à la Software Factory. Elle sert de tableau de bord opérationnel pour gérer les idées et les travaux en cours de la Factory : projets à créer, features à ajouter à des projets existants.

L'application est destinée à un utilisateur unique (usage solo), sans authentification. Les données sont persistées dans Redis via Upstash KV, avec un cache local qui permet de consulter et modifier le backlog hors-ligne.

### 1.2 Objectif

Permettre à l'utilisateur de créer, modifier et consulter des items de backlog (projets ou features), filtrer et trier la liste, et continuer à travailler sans réseau grâce à un cache local synchronisé automatiquement au retour de connexion.

### 1.3 Positionnement

| Aspect | Valeur |
|---|---|
| Utilisateurs | 1 (solo, l'opérateur de la Factory) |
| Authentification | Aucune |
| Persistance principale | Redis via Upstash KV (clé : `factory:backlog`) |
| Cache offline | localStorage — clé `factory_backlog_cache` |
| Déploiement | Vercel (mono-repo `apps/factory-dashboard/`) |
| Type d'app | SPA web avec détection de connectivité (navigator.onLine) |
| Support offline | Oui — lecture, création et modification hors-ligne, sync automatique |

---

## 2. Périmètre v2.0

### 2.1 Ce que l'application FAIT

- **F1** : Formulaire de création d'un item backlog
- **F2** : Vue liste du backlog avec filtres et tri
- **F3** : Support offline — cache local, création et modification hors-ligne, sync automatique au retour du réseau *(nouveau v2.0)*
- **F4** : Modification d'un item existant *(nouveau v2.0)*

### 2.2 Ce que l'application NE FAIT PAS (hors périmètre)

Les éléments suivants sont exclus et ne doivent pas être implémentés :

- Suppression d'un item
- Archivage ou changement de statut d'un item
- Authentification / gestion de compte
- Export CSV, JSON ou autre format
- Notifications ou rappels
- Vue Kanban ou autre visualisation
- Glisser-déposer (drag-and-drop) pour réordonner
- Historique des modifications
- Champ "date limite" ou calendrier
- Multi-utilisateurs ou partage
- Tags ou labels libres
- Liens entre items (dépendances)
- Gestion de conflits multi-sources (inutile en solo — last-write-wins suffit)

---

## 3. Écrans et navigation

L'application comporte **deux vues principales**, accessibles via une navigation simple en haut de page (ou onglets). Un **indicateur de connectivité** est affiché en permanence dans la navigation.

```
┌────────────────────────────────────────────────┐
│  factory-dashboard              [● En ligne]   │
│  [+ Nouvel item]  [Backlog]                    │  ← barre de navigation
└────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
   Vue F1 : Formulaire   Vue F2 : Backlog
```

### 3.1 F1 — Formulaire de création

**Déclenchement** : clic sur le bouton "+ Nouvel item" dans la navigation, ou accès direct à la route `/new` (si routage activé).

**Rôle** : saisir et valider un nouvel item backlog, puis l'enregistrer dans Redis (ou en file d'attente si hors-ligne).

### 3.2 F2 — Vue Backlog

**Déclenchement** : chargement initial de l'app, ou clic sur "Backlog" dans la navigation.

**Rôle** : afficher la liste de tous les items du cache local, permettre le filtrage, le tri, et l'accès à la modification d'un item.

---

## 4. F1 — Formulaire de création d'un item backlog

### 4.1 Champs du formulaire

| # | Champ | Type UI | Valeurs possibles | Obligatoire | Validation |
|---|---|---|---|---|---|
| 1 | **Type** | `<select>` | `projet`, `feature` | Oui | Doit être l'une des deux valeurs |
| 2 | **Titre** | `<input type="text">` | Texte libre | Oui | Non vide, max 100 caractères |
| 3 | **Description** | `<textarea>` | Texte libre | Non | Max 1 000 caractères |
| 4 | **Priorité** | `<select>` | `haute`, `moyenne`, `basse` | Oui | Doit être l'une des trois valeurs |

### 4.2 Valeurs des champs énumérés

**Type** :
- `projet` — désigne un nouveau projet à créer dans la Factory
- `feature` — désigne une fonctionnalité à ajouter à un projet existant

**Priorité** :
- `haute` — traitement urgent, à faire dès que possible
- `moyenne` — important mais non bloquant
- `basse` — à faire un jour, pas de délai

### 4.3 Comportement du formulaire

**État initial** : formulaire vierge, sans valeur pré-sélectionnée dans les selects (placeholder non-valide : "-- Choisir un type --" / "-- Choisir une priorité --").

**Validation** :
- La validation est déclenchée au clic sur "Enregistrer"
- Si un champ obligatoire est vide ou invalide, afficher un message d'erreur inline sous le champ concerné
- Le formulaire ne se soumet pas tant que tous les champs obligatoires ne sont pas valides

**Messages d'erreur** :
| Cas | Message affiché |
|---|---|
| Type non sélectionné | "Veuillez sélectionner un type." |
| Titre vide | "Le titre est obligatoire." |
| Titre > 100 caractères | "Le titre ne peut pas dépasser 100 caractères." |
| Priorité non sélectionnée | "Veuillez sélectionner une priorité." |
| Description > 1 000 caractères | "La description ne peut pas dépasser 1 000 caractères." |

**Soumission réussie — mode connecté** :
1. L'item est créé avec un identifiant unique (UUID v4) et `syncStatus: "synced"`
2. L'item est envoyé à Redis via l'API Upstash KV
3. Le cache local (`factory_backlog_cache`) est mis à jour
4. Le formulaire est réinitialisé
5. L'utilisateur est redirigé vers la vue F2
6. Toast de confirmation : "Item ajouté au backlog."

**Soumission réussie — mode hors-ligne** :
1. L'item est créé avec un UUID v4 et `syncStatus: "pending_create"`
2. L'item est ajouté au cache local et à la file d'attente de sync (`factory_sync_queue`)
3. Le formulaire est réinitialisé
4. L'utilisateur est redirigé vers la vue F2
5. Toast d'information : "Item ajouté localement. Synchronisation en attente."

### 4.4 Structure d'un item en mémoire

```json
{
  "id": "uuid-v4",
  "type": "projet | feature",
  "titre": "string (max 100)",
  "description": "string (max 1000) | null",
  "priorite": "haute | moyenne | basse",
  "createdAt": "ISO 8601 timestamp",
  "updatedAt": "ISO 8601 timestamp | null",
  "syncStatus": "synced | pending_create | pending_update"
}
```

---

## 5. F2 — Vue Backlog

### 5.1 Affichage de la liste

La vue affiche **tous les items** du cache local, sous forme de cartes ou de lignes de tableau.

Chaque item affiché présente :
- Le **type** (badge visuel : `projet` / `feature`)
- Le **titre** (en évidence, lisible en premier)
- La **priorité** (badge coloré : haute = rouge/orange, moyenne = jaune, basse = gris/vert)
- La **description** (tronquée à 120 caractères avec "..." si trop longue ; affichée en entier si courte)
- La **date de création** (format court : `JJ/MM/AAAA`)
- Un **indicateur de sync** si `syncStatus != "synced"` : icône discrète "en attente de synchronisation"
- Un **bouton "Modifier"** pour accéder à F4

### 5.2 Filtres

Deux filtres indépendants, cumulables, disponibles en haut de la liste :

| Filtre | Type UI | Valeurs |
|---|---|---|
| **Filtrer par type** | `<select>` | "Tous les types", "Projet", "Feature" |
| **Filtrer par priorité** | `<select>` | "Toutes les priorités", "Haute", "Moyenne", "Basse" |

**Comportement des filtres** :
- Les filtres s'appliquent en temps réel à chaque changement de valeur
- Les deux filtres sont combinés par AND
- Valeur par défaut au chargement : "Tous les types" + "Toutes les priorités"
- Les filtres ne persistent pas après rechargement

### 5.3 Tri

Un sélecteur de tri unique, disponible à côté des filtres :

| Option de tri | Comportement |
|---|---|
| "Plus récent d'abord" (défaut) | Tri décroissant sur `createdAt` |
| "Plus ancien d'abord" | Tri croissant sur `createdAt` |
| "Priorité décroissante" | haute > moyenne > basse |
| "Priorité croissante" | basse > moyenne > haute |

Le tri s'applique en temps réel, après application des filtres.

### 5.4 États de la liste

**État vide — aucun item créé** :
- Message centré : "Aucun item dans le backlog."
- Sous-message : "Commencez par ajouter votre premier item."
- Bouton : "+ Ajouter un item" (lien vers F1)

**État vide filtré — des items existent mais aucun ne correspond aux filtres actifs** :
- Message centré : "Aucun item ne correspond à ces filtres."
- Bouton : "Réinitialiser les filtres" (remet les selects à "Tous")

**État normal — items présents** :
- Compteur affiché en haut : "X item(s)" (nombre d'items affichés après filtrage, sur N total)
- Exemple : "3 items sur 7"

### 5.5 Absence de pagination

L'application n'implémente pas de pagination. Tous les items filtrés s'affichent dans un seul défilement vertical. Cette limitation est acceptable pour un usage solo avec un backlog raisonnable (< 100 items).

---

## 6. F3 — Support offline

### 6.1 Cache intégral au chargement connecté

À chaque chargement de l'app en mode connecté :
1. Le backlog complet est récupéré depuis Redis (Upstash KV, clé `factory:backlog`)
2. Il est sauvegardé intégralement dans `localStorage` sous la clé `factory_backlog_cache`
3. Le timestamp de la dernière sync est enregistré sous la clé `factory_last_sync_at`

Objectif : en cas de coupure réseau ultérieure, le cache permet de consulter et d'agir sur la version la plus récente du backlog.

### 6.2 Détection de connectivité

L'app surveille en permanence l'état du réseau via :
- `navigator.onLine` (état initial au chargement)
- Les événements `window.addEventListener('online', ...)` et `window.addEventListener('offline', ...)`

**Indicateur visuel** dans la navigation (bascule immédiate sans délai artificiel) :
- Mode connecté : indicateur discret vert — ex: "● En ligne"
- Mode hors-ligne : badge ou bandeau orange — "● Hors ligne — sync en attente"

### 6.3 Lecture en mode hors-ligne

Quand l'app est chargée ou passe hors-ligne :
- L'app utilise `factory_backlog_cache` pour afficher le backlog
- Les filtres, le tri et la navigation fonctionnent normalement
- L'indicateur "Hors ligne" est affiché

Si le cache est vide (première ouverture sans réseau) :
- Message : "Aucun cache disponible. Connectez-vous pour charger votre backlog."
- Le formulaire de création reste accessible (l'item sera mis en file d'attente)

### 6.4 Création offline

Quand l'utilisateur crée un item sans réseau :
1. L'item est créé avec un UUID v4 et `syncStatus: "pending_create"`
2. L'item est ajouté au cache local (`factory_backlog_cache`)
3. Un ordre de création est ajouté à la file d'attente (`factory_sync_queue`)
4. L'item apparaît immédiatement dans la vue F2 avec un indicateur "en attente de sync"

### 6.5 Modification offline

Quand l'utilisateur modifie un item sans réseau :
1. La modification est appliquée localement dans `factory_backlog_cache`
2. L'item passe à `syncStatus: "pending_update"`
3. Un ordre de modification est ajouté à `factory_sync_queue`
4. L'item modifié apparaît immédiatement dans la liste avec l'indicateur "en attente de sync"

Si un item `pending_create` est modifié offline avant sa sync :
- L'ordre de création dans la file est mis à jour avec les nouvelles valeurs
- Aucun ordre de modification séparé n'est ajouté (fusion pour éviter les doublons de queue)

### 6.6 Synchronisation automatique au retour du réseau

Quand l'événement `window.online` se déclenche :
1. L'app traite `factory_sync_queue` en ordre FIFO
2. Ordres `pending_create` : envoi de l'item à Redis
3. Ordres `pending_update` : mise à jour de l'item dans Redis (last-write-wins)
4. Après chaque sync réussie : `syncStatus` passe à `"synced"` dans le cache local, l'indicateur "en attente" disparaît de l'item
5. La file est vidée progressivement au fil des succès

**Pas de bouton "Synchroniser maintenant"** — la sync est entièrement automatique.

**En cas d'échec de sync** (Redis inaccessible malgré réseau rétabli) :
- L'item reste en `pending_*`
- Une nouvelle tentative est effectuée à la prochaine reconnexion
- Toast non bloquant : "Synchronisation échouée. Nouvel essai à la prochaine connexion."

### 6.7 Anti-doublons

Chaque item possède un UUID v4 généré côté client à la création. Cet UUID sert de clé d'idempotence :
- Lors de la sync, Redis vérifie si l'id existe déjà avant d'insérer
- Si l'id existe : l'insertion est ignorée silencieusement (pas d'erreur, pas de doublon)
- L'ordre est quand même retiré de la file d'attente

---

## 7. F4 — Modification d'un item existant

### 7.1 Déclenchement

La modification est accessible depuis la vue F2, via un bouton "Modifier" affiché sur chaque carte d'item.

### 7.2 Interface de modification

Un formulaire pré-rempli avec les valeurs actuelles de l'item (même disposition que F1) :
- Tous les champs sont éditables : Type, Titre, Description, Priorité
- Les champs `id` et `createdAt` ne sont pas affichés ni modifiables
- Le champ `updatedAt` est mis à jour automatiquement à la soumission

### 7.3 Validation

Mêmes règles de validation que F1 (voir sections 4.1 et 4.3).

### 7.4 Soumission d'une modification

**Mode connecté** :
1. Les nouvelles valeurs sont envoyées à Redis
2. L'item est mis à jour dans le cache local ; `updatedAt` = heure courante, `syncStatus` reste `"synced"`
3. L'utilisateur est redirigé vers F2
4. Toast : "Item modifié."

**Mode hors-ligne** :
1. Les nouvelles valeurs sont appliquées localement ; `updatedAt` = heure courante, `syncStatus` = `"pending_update"`
2. Un ordre de modification est ajouté à `factory_sync_queue`
3. L'utilisateur est redirigé vers F2
4. Toast : "Modification enregistrée localement. Synchronisation en attente."

### 7.5 Résolution de conflit (last-write-wins)

L'application est à usage solo. En cas de désynchronisation (modification locale appliquée pendant une coupure) :
- La version locale est considérée comme la plus récente pour cet utilisateur
- Elle écrase la version Redis sans demande de confirmation
- Pas de gestion de merge ni d'historique de conflits

---

## 8. Règles métier

### 8.1 Unicité

Il n'y a pas de contrainte d'unicité sur le titre. Deux items peuvent avoir le même titre.

### 8.2 Ordre d'affichage par défaut

À l'ouverture de la vue F2, les items sont triés par date de création décroissante.

### 8.3 Persistance

- **Source principale** : Redis via Upstash KV (clé : `factory:backlog`)
- **Cache local** : `localStorage` (clé : `factory_backlog_cache`)
- **File de sync** : `localStorage` (clé : `factory_sync_queue`)
- **Timestamp** : `localStorage` (clé : `factory_last_sync_at`)
- Au chargement connecté : Redis est interrogé en premier, le cache local est mis à jour
- Au chargement hors-ligne : le cache local est utilisé directement

### 8.4 Intégrité des données au chargement

Au démarrage, si la lecture du cache local échoue (données corrompues, format inattendu) :
1. Afficher un message d'avertissement non bloquant : "Cache local illisible, réinitialisé."
2. Tenter de recharger depuis Redis si connecté
3. Si hors-ligne : repartir d'un tableau vide

### 8.5 Pas de suppression

L'application ne permet pas de supprimer un item. C'est une contrainte de scope volontaire.

---

## 9. Contraintes techniques

| Contrainte | Valeur |
|---|---|
| Hébergement | Vercel (mono-repo) |
| Répertoire app | `apps/factory-dashboard/` |
| `package.json` | Propre à l'app, indépendant du repo |
| Persistance principale | Redis via Upstash KV (clé `factory:backlog`) |
| Cache offline | localStorage — clés `factory_backlog_cache`, `factory_sync_queue`, `factory_last_sync_at` |
| Détection connectivité | `navigator.onLine` + événements `online`/`offline` — service worker non requis |
| Framework | Cohérent avec déploiement Vercel (ex: Vite + React, Next.js statique) |
| Navigateur cible | Navigateurs modernes (Chrome, Firefox, Safari) — pas de support IE |
| Responsive | Minimum fonctionnel sur mobile |
| Tests | Non requis dans le périmètre v2.0 |

---

## 10. Critères d'acceptation

### Critères v1.0 (conservés)

| # | Critère | Comment le vérifier |
|---|---|---|
| A1 | L'utilisateur peut remplir F1 et soumettre un item | Saisir type + titre + priorité, cliquer Enregistrer |
| A2 | L'item soumis apparaît dans F2 sans rechargement | Redirection automatique après soumission |
| A3 | Les données survivent à un rechargement de page | F5 → les items sont toujours présents |
| A4 | Le filtre par type réduit correctement la liste | Sélectionner "Feature" → seuls les features apparaissent |
| A5 | Le filtre par priorité réduit correctement la liste | Sélectionner "Haute" → seuls les items haute priorité |
| A6 | Les deux filtres combinés fonctionnent | Type = Feature + Priorité = Haute → intersection correcte |
| A7 | L'état vide affiche un message dédié | Aucun item → message + bouton CTA |
| A8 | L'état vide filtré affiche un message distinct | Filtres sans résultat → message "réinitialiser" |
| A9 | Les erreurs de validation s'affichent au bon endroit | Formulaire vide soumis → messages sous chaque champ |
| A10 | Le tri par priorité décroissante fonctionne | Items haute > moyenne > basse en tête de liste |

### Critères v2.0 — BDD

#### F3.1 — Cache au chargement connecté

**Scénario nominal — cache sauvegardé**
- Étant donné que l'utilisateur charge l'app avec une connexion active
- Quand le backlog est récupéré depuis Redis avec succès
- Alors le contenu complet est écrit dans `factory_backlog_cache` et `factory_last_sync_at` est mis à jour

**Scénario alternatif — chargement depuis cache hors-ligne**
- Étant donné que l'utilisateur ouvre l'app sans connexion réseau et qu'un cache local existe
- Quand l'app tente de récupérer le backlog depuis Redis
- Alors l'app charge `factory_backlog_cache`, l'indicateur "Hors ligne" s'affiche et la liste est consultable normalement

**Scénario d'erreur — premier chargement sans réseau et sans cache**
- Étant donné que l'utilisateur ouvre l'app sans connexion réseau et que `factory_backlog_cache` est vide
- Quand l'app démarre
- Alors le message "Aucun cache disponible. Connectez-vous pour charger votre backlog." s'affiche et le formulaire de création reste accessible

#### F3.2 — Création offline

**Scénario nominal — création d'un item sans réseau**
- Étant donné que l'utilisateur est en mode hors-ligne (indicateur visible)
- Quand il soumet F1 avec un titre et une priorité valides
- Alors l'item apparaît immédiatement dans la vue F2 avec un indicateur "en attente de sync" et le toast "Item ajouté localement. Synchronisation en attente."

**Scénario nominal — sync automatique au retour du réseau**
- Étant donné qu'un item a `syncStatus: "pending_create"` dans le cache local
- Quand la connexion réseau est rétablie
- Alors l'item est envoyé à Redis, son `syncStatus` passe à `"synced"` et l'indicateur "en attente" disparaît de la vue F2

**Scénario d'erreur — anti-doublon lors de sync multiple**
- Étant donné qu'un item créé offline a déjà été synchronisé avec Redis
- Quand la file de sync est traitée une nouvelle fois (reconnexion instable)
- Alors l'item n'est pas créé en double dans Redis (l'UUID existant est reconnu et l'insertion ignorée silencieusement)

#### F3.3 — Modification offline

**Scénario nominal — modification d'un item sans réseau**
- Étant donné que l'utilisateur est en mode hors-ligne et clique "Modifier" sur un item existant
- Quand il modifie la priorité et valide le formulaire
- Alors la modification est appliquée localement, `syncStatus` passe à `"pending_update"` et l'indicateur "en attente" apparaît sur l'item dans F2

**Scénario nominal — sync de la modification au retour du réseau**
- Étant donné qu'un item a `syncStatus: "pending_update"`
- Quand la connexion est rétablie
- Alors la version locale est envoyée à Redis (last-write-wins), `syncStatus` passe à `"synced"` et l'indicateur disparaît

#### F4 — Modification d'un item existant

**Scénario nominal — modification réussie en mode connecté**
- Étant donné que l'utilisateur est connecté et clique "Modifier" sur un item
- Quand il modifie le titre et soumet le formulaire
- Alors le titre est mis à jour dans Redis et dans le cache local, et le toast "Item modifié." s'affiche

**Scénario d'erreur — titre vide à la modification**
- Étant donné que l'utilisateur est sur le formulaire de modification d'un item
- Quand il efface le titre et tente de soumettre
- Alors le message "Le titre est obligatoire." s'affiche sous le champ et aucune modification n'est enregistrée

---

## 11. Glossaire

| Terme | Définition |
|---|---|
| Item | Unité de backlog : un projet ou une feature à réaliser |
| Projet | Type d'item désignant une nouvelle application à créer dans la Factory |
| Feature | Type d'item désignant une fonctionnalité à ajouter à un projet existant |
| Priorité | Niveau d'urgence d'un item : haute, moyenne ou basse |
| Backlog | Liste de tous les items créés |
| Redis / Upstash KV | Base de données clé-valeur cloud utilisée comme stockage principal (clé `factory:backlog`) |
| Cache local | Copie du backlog dans localStorage (clé `factory_backlog_cache`), utilisée hors-ligne |
| File de sync | Tableau d'ordres en attente dans localStorage (clé `factory_sync_queue`), traité automatiquement au retour du réseau |
| syncStatus | Champ d'un item indiquant son état de synchronisation : `synced`, `pending_create`, `pending_update` |
| Last-write-wins | Stratégie de résolution de conflit : la version locale (la plus récente pour l'utilisateur solo) écrase la version distante sans demande de confirmation |
| Factory | La Software Factory — le mono-repo `Software-Factory` et son pipeline de production |
