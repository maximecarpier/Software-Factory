# Cahier des charges fonctionnel — factory-dashboard

**Version** : 1.0  
**Date** : 2026-06-27  
**Statut** : Gate 1 — en attente de validation  
**Auteur** : specs-framer  
**Projet** : `apps/factory-dashboard/`

---

## 1. Description du produit

### 1.1 Contexte

`factory-dashboard` est une application web interne à la Software Factory. Elle sert de tableau de bord opérationnel pour gérer les idées et les travaux en cours de la Factory : projets à créer, features à ajouter à des projets existants.

L'application est destinée à un utilisateur unique (usage solo), sans authentification, sans backend. Toutes les données sont persistées localement dans le navigateur via `localStorage`.

### 1.2 Objectif MVP

Permettre à l'utilisateur de créer des items de backlog (projets ou features), de les consulter en liste et de les filtrer pour retrouver rapidement ce qui est prioritaire ou d'un certain type.

### 1.3 Positionnement

| Aspect | Valeur |
|---|---|
| Utilisateurs | 1 (solo, l'opérateur de la Factory) |
| Authentification | Aucune |
| Persistance | `localStorage` uniquement |
| Déploiement | Vercel (mono-repo `apps/factory-dashboard/`) |
| Type d'app | SPA web classique — pas de PWA |

---

## 2. Périmètre MVP

### 2.1 Ce que le MVP FAIT

- **F1** : Formulaire de création d'un item backlog
- **F2** : Vue liste du backlog avec filtres et tri

### 2.2 Ce que le MVP NE FAIT PAS (hors périmètre explicite)

Les éléments suivants sont exclus du MVP et ne doivent pas être implémentés :

- Modification ou édition d'un item existant
- Suppression d'un item
- Archivage ou changement de statut d'un item
- Authentification / gestion de compte
- Synchronisation avec un backend ou une base de données
- Export CSV, JSON ou autre format
- Notifications ou rappels
- Vue Kanban ou autre visualisation
- Glisser-déposer (drag-and-drop) pour réordonner
- Historique des modifications
- Champ "date limite" ou calendrier
- Mode hors-ligne / cache service worker
- Multi-utilisateurs ou partage
- Tags ou labels libres
- Liens entre items (dépendances)

---

## 3. Écrans et navigation

L'application comporte **deux vues**, accessibles via une navigation simple en haut de page (ou onglets).

```
┌──────────────────────────────────────────┐
│  factory-dashboard                       │
│  [+ Nouvel item]  [Backlog]              │  ← barre de navigation
└──────────────────────────────────────────┘
         │                    │
         ▼                    ▼
   Vue F1 : Formulaire   Vue F2 : Backlog
```

### 3.1 F1 — Formulaire de création

**Déclenchement** : clic sur le bouton "+ Nouvel item" dans la navigation, ou accès direct à la route `/new` (si routage activé).

**Rôle** : saisir et valider un nouvel item backlog, puis l'enregistrer dans `localStorage`.

### 3.2 F2 — Vue Backlog

**Déclenchement** : chargement initial de l'app, ou clic sur "Backlog" dans la navigation.

**Rôle** : afficher la liste de tous les items créés, permettre le filtrage et le tri.

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

**État initial** : formulaire vierge, sans valeur pré-sélectionnée dans les selects (afficher un placeholder non-valide : "-- Choisir un type --" / "-- Choisir une priorité --").

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

**Soumission réussie** :
1. L'item est créé avec un identifiant unique (UUID v4 ou `Date.now()` en fallback)
2. L'item est sérialisé et ajouté au tableau dans `localStorage` (clé : `factory_backlog`)
3. Le formulaire est réinitialisé (remise à blanc de tous les champs)
4. L'utilisateur est redirigé vers la vue F2 (Backlog)
5. Un message de confirmation est affiché brièvement (toast ou bandeau) : "Item ajouté au backlog."

### 4.4 Structure d'un item en mémoire

```json
{
  "id": "uuid-v4",
  "type": "projet | feature",
  "titre": "string (max 100)",
  "description": "string (max 1000) | null",
  "priorite": "haute | moyenne | basse",
  "createdAt": "ISO 8601 timestamp"
}
```

---

## 5. F2 — Vue Backlog

### 5.1 Affichage de la liste

La vue affiche **tous les items** stockés dans `localStorage`, sous forme de cartes ou de lignes de tableau.

Chaque item affiché présente :
- Le **type** (badge visuel : `projet` / `feature`)
- Le **titre** (en évidence, lisible en premier)
- La **priorité** (badge coloré : haute = rouge/orange, moyenne = jaune, basse = gris/vert)
- La **description** (tronquée à 120 caractères avec "..." si trop longue ; affichée en entier si courte)
- La **date de création** (format court : `JJ/MM/AAAA`)

### 5.2 Filtres

Deux filtres indépendants, cumulables, disponibles en haut de la liste :

| Filtre | Type UI | Valeurs |
|---|---|---|
| **Filtrer par type** | `<select>` | "Tous les types", "Projet", "Feature" |
| **Filtrer par priorité** | `<select>` | "Toutes les priorités", "Haute", "Moyenne", "Basse" |

**Comportement des filtres** :
- Les filtres s'appliquent en temps réel (sans rechargement de page) à chaque changement de valeur
- Les deux filtres sont combinés par AND : un item doit satisfaire les deux critères pour apparaître
- Valeur par défaut au chargement : "Tous les types" + "Toutes les priorités" (liste complète visible)
- Les filtres ne persistent pas après rechargement (état local non sauvegardé)

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

Le MVP n'implémente pas de pagination. Tous les items filtrés s'affichent dans un seul défilement vertical. Cette limitation est acceptable pour un usage solo avec un backlog raisonnable (< 100 items).

---

## 6. Règles métier

### 6.1 Unicité

Il n'y a pas de contrainte d'unicité sur le titre. Deux items peuvent avoir le même titre — c'est à l'utilisateur de les distinguer.

### 6.2 Ordre d'affichage par défaut

À l'ouverture de la vue F2, les items sont triés par date décroissante : le dernier item créé apparaît en premier.

### 6.3 Persistance

- Toute création d'item est immédiatement persistée dans `localStorage`
- La clé de stockage est `factory_backlog`
- La valeur est un tableau JSON sérialisé : `JSON.stringify(items[])`
- Au chargement de l'app, le tableau est lu depuis `localStorage` et désérialisé

### 6.4 Intégrité des données au chargement

Au démarrage, si la lecture de `localStorage` échoue (données corrompues, format inattendu), l'application :
1. Affiche un message d'avertissement non bloquant : "Données locales illisibles, backlog réinitialisé."
2. Repart d'un tableau vide
3. Écrase les données corrompues avec un tableau vide

### 6.5 Pas de modification / suppression

Le MVP ne permet pas de modifier ou de supprimer un item une fois créé. C'est une contrainte de scope volontaire.

---

## 7. Contraintes techniques

| Contrainte | Valeur |
|---|---|
| Hébergement | Vercel (mono-repo) |
| Répertoire app | `apps/factory-dashboard/` |
| `package.json` | Propre à l'app, indépendant du repo |
| Stockage | `localStorage` uniquement — pas de fetch, pas d'API |
| Type d'app | SPA web classique — pas de PWA (pas de service worker) |
| Framework | Libre — cohérent avec déploiement Vercel rapide (ex: Vite + React, Vite + Vanilla, Next.js statique) |
| Navigateur cible | Navigateurs modernes (Chrome, Firefox, Safari) — pas de support IE |
| Responsive | Minimum fonctionnel sur mobile (pas de design mobile-first imposé) |
| Tests | Non requis dans le MVP |

---

## 8. Critères d'acceptation

Le MVP est considéré livrable si et seulement si :

| # | Critère | Comment le vérifier |
|---|---|---|
| A1 | L'utilisateur peut remplir le formulaire F1 et soumettre un item | Saisir type + titre + priorité, cliquer Enregistrer |
| A2 | L'item soumis apparaît dans la vue F2 sans rechargement de page | Redirection automatique après soumission |
| A3 | Les données survivent à un rechargement de la page | F5 → les items sont toujours présents |
| A4 | Le filtre par type réduit correctement la liste | Sélectionner "Feature" → seuls les features apparaissent |
| A5 | Le filtre par priorité réduit correctement la liste | Sélectionner "Haute" → seuls les items haute priorité apparaissent |
| A6 | Les deux filtres combinés fonctionnent | Type = Feature + Priorité = Haute → intersection correcte |
| A7 | L'état vide affiche un message dédié | Aucun item créé → message + bouton CTA |
| A8 | L'état vide filtré affiche un message distinct | Filtres sans résultat → message "réinitialiser" |
| A9 | Les erreurs de validation sont affichées au bon endroit | Soumettre formulaire vide → messages sous chaque champ |
| A10 | Le tri par priorité décroissante fonctionne | Items haute > moyenne > basse en tête de liste |

---

## 9. Glossaire

| Terme | Définition |
|---|---|
| Item | Unité de backlog : un projet ou une feature à réaliser |
| Projet | Type d'item désignant une nouvelle application à créer dans la Factory |
| Feature | Type d'item désignant une fonctionnalité à ajouter à un projet existant |
| Priorité | Niveau d'urgence d'un item : haute, moyenne ou basse |
| Backlog | Liste de tous les items créés, non triés par défaut |
| localStorage | API de stockage du navigateur, persistante entre sessions, limitée au domaine |
| Factory | La Software Factory — le mono-repo `Software-Factory` et son pipeline de production |
