## Changelog
| Version | Date | Changements |
|---|---|---|
| v1.0 | 2025-06 | MVP initial — F1 à F10 |

---

# Cahier des charges fonctionnel — One Piece Speedrun

## Contexte

Application web permettant aux fans de One Piece de naviguer dans les arcs de la série, de distinguer les épisodes canon des fillers, et d'obtenir des résumés IA des arcs/épisodes filler pour décider de les regarder ou les passer.

**Utilisateurs** : fans de One Piece suivant la série sur la durée, souvent en mobilité (smartphone/tablette).

---

## MVP — Fonctionnalités v1.0

### F1 — Liste des arcs
- Afficher la liste complète des arcs dans l'ordre chronologique
- Chaque carte affiche : nom de l'arc, type (canon / filler / mixte), nombre d'épisodes
- Code couleur : canon = vert, filler = gris, mixte = orange

### F2 — Filtres par type
- Boutons toggle : Canon / Filler / Mixte
- Les filtres sont cumulables (plusieurs types simultanément)
- Bouton "Réinitialiser" remet tous les filtres actifs et vide la recherche

### F3 — Recherche par nom
- Champ de recherche temps réel filtrant les arcs par nom

### F4 — Marquage de la progression
- Bouton "⚓ Je suis ici" sur chaque carte d'arc
- L'arc courant est mis en évidence (bordure or + glow)
- Au chargement, scroll automatique vers l'arc courant
- Persistance en localStorage (survit aux rechargements)

### F5 — Vue détail d'un arc
- Clic sur la carte ouvre la liste de tous les épisodes de l'arc
- Chaque épisode affiche : numéro, titre, type (badge)
- Bouton retour vers la liste des arcs

### F6 — Résumé IA d'un épisode filler
- Disponible uniquement sur les épisodes de type "filler"
- Génération via Gemini 2.5 Flash (serverless function `/api/summary`)
- Résumé en français, 3-4 phrases, sans spoiler la suite
- Affichage inline sous l'épisode concerné

### F7 — Résumé IA d'un arc filler entier
- Disponible uniquement sur les arcs de type "filler"
- Résumé en français, 5-6 phrases, vue liste des arcs
- Badge 💾 si déjà mis en cache, 📖 sinon

### F8 — Cache et mode hors-ligne
- Données des arcs/épisodes chargées depuis `data/one-piece.json`
- Mise en cache locale au premier chargement (localStorage)
- Service Worker : cache les assets statiques pour un fonctionnement hors-ligne
- Résumés IA mis en cache localStorage (pas de re-génération)
- Détection `navigator.onLine` : message d'erreur si hors connexion lors d'une génération

### F9 — Rafraîchissement manuel des données
- Bouton ⟳ dans le header
- Force le rechargement du JSON depuis le réseau (cache-buster)
- Animation de rotation pendant le chargement

### F10 — PWA installable
- `manifest.json` avec icônes 192px et 512px
- Service Worker enregistré au chargement
- Thème pirate : fond sombre, typographies Crimson Text + Pirata One

---

## V2+ — Fonctionnalités futures

- **Suivi épisode par épisode** : marquer des épisodes individuels comme vus
- **Stats de progression** : % vu, nombre d'épisodes restants dans l'arc courant
- **Refonte graphique** : animations de transition, illustrations par arc
- **Partage** : partager sa progression via URL
