# Design System — factory-dashboard (refonte v3.0)

**Version** : 3.0
**Date** : 2026-06-30
**Auteur** : designer
**Statut** : livrable — prêt pour code-implementer

---

## Changelog

| Version | Date | Changements |
|---|---|---|
| v3.0 | 2026-06-30 | Refonte complète iOS-first : tab bar bottom, FAB, swipe gestures, filter chips, skeleton loading, pull-to-refresh, carte avec bord coloré priorité, formulaire toggles, vue Projets |
| v1.0 | 2026-06-29 | Design initial — navigation top, cartes basiques, filtres selects |

---

## 1. Système visuel

### 1.1 Variables CSS (remplacement intégral de `:root`)

```css
:root {
  /* ── Couleurs fondamentales ─────────────────────────────── */
  --color-bg:           #f9fafb;   /* fond principal (iOS gray-50) */
  --color-surface:      #ffffff;   /* cartes, panneaux, tab bar */
  --color-border:       #e5e7eb;   /* bordures légères */
  --color-text:         #111827;   /* texte principal */
  --color-muted:        #6b7280;   /* texte secondaire, labels */
  --color-accent:       #2563eb;   /* actions, active states, FAB */
  --color-accent-hover: #1d4ed8;   /* hover sur accent */
  --color-subtle:       #f3f4f6;   /* surface secondaire (chip inactive, input bg) */
  --color-error:        #dc2626;   /* erreurs, bouton danger */

  /* ── Priorités (bord gauche des cartes) ─────────────────── */
  --color-prio-haute:   #ef4444;   /* rouge */
  --color-prio-moyenne: #f97316;   /* orange */
  --color-prio-basse:   #d1d5db;   /* gris clair */

  /* ── Statuts (badges projets) ───────────────────────────── */
  --color-statut-cours-bg:     #dbeafe;   /* bleu pâle */
  --color-statut-cours-text:   #1d4ed8;
  --color-statut-termine-bg:   #d1fae5;   /* vert pâle */
  --color-statut-termine-text: #065f46;

  /* ── Actions swipe ──────────────────────────────────────── */
  --color-swipe-done:  #22c55e;   /* vert — terminé */
  --color-swipe-edit:  #3b82f6;   /* bleu — éditer */

  /* ── Rayons (iOS-first) ─────────────────────────────────── */
  --radius-sm:   8px;    /* badges, boutons petits */
  --radius-md:   12px;   /* cartes backlog */
  --radius-lg:   16px;   /* bottom sheet, overlay */
  --radius-pill: 999px;  /* chips filtres, toast, FAB */

  /* ── Ombres ─────────────────────────────────────────────── */
  --shadow-card: 0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-fab:  0 4px 16px rgba(37,99,235,0.35);
  --shadow-tab:  0 -1px 0 rgba(0,0,0,0.08);

  /* ── Typographie ────────────────────────────────────────── */
  --font: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI',
          system-ui, sans-serif;
  --font-size-xs:   12px;
  --font-size-sm:   13px;
  --font-size-base: 15px;   /* taille de base iOS (pas 16px) */
  --font-size-md:   17px;
  --font-size-lg:   20px;
  --font-size-xl:   24px;

  /* ── Espacements ────────────────────────────────────────── */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  /* ── Layout mobile ──────────────────────────────────────── */
  --tab-bar-height:   49px;   /* hauteur visible du tab bar */
  --fab-size:         56px;   /* diamètre du FAB */
  --touch-min:        44px;   /* taille minimale zone tactile */
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);

  /* ── Transitions ────────────────────────────────────────── */
  --transition-fast:   150ms ease;
  --transition-base:   250ms ease;
  --transition-spring: 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### 1.2 Typographie

```
Titre de section       : 20px, weight 700, color: --color-text
Titre de carte         : 15px, weight 600, color: --color-text
Corps / description    : 13px, weight 400, color: --color-muted
Label (filtre, champ)  : 12px, weight 600, color: --color-muted, uppercase, letter-spacing 0.05em
Badge / chip texte     : 12px, weight 600
Tab label              : 10px, weight 500, color: --color-muted (active: --color-accent)
```

### 1.3 Espacement et grille mobile

- Marge latérale du contenu : `16px` (invariable)
- Gap entre cartes : `8px`
- Padding interne carte : `16px 16px 14px 16px`
- Max-width conteneur : `560px` centré sur tablette, pleine largeur sur mobile
- **Pas de max-width en dessous de 560px** — l'interface prend toute la largeur

---

## 2. Wireframes ASCII

### 2.1 Écran Backlog (état normal)

```
┌─────────────────────────────────────────┐  ← 390px (iPhone 15)
│ ░░░░░ STATUS BAR (safe area) ░░░░░░░░  │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │  ← filter-strip (sticky, fond blanc)
│ │ 🔍 Rechercher…                      │ │    hauteur: 40px
│ └─────────────────────────────────────┘ │
│ [Projet] [Feature ●]  [Haute] [Moyenne ●]│  ← chips multi-select (scroll horizontal)
│                                         │    hauteur: 32px par chip
│  3 items sur 7                          │  ← compteur
│                                         │
│ ┌─┬───────────────────────────────────┐ │  ← carte priorité HAUTE
│ │█│ Refonte UI dashboard       ✓ SYNC│ │    bord gauche: 4px rouge
│ │█│ FEATURE  ·  factory-dashboard    │ │    √ = syncStatus synced (discret)
│ │ │ Redesigner la navigation pour…   │ │
│ └─┴───────────────────────────────────┘ │
│                                         │
│ ┌─┬───────────────────────────────────┐ │  ← carte priorité MOYENNE
│ │▒│ App de tracking lectures          │ │    bord gauche: 4px orange
│ │▒│ PROJET  ·  —                      │ │    ⏳ = pending_create (discret)
│ │ │ Une app pour noter les livres…    │ │
│ └─┴───────────────────────────────────┘ │
│                                         │
│ ┌─┬───────────────────────────────────┐ │  ← carte priorité BASSE
│ │░│ Export CSV du backlog             │ │    bord gauche: 4px gris
│ │░│ FEATURE  ·  factory-dashboard    │ │
│ │ │                                   │ │
│ └─┴───────────────────────────────────┘ │
│                                         │
│                              ┌─────────┐│  ← FAB
│                              │    +    ││    56px, bleu, shadow
│                              └─────────┘│
├─────────────────────────────────────────┤
│       [Backlog ●]    [  Projets  ]      │  ← tab bar, 49px + safe area
│ ░░░░░░░░ SAFE AREA BOTTOM ░░░░░░░░░░  │
└─────────────────────────────────────────┘
```

### 2.2 Carte en action swipe

```
── SWIPE DROITE → TERMINÉ ──────────────────

 ┌─────────────────────────────────────────┐
 │ [  ✓ Terminé  ] ←─── carte glisse →    │
 │  fond vert #22c55e      item suit       │
 └─────────────────────────────────────────┘
 Seuil : 80px → action déclenchée, carte masquée

── SWIPE GAUCHE → ÉDITER ───────────────────

 ┌─────────────────────────────────────────┐
 │    ← carte glisse ───→ [  ✏  Éditer  ] │
 │                          fond bleu #3b82f6│
 └─────────────────────────────────────────┘
 Seuil : 80px → navigation vers formView (mode édition)

── EN DESSOUS DU SEUIL : retour à zéro ────
 Animation spring : translateX(0) en 300ms
```

### 2.3 Formulaire création (FAB → modal)

```
┌─────────────────────────────────────────┐
│  ← Annuler          Ajouter →          │  ← header form (sticky)
├─────────────────────────────────────────┤
│                                         │
│  TYPE                                   │  ← section label
│  ┌─────────────────────────────────┐   │
│  │ [  Feature  ●  ]  [   Projet   ]│   │  ← toggle buttons, pleine largeur
│  └─────────────────────────────────┘   │
│                                         │
│  TITRE *                                │
│  ┌─────────────────────────────────┐   │
│  │  Titre de l'item…               │   │  ← input standard
│  └─────────────────────────────────┘   │
│  (message erreur si vide)               │
│                                         │
│  PROJET PARENT                          │
│  ┌─────────────────────────────────┐   │
│  │  factory-dashboard           ▼  │   │  ← select (toujours présent)
│  └─────────────────────────────────┘   │
│                                         │
│  PRIORITÉ                               │
│  ┌─────────────────────────────────┐   │
│  │ [ Haute ]  [ Moyenne ● ]  [Basse]│  │  ← toggle 3 options
│  └─────────────────────────────────┘   │
│                                         │
│  DESCRIPTION  (optionnel)               │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │   zone de texte libre           │   │  ← textarea, min 120px
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### 2.4 Formulaire édition (champs supplémentaires)

```
┌─────────────────────────────────────────┐
│  ← Annuler          Modifier →         │
├─────────────────────────────────────────┤
│  [mêmes champs TYPE / TITRE / PROJET /  │
│   PRIORITÉ / DESCRIPTION que création] │
│                                         │
│  STATUT                                 │  ← uniquement en mode édition
│  ┌─────────────────────────────────┐   │
│  │ [À faire]  [En cours ●]  [Terminé]│  │
│  └─────────────────────────────────┘   │
│                                         │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ⚠  Supprimer cet item           │   │  ← bouton danger, bas de form
│  └─────────────────────────────────┘   │
│                                         │
│  ░░░░░░░░ SAFE AREA BOTTOM ░░░░░░░░░  │
└─────────────────────────────────────────┘
```

### 2.5 Vue Projets

```
┌─────────────────────────────────────────┐
│ ░░░░░ STATUS BAR ░░░░░░░░░░░░░░░░░░░░  │
├─────────────────────────────────────────┤
│  Projets                                │  ← titre h1
│                                         │
│  EN COURS                               │  ← section label uppercase
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🔷  factory-dashboard           │   │  ← carte projet
│  │      [en cours]                 │   │    badge bleu
│  │      factory-dashboard.vercel.↗ │   │    lien cliquable
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ 🔷  mon-mvp                     │   │
│  │      [en cours]                 │   │
│  │      mon-mvp.vercel.app        ↗│   │
│  └─────────────────────────────────┘   │
│                                         │
│  TERMINÉS                               │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ✅  dashboard-usine             │   │  ← badge vert
│  │      [terminé]                  │   │
│  │      dashboard-usine.vercel.app ↗│  │
│  └─────────────────────────────────┘   │
│                              ┌─────────┐│
│                              │    +    ││  ← FAB (ajouter un projet)
│                              └─────────┘│
├─────────────────────────────────────────┤
│       [  Backlog  ]    [Projets ●]      │
│ ░░░░░░░░ SAFE AREA BOTTOM ░░░░░░░░░░  │
└─────────────────────────────────────────┘
```

### 2.6 Skeleton loading + état vide

```
── SKELETON (3 cartes fantômes) ────────────

┌─────────────────────────────────────────┐
│ ┌──────────────┐  ┌─────┐  ┌──────┐   │  ← chips skeleton (shimmer)
│ └──────────────┘  └─────┘  └──────┘   │
│                                         │
│ ┌─┬───────────────────────────────────┐│
│ │ │ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬           ││  ← shimmer
│ │ │ ▬▬▬▬▬▬  ·  ▬▬▬▬▬▬▬             ││
│ │ │ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬               ││
│ └─┴───────────────────────────────────┘│
│ ┌─┬───────────────────────────────────┐│
│ │ │ ▬▬▬▬▬▬▬▬▬▬▬▬                    ││
│ │ │ ▬▬▬▬▬  ·  ▬▬▬▬▬▬▬▬             ││
│ │ │ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬           ││
│ └─┴───────────────────────────────────┘│
└─────────────────────────────────────────┘

── ÉTAT VIDE (aucun item) ──────────────────

┌─────────────────────────────────────────┐
│                                         │
│               📋                        │  ← icône 48px, --color-muted
│                                         │
│       Aucun item dans le backlog        │  ← 17px, bold
│    Commence par ajouter un item.        │  ← 15px, --color-muted
│                                         │
└─────────────────────────────────────────┘

── ÉTAT VIDE FILTRÉ ────────────────────────

┌─────────────────────────────────────────┐
│            🔍                           │
│     Aucun item ne correspond            │
│       à ces filtres.                    │
│                                         │
│     [  Réinitialiser les filtres  ]     │
└─────────────────────────────────────────┘
```

---

## 3. Spécification des composants

### 3.1 Tab Bar (navigation bas)

```
COMPOSANT : Tab Bar
───────────────────
Position      : fixed, bottom: 0, left: 0, right: 0
Fond          : var(--color-surface)
Bordure haute : var(--shadow-tab)
Hauteur vis.  : var(--tab-bar-height) = 49px
Padding bas   : env(safe-area-inset-bottom, 0px)
Z-index       : 50

Onglets (2) :
  - Backlog  : icône 📋 (ou SVG liste) 24px + label 10px
  - Projets  : icône 📁 (ou SVG dossier) 24px + label 10px

Chaque onglet :
  Largeur     : 50% (flex: 1)
  Hauteur     : 49px (zone tactile complète)
  Couleur active   : var(--color-accent)
  Couleur inactive : var(--color-muted)
  Transition  : color var(--transition-fast)

Classe CSS :
  .tab-bar              → conteneur fixed
  .tab-bar-item         → chaque onglet
  .tab-bar-item.active  → onglet actif (color: --color-accent)
  .tab-bar-icon         → icône SVG 24x24px
  .tab-bar-label        → label 10px
```

### 3.2 FAB (Floating Action Button)

```
COMPOSANT : FAB
───────────────
Position      : fixed
Bottom        : calc(var(--tab-bar-height) + var(--safe-area-bottom) + 16px)
Right         : 16px
Z-index       : 40

Dimensions    : var(--fab-size) = 56px × 56px
Forme         : circle (border-radius: var(--radius-pill))
Fond          : var(--color-accent)
Ombre         : var(--shadow-fab)
Icône         : + (SVG 24px blanc, centré)

États :
  Normal      : background var(--color-accent)
  Pressed     : background var(--color-accent-hover), scale(0.95), transition 100ms
  Focus       : outline 2px solid var(--color-accent), outline-offset 2px

Classe CSS :
  .fab        → le bouton lui-même
  .fab:active → scale(0.95)
```

### 3.3 Carte Backlog

```
COMPOSANT : Carte backlog (.card)
─────────────────────────────────
Fond          : var(--color-surface)
Bordure       : none (pas de border)
Radius        : var(--radius-md) = 12px
Ombre         : var(--shadow-card)
Overflow      : hidden (pour le bord coloré + swipe)
Margin bas    : var(--space-sm) = 8px

Structure interne :
  ┌──────────────────────────────────────┐
  │ bord-prio  │  contenu-carte          │
  └──────────────────────────────────────┘

Bord gauche priorité (.card-prio-stripe) :
  Largeur     : 4px
  Hauteur     : 100%
  Fond        : var(--color-prio-haute / moyenne / basse)
  Flex-shrink : 0

Contenu carte (.card-body) :
  Padding     : 14px 16px
  Flex        : 1

Ligne 1 (badges + sync) :
  [badge type]  [badge projet-parent?]  [⏳ sync]
  gap: 6px, align-items: center

Titre (.card-title) :
  Font-size   : var(--font-size-base) = 15px
  Weight      : 600
  Color       : var(--color-text)
  Margin-top  : 4px
  Line-height : 1.35

Description (.card-desc) :
  Font-size   : var(--font-size-sm) = 13px
  Color       : var(--color-muted)
  Margin-top  : 4px
  Max lines   : 2 (overflow: hidden, -webkit-line-clamp: 2)

Icône sync (.sync-indicator) :
  ⏳ = pending (orange #f97316, 12px)
  Vide = synced (invisible)
  Position   : margin-left: auto dans la ligne de badges

Variantes classe :
  .card-prio-haute   → bord rouge
  .card-prio-moyenne → bord orange
  .card-prio-basse   → bord gris
```

### 3.4 Couche swipe (sur chaque carte)

```
COMPOSANT : Swipe layer
───────────────────────
Architecture :
  .swipe-wrapper           ← position relative, overflow hidden
    .swipe-action-left     ← zone verte TERMINÉ (absolue, derrière carte)
    .swipe-action-right    ← zone bleue ÉDITER (absolue, derrière carte)
    .card                  ← se translate via touch events

Zone .swipe-action-left (TERMINÉ) :
  Fond          : var(--color-swipe-done) = #22c55e
  Couleur texte : #fff
  Contenu       : ✓ + "Terminé" (12px, bold)
  Position      : absolute, left: 0, top: 0, bottom: 0, width: 100%
  Justify       : flex-start + padding-left: 24px

Zone .swipe-action-right (ÉDITER) :
  Fond          : var(--color-swipe-edit) = #3b82f6
  Contenu       : ✏ + "Éditer" (12px, bold)
  Position      : absolute, right: 0, top: 0, bottom: 0, width: 100%
  Justify       : flex-end + padding-right: 24px

Logique JS (spec pour code-implementer) :
  - touchstart : mémoriser startX, startY
  - touchmove : si |deltaX| > |deltaY| → activer swipe (empêcher scroll)
    carte.style.transform = `translateX(${deltaX}px)`
  - touchend :
    si deltaX > +80px → action TERMINÉ (passer statut à "terminé")
    si deltaX < -80px → action ÉDITER  (naviguer vers formView)
    sinon → spring retour (transition: transform 300ms spring)
  - Désactiver text-selection pendant swipe : user-select: none

Feedback visuel progressif :
  - La zone colorée commence à apparaître dès 20px de swipe
  - L'icône grossit légèrement au-delà de 60px (transform scale 1.1)
```

### 3.5 Filter Strip (filtres multi-sélection)

```
COMPOSANT : Filter strip (.filter-strip)
────────────────────────────────────────
Position    : sticky, top: 0, z-index: 30
Fond        : var(--color-surface)
Bordure bas : 1px solid var(--color-border)
Padding     : 10px 16px 10px
Shadow bas  : 0 2px 8px rgba(0,0,0,0.06)

Barre de recherche (.search-bar) :
  Fond        : var(--color-subtle) = #f3f4f6
  Radius      : var(--radius-md) = 12px
  Hauteur     : 36px
  Padding     : 0 12px 0 36px (espace pour icône)
  Icône loupe : absolute left 12px, 16px, --color-muted
  Placeholder : "Rechercher…", --color-muted
  Margin-bas  : 10px

Zone chips (.chip-row) :
  Display       : flex, overflow-x: auto, gap: 8px
  Scroll smooth : -webkit-overflow-scrolling: touch
  Pas de scrollbar visible : scrollbar-width: none
  Padding-right : 16px (pour ne pas couper le dernier chip)

Chip filtre (.chip) :
  Hauteur       : 32px (zone tactile complète avec padding)
  Padding       : 0 14px
  Radius        : var(--radius-pill)
  Font-size     : var(--font-size-xs) = 12px
  Font-weight   : 600
  White-space   : nowrap

Chip inactive :
  Fond          : var(--color-surface)
  Bordure       : 1px solid var(--color-border)
  Couleur texte : var(--color-muted)

Chip active (.chip.active) :
  Fond          : var(--color-accent)
  Bordure       : 1px solid var(--color-accent)
  Couleur texte : #ffffff

Chips disponibles :
  Groupe TYPE   : [Projet] [Feature]    — multi-sélection
  Groupe STATUT : [Haute] [Moyenne] [Basse]  — multi-sélection
  → Les deux groupes sont séparés par un séparateur visuel de 4px

Defaults à l'ouverture : Feature + Projet actifs (tous), Haute + Moyenne + Basse actifs (tous)
→ En pratique : TOUT est actif par défaut = pas de filtre = tout affiché

Compteur (.filter-count) :
  Font-size : var(--font-size-sm) = 13px
  Color     : var(--color-muted)
  Margin    : 8px 0 0 0
  Affichage : "7 items" si non filtré, "3 sur 7" si filtre actif
```

### 3.6 Toggle buttons (formulaire)

```
COMPOSANT : Toggle group (.toggle-group)
────────────────────────────────────────
Display     : flex, width: 100%
Radius      : var(--radius-sm) = 8px
Overflow    : hidden
Bordure     : 1px solid var(--color-border)

Bouton toggle (.toggle-btn) :
  Flex        : 1
  Hauteur     : 44px (zone tactile min)
  Font-size   : var(--font-size-sm) = 13px
  Font-weight : 600
  Border      : none (la bordure est sur le conteneur)
  Séparation  : border-right: 1px solid var(--color-border)
                (supprimée sur le dernier enfant)

Inactif :
  Fond        : var(--color-surface)
  Couleur     : var(--color-muted)

Actif (.toggle-btn.active) :
  Fond        : var(--color-accent)
  Couleur     : #ffffff
  Transition  : background var(--transition-fast)

Groupes dans le formulaire :
  TYPE       : [Feature] [Projet]         — défaut : Feature
  PRIORITÉ   : [Haute] [Moyenne] [Basse]  — défaut : Moyenne
  STATUT     : [À faire] [En cours] [Terminé]  — édition uniquement, défaut : valeur actuelle
```

### 3.7 Skeleton loading

```
COMPOSANT : Skeleton card (.skeleton-card)
──────────────────────────────────────────
Même dimensions que .card (12px radius, shadow)
Pas de bord coloré (couleur neutre #f0f0f0)
Pas de contenu textuel

Éléments internes (placeholder) :
  .skel-line-lg  : w: 70%, h: 14px, radius 6px
  .skel-line-sm  : w: 40%, h: 10px, radius 6px
  .skel-badge    : w: 60px, h: 20px, radius 999px

Tous avec fond : linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)
Animation shimmer :
  background-size: 200% 100%
  animation: skeleton-shimmer 1.4s infinite ease-in-out

@keyframes skeleton-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

Nombre de skeletons affichés au chargement : 4
Transition de remplacement : opacity 0 → 1 en 200ms (fade in)
```

### 3.8 Toast

```
COMPOSANT : Toast (#toast-container — existant, à adapter)
────────────────────────────────────────────────────────────
Position    : fixed
Bottom      : calc(var(--tab-bar-height) + var(--safe-area-bottom) + 16px)
Left / Right: 16px (pleine largeur mobile — pas centré sur 50%)
Max-width   : 480px (centré sur tablette)
Transform   : translateY(0)  quand visible
             translateY(calc(100% + 32px)) quand masqué

Fond        : #1f2937 (inchangé — bon contraste)
Couleur     : #ffffff
Radius      : var(--radius-sm) = 8px (pas pill — plus lisible)
Padding     : 12px 16px
Font-size   : var(--font-size-sm) = 13px
Font-weight : 500

Variantes :
  .toast-success : bord gauche 3px #22c55e
  .toast-info    : bord gauche 3px #3b82f6
  .toast-error   : bord gauche 3px #ef4444

Durée affichage : 2.5s puis disparition automatique

IMPORTANT : le toast doit être positionné AU-DESSUS du tab bar
→ ne pas utiliser bottom: 1.5rem fixe (le tab bar le masquerait)
```

### 3.9 Indicateur offline

```
COMPOSANT : Badge offline (.badge-offline — existant, à repositionner)
───────────────────────────────────────────────────────────────────────
Positionnement : dans le filter-strip, en haut à droite
(ou bandeau sous le filter-strip si message long)

Style actuel (#e53e3e) → à changer :
  Fond        : #fff7ed        (orange très pâle)
  Bordure     : 1px solid #f97316
  Couleur     : #c2410c        (orange foncé — non alarmant)
  Padding     : 4px 10px
  Radius      : var(--radius-pill)
  Font-size   : var(--font-size-xs) = 12px
  Texte       : "● Hors ligne"

Variante bandeau complet (.banner-offline) si items pending :
  Fond        : #fff7ed
  Bordure-bas : 1px solid #f97316
  Padding     : 8px 16px
  Texte       : "Hors ligne — X modification(s) en attente de sync"
  (affiché dans le filter-strip si hasPending() = true)
```

### 3.10 Carte Projet (vue Projets)

```
COMPOSANT : Carte projet (.project-card)
────────────────────────────────────────
Fond        : var(--color-surface)
Radius      : var(--radius-md) = 12px
Ombre       : var(--shadow-card)
Padding     : 16px
Margin-bas  : 8px

Structure :
  ┌──────────────────────────────────────┐
  │  [icône 32px]  Nom du projet         │
  │                [badge statut]        │
  │                URL prod ↗            │
  └──────────────────────────────────────┘

Icône (.project-icon) :
  32px × 32px, border-radius 8px
  Fallback : carré coloré avec initiale du projet (1ère lettre, uppercase)
  Couleur de fond : dérivée du nom (hash simple → 1 parmi 6 teintes douces)

Badge statut :
  "en cours"  : fond --color-statut-cours-bg, texte --color-statut-cours-text
  "terminé"   : fond --color-statut-termine-bg, texte --color-statut-termine-text
  Radius : var(--radius-pill)
  Font-size : 11px, weight 600, uppercase

URL Vercel (.project-url) :
  Font-size : var(--font-size-xs) = 12px
  Color     : var(--color-accent)
  Text-decoration : underline
  Icône ↗ : en fin de ligne (12px)
  Si pas d'URL : texte "Pas encore déployé" en --color-muted

Section labels (EN COURS / TERMINÉS) :
  Font-size : var(--font-size-xs) = 12px, weight 700, uppercase
  Color     : var(--color-muted)
  Letter-spacing : 0.06em
  Margin-top : 24px (sauf premier groupe)
```

---

## 4. Flux utilisateur

### 4.1 Ajout d'un item (FAB)

```
[Vue Backlog ou Projets]
        │
        ▼ tap FAB (+)
[Formulaire création — slide depuis le bas]
  │  Haptic : light tap
  │
  ├── Type=Feature (défaut), Priorité=Moyenne (défaut)
  ├── Remplir TITRE (obligatoire)
  ├── Choisir PROJET PARENT (optionnel si type=Projet)
  │
  ├── Tap "Ajouter"
  │     ├── Si valide → enregistrement local + flush async
  │     │     ├── Online  → toast "Item ajouté ✓"
  │     │     └── Offline → toast "Ajouté en local — sync en attente"
  │     │     ↓
  │     │   [Retour Backlog, item visible en tête de liste]
  │     │     Haptic : medium impact
  │     │
  │     └── Si invalide → messages d'erreur inline, rester sur form
  │
  └── Tap "Annuler" → dismiss form, retour vue précédente
```

### 4.2 Marquer terminé (swipe droite)

```
[Carte backlog visible]
        │
        ▼ swipe droite > 80px + release
[Zone verte apparaît progressivement pendant le swipe]
        │
        ▼ (seuil atteint)
[Action : store.update({ statut: 'terminé' })]
  │  Haptic : medium impact
  │  Carte animée : disparition (opacity 0, height collapse en 250ms)
  │  Toast : "Terminé ✓"
  └─→ La carte quitte la liste (si filtre statut=à faire est actif)
      ou passe en style "terminé" (si tout statut visible)

En dessous du seuil :
  Card snap-back : transform translateX(0) en 300ms spring
```

### 4.3 Édition (swipe gauche ou via formulaire)

```
[Carte backlog]
        │
        ▼ swipe gauche > 80px + release
[Zone bleue apparaît]
        │
        ▼ navigation vers formView(id)
[Formulaire édition — même slide bas]
  Champs pré-remplis avec valeurs actuelles
  Champ STATUT visible (uniquement en édition)
  Bouton SUPPRIMER en bas (zone danger)
        │
        ├── Modifier + "Enregistrer"
        │     ↓ store.update(item) + flush async
        │   Toast : "Item modifié"
        │   Retour Backlog
        │
        ├── Tap "Supprimer"
        │     ↓ Confirmation : dialog natif `confirm()`
        │   Si oui → store.remove(id) + flush async
        │   Toast : "Item supprimé"
        │   Retour Backlog (item absent)
        │
        └── Tap "Annuler" → retour sans modification
```

### 4.4 Pull-to-refresh

```
[Vue Backlog, scroll en haut (scrollTop = 0)]
        │
        ▼ pull vers le bas (touch + delta > 60px)
[Indicateur circulaire rotatif apparaît en haut]
        │
        ▼ release au-delà de 60px
[Appel : store.fetchFromGitHub()]
  │  Indicateur de chargement pendant fetch
  └─→ Liste mise à jour + indicateur disparaît (fade out)
      Si offline : toast "Hors ligne — cache affiché"

IMPORTANT : désactiver le pull-to-navigate natif du navigateur
→ overflow-y: scroll sur #app avec overscroll-behavior-y: contain
```

---

## 5. Règles d'animation et feedback

### 5.1 Transitions recommandées

| Interaction | Durée | Easing |
|---|---|---|
| Chip filtre active/inactive | 150ms | ease |
| Toggle button actif/inactif | 150ms | ease |
| Toast entrant/sortant | 250ms | ease |
| Swipe snap-back | 300ms | cubic-bezier(0.34, 1.56, 0.64, 1) |
| Carte terminée (collapse) | 250ms | ease-in |
| Skeleton → contenu réel | 200ms | opacity fade |
| FAB pressed | 100ms | ease |
| Tab switch | 0ms | instantané (pas d'animation) |

### 5.2 Haptic feedback (best-effort)

```javascript
// Wrapper à utiliser dans code-implementer
function haptic(type = 'light') {
  // iOS : vibrate API non disponible en Safari PWA
  // Android : navigator.vibrate disponible
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 20, heavy: 40 };
    navigator.vibrate(patterns[type] ?? 10);
  }
  // En iOS : le feedback visuel (scale, color) compense l'absence de haptic
}
```

Déclencheurs :
| Action | Type haptic |
|---|---|
| Tap FAB | light |
| Swipe terminé (seuil atteint) | medium |
| Swipe éditer (seuil atteint) | light |
| Soumission formulaire réussie | medium |
| Erreur validation formulaire | (pas de haptic) |

### 5.3 Performance

- `will-change: transform` sur `.card` pendant les swipes (ajouter/retirer en JS)
- `transform3d` au lieu de `transform` si besoin (force GPU compositing)
- Skeleton affiché dès le premier frame ; ne jamais laisser le fond vide pendant le chargement

---

## 6. Layout global (body + structure)

```css
/* À ajouter/modifier dans style.css */

body {
  /* Empêcher le scroll natif pull-to-navigate sur iOS PWA */
  overscroll-behavior-y: contain;
  /* Padding bas pour le tab bar */
  padding-bottom: calc(var(--tab-bar-height) + var(--safe-area-bottom));
}

#app {
  max-width: 560px;
  margin: 0 auto;
  padding: 0 var(--space-md) var(--space-xl);
  /* Pas de padding-top ici : le filter-strip sticky gère l'espace */
}

/* Sur tablette (768px+) : centrer proprement */
@media (min-width: 768px) {
  #app { max-width: 560px; }
  .tab-bar { max-width: 560px; margin: 0 auto; left: 50%; transform: translateX(-50%); }
}
```

---

## 7. Checklist responsive

### Mobile 390px (iPhone — cible principale)
- [x] Toutes les zones tactiles ≥ 44px
- [x] Tab bar visible et accessible au pouce
- [x] FAB positionné hors du tab bar
- [x] Chips filtre scrollables horizontalement sans scrollbar visible
- [x] Toast au-dessus du tab bar
- [x] Safe area bottom respectée (iPhone X+)
- [x] Swipe gestures sur cartes
- [x] Pull-to-refresh fonctionnel

### Tablette 768px
- [x] Contenu centré max-width 560px
- [x] Tab bar centré (ou étendu pleine largeur)
- [x] FAB repositionné en conséquence
- [x] Swipe gestures conservés

### Desktop 1280px
- Pas de cible principale — l'app reste utilisable mais non optimisée desktop
- Le tab bar reste en bas (pas de conversion en sidebar)
- Min-width suggestion : 320px

---

## 8. Notes d'implémentation pour code-implementer

### 8.1 Scope vs specs v2.0 (delta à signaler à specs-framer)

Le brief de refonte ajoute des fonctionnalités absentes des specs v2.0 :

| Fonctionnalité | Specs v2.0 | Brief refonte |
|---|---|---|
| Suppression d'item | ✗ (§8.5 exclu explicitement) | Oui, depuis le formulaire d'édition |
| Changement de statut | ✗ (§2.2 exclu) | Oui, toggle dans formulaire + swipe terminé |
| Vue Projets dédiée | ✗ (pas mentionnée) | Oui, onglet dédié |
| Recherche full-text | ✗ | Oui, barre dans filter strip |
| Pull-to-refresh | ✗ | Oui |

→ Ces fonctionnalités sont spécifiées ici pour implémentation, mais les specs.md devront être mis à jour (doc-writer).

### 8.2 Classe CSS à renommer / supprimer

| Ancienne classe | Action |
|---|---|
| `--color-text-muted` | → renommer en `--color-muted` |
| `--color-primary` | → renommer en `--color-accent` |
| `--color-primary-hover` | → renommer en `--color-accent-hover` |
| `--color-secondary-bg` | → renommer en `--color-subtle` |
| `--radius` (= 6px) | → remplacer par `--radius-sm` (8px), `--radius-md` (12px) |
| `.badge-offline` (rouge) | → modifier : orange discret (voir §3.9) |
| `.card-actions` (bouton Éditer/Supprimer) | → supprimer (remplacé par swipe) |
| `.btn-edit`, `.btn-delete` | → supprimer (remplacé par swipe) |
| `#nav` positionné en `sticky top:0` | → repositionner en `fixed bottom:0` |

### 8.3 Fichiers impactés

- `src/style.css` — refonte complète
- `src/views/nav.js` — navigation → tab bar bottom
- `src/views/backlogView.js` — swipe, skeleton, filter chips, search
- `src/views/formView.js` — toggles, champ statut en édition, bouton suppression
- `src/views/projectsView.js` — nouvelle layout cartes avec statut + URL
- `src/main.js` — injection FAB, pull-to-refresh init
- `index.html` — meta theme-color: `#ffffff` (pas `#1a1a2e`)

### 8.4 Pas de nouvelles dépendances

Tout est réalisable en vanilla JS + CSS natif. Aucune librairie de swipe ou d'animation externe.
```

---

## 9. PWA — Assets

```
manifest.json — valeurs à vérifier/mettre à jour :
  "theme_color"      : "#2563eb"   (bleu accent)
  "background_color" : "#f9fafb"   (fond splash screen)
  "display"          : "standalone"
  "orientation"      : "portrait"

Icônes manquantes à créer (SVG → PNG) :
  192×192px : icône home screen iPhone
  512×512px : splash screen Android
  180×180px : apple-touch-icon (à ajouter dans index.html)

Design icône suggéré :
  Fond carré arrondi bleu #2563eb
  Lettre "F" blanche centrée, bold, ou pictogramme liste
  (implémentation hors périmètre designer — à déléguer à infra-engineer ou code-implementer)
```
