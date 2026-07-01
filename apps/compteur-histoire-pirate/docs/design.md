# Design System — Compteur Histoire Pirate

## Changelog

| Version | Date       | Changements                                              |
|---------|------------|----------------------------------------------------------|
| v0.1    | 2026-07-01 | Prototype UI — système visuel, 4 écrans, 4 composants    |

---

## Registre visuel

**Ambiance** : livre de contes de pirates ancien, ouvert le soir à la lueur d'une lanterne.
Dark theme immersif. Pas de surcharge cognitive — deux couleurs primaires (noir + bleu marine), un seul accent chaud (or/ambre). La typographie fait tout le travail narratif.

**Public** : familles (enfants 6-12 ans + adultes ensemble). Interface épurée, hiérarchie forte, zones de clic généreuses.

---

## Palette — 5 couleurs exactement

| Token        | Valeur    | Rôle                                      |
|--------------|-----------|-------------------------------------------|
| `--c-bg`     | `#0a0a0f` | Fond principal — noir profond             |
| `--c-surface`| `#0d1b2a` | Surfaces, cartes — bleu marine nuit       |
| `--c-accent` | `#c9a227` | Or/ambre — CTA, éléments actifs, bordures |
| `--c-text`   | `#f5e6c8` | Texte principal — crème                   |
| `--c-muted`  | `#6b7a8d` | Texte secondaire, inactif — ardoise       |

Les dérivées transparentes (rgba) sont autorisées et ne comptent pas comme couleurs supplémentaires.

---

## Typographie

### Familles

| Rôle          | Font            | Import                               |
|---------------|-----------------|--------------------------------------|
| Titres        | **Cinzel**      | Google Fonts, wght 400/600/700       |
| Corps/lecture | **Lora**        | Google Fonts, wght 400/600, italic   |
| UI/badges     | **Inter**       | Google Fonts, wght 400/500/600       |

**Pourquoi ces choix :**
- **Cinzel** : serif avec des formes inspirées des inscriptions romaines gravées dans la pierre. Donne une gravité et une noblesse qui évoquent les cartes marines d'époque sans être kitschy.
- **Lora** : serif d'écran bien hintée, conçue pour la lecture prolongée. Ligne de base régulière, contrastes modérés — idéale pour les paragraphes de l'écran Lecture.
- **Inter** : lisibilité maximale pour les éléments courts (badges, boutons) — s'efface derrière le contenu.

### Hiérarchie

| Niveau           | Font     | Taille  | Poids  | Couleur         | Utilisation              |
|------------------|----------|---------|--------|-----------------|--------------------------|
| App title        | Cinzel   | 24px    | 700    | `--c-text`      | Header accueil           |
| Screen title     | Cinzel   | 30px    | 700    | `--c-text`      | Titre intro-screen       |
| Story title      | Cinzel   | 18px    | 600    | `--c-text`      | Titre vignette           |
| Reader title     | Cinzel   | 14px    | 600    | `--c-text`/80%  | Header reader (tronqué)  |
| End title        | Cinzel   | 30px    | 700    | `--c-accent`    | "Fin de l'aventure !"    |
| Body paragraph   | Lora     | 18px    | 400    | voir états      | Paragraphes lecture      |
| Subtitle/italic  | Lora     | 16px    | 400it  | `--c-muted`     | Sous-titres              |
| Badge/label      | Inter    | 12px    | 500    | `--c-accent`    | Durée, labels UI         |
| Button           | Inter    | 16px    | 600    | variable        | Boutons CTA              |

**Taille minimum** : 16px (corps). 12px uniquement pour les badges (lecture courte, contraste fort).

---

## Espacements clés

Basés sur une grille de 4px.

| Contexte                        | Valeur   |
|---------------------------------|----------|
| Padding horizontal des écrans   | 20–24px  |
| Gap entre cartes (accueil)      | 16px     |
| Padding interne card body       | 16–20px  |
| Padding paragraphe lecture      | 14px 24px|
| Hauteur barre reader            | ~96px    |
| Gap contrôles reader bar        | 32px     |

---

## Composants

### 1. `story-card` — Vignette d'histoire

**Fichier** : `docs/design-snippets/story-card.html`

**Props** :
```js
{
  id:            string,        // histoire.id → data-id
  titre:         string,        // → .story-card__title
  imageVignette: string | null, // → .story-card__img[src], null = placeholder
  dureeEstimee:  number,        // minutes → .story-card__badge "~N min"
}
```

**États** :
- Normal : fond `--c-surface`, bordure `--c-accent` 20%
- `:active` : `transform: scale(0.97)`, `box-shadow` accent
- `:focus-visible` : `outline: 2px solid --c-accent`
- Image absente : placeholder sombre + ancre icon `--c-accent-30`

**Dimensions** : pleine largeur, cover image 16:9, radius 20px

---

### 2. `btn-primary` — Bouton CTA principal

**Fichier** : `docs/design-snippets/btn-primary.html`

**Usage** : écran intro uniquement ("Écouter l'histoire")

**États** :
- Normal : fond `--c-accent`, texte `--c-bg`, shadow accent
- `:active` : `scale(0.97)`, `opacity: 0.88`, pas de shadow
- `--loading` : `opacity: 0.55`, `pointer-events: none` (TTS démarre)
- `disabled` : `opacity: 0.55`, `pointer-events: none`

**Touch target** : `min-height: 44px`

---

### 3. `reader-bar` — Barre de contrôles lecture

**Fichier** : `docs/design-snippets/reader-bar.html`

**Props JS** :
```js
{
  isPlaying:  boolean,  // → classe .is-playing sur .btn-playpause
  progression: number,  // 0–1 → style="width: N%" sur .reader-bar__fill
}
```

**Structure** :
- Barre de progression : 3px hauteur, fond subtle, fill accent
- Bouton restart (gauche) : 44×44px, ghost, couleur muted
- Bouton play/pause (centre) : 56×56px, cercle accent, swap icône
- Spacer miroir (droite) : 44px, pour centrage visuel

**Contraintes** :
- `position: fixed; bottom: 0` — toujours visible
- `backdrop-filter: blur(20px)` — flou sur le contenu scrollé en dessous
- `padding-bottom: calc(...  + var(--safe-bottom))` — home indicator iOS

---

### 4. `paragraph-states` — États des paragraphes de lecture

**Fichier** : `docs/design-snippets/paragraph-states.html`

**Trois états** :
```css
.para--past     /* index < actif : color: muted, opacity: 0.50 */
.para--current  /* index === actif : crème, fond ambre 8%, bordure gauche accent */
.para--upcoming /* index > actif : crème 60% */
```

**Transition** : `all 300ms ease` — changement d'état fluide entre paragraphes

**Accessibilité** : `aria-current="true"` sur le paragraphe actif

**Taille** : 18px Lora, line-height 1.8 — confort pour lecture prolongée

---

## Flux utilisateur

```
[Accueil]
  │ tap vignette
  ▼
[Image Introductive]
  │ tap "Écouter l'histoire"   │ tap ← retour
  ▼                             ▼
[Lecture]                   [Accueil]
  │ TTS fin + 1500ms  │ tap ← retour (arrêt TTS immédiat)
  ▼                    ▼
[Fin d'histoire]    [Accueil]
  │ tap "Retourner à l'accueil"
  ▼
[Accueil]
```

**États de feedback visibles à chaque étape** :
- Intro → bouton loading (TTS démarre, 1s) avant navigation
- Lecture → progress bar en temps réel, paragraphe courant surligné
- Lecture → bandeau warning si TTS indisponible
- Fin → écran dédié avec message personnalisé (pas de disparition silencieuse)

---

## Checklist responsive

### Mobile (375px — iPhone SE, cible principale)
- Toutes les zones de clic ≥ 44×44px
- Texte lisible sans zoom (16px min)
- Pas de scroll horizontal
- Safe areas iOS respectées (`env(safe-area-inset-*)`)
- `100dvh` pour la hauteur (évite le bounce iOS)
- `viewport-fit=cover` dans la meta viewport

### Mobile large (430px — iPhone Pro Max)
- Marges latérales légèrement plus généreuses (24px → 28px)
- Pas de breakpoint nécessaire — layout flex s'adapte

### Tablet (768px)
- Cards accueil : passer à 2 colonnes (`grid-template-columns: 1fr 1fr`)
- Max-width sur le contenu : `max-width: 600px; margin: 0 auto`
- Intro screen : bouton CTA non full-width (max 320px centré)
- Reader bar : max-width 600px centrée

### Desktop (1280px)
- Hors scope prototype — l'app est conçue pour le mobile
- Si nécessaire en V1 : wrapper `max-width: 480px` centré, le reste fond sombre

---

## Icônes utilisées

Toutes issues de **Heroicons** (outline 2px) et **Lucide Icons** (1.5px) — intégrées en SVG inline, sans dépendance JS.

| Icône         | Source   | Utilisée dans           |
|---------------|----------|-------------------------|
| Anchor        | Lucide   | Header accueil, placeholders, end screen, btn-home |
| ChevronLeft   | Heroicons| btn-back (intro, reader) |
| Play (solid)  | Heroicons| btn-primary, btn-playpause |
| Pause (solid) | Heroicons| btn-playpause (état playing) |
| ArrowPath     | Heroicons| btn-restart              |
| ExclamationTriangle | Heroicons | reader-banner-warning |

---

## Décisions de design — Pourquoi

| Décision | Raison |
|----------|--------|
| Cinzel pour les titres | Évoque la typographie gravée des cartes marines sans tomber dans le kitsch "arrière-plan parchemin" |
| Or/ambre (#c9a227) comme seul accent | Chaleureux mais pas agressif sur fond sombre — passe le contraste WCAG AA sur `--c-bg` et `--c-surface` |
| Cards 16:9 (vs miniature carrée) | Les histoires méritent d'être présentées comme des affiches de films, pas des thumbnails YouTube |
| Barre lecture fixed (pas dans le scroll) | Les contrôles audio ne doivent jamais disparaître — safety net pour reprendre à tout moment |
| Paragraphe actif avec bordure gauche accent | Plus discret qu'un surlignage plein (qui gêne la lecture) — marqueur de position clair |
| Bouton "Retourner à l'accueil" outlined (pas solid) | Fin d'histoire : pas besoin d'une forte emphase, l'utilisateur a terminé — style plus calme adapté |
| Lueur dorée radiale sur l'écran Fin | Transition douce du dark theme vers quelque chose de légèrement plus chaud — clôture émotionnelle |

---

## Fichiers produits

```
docs/design-snippets/
├── _tokens.css            ← variables CSS partagées + reset
├── home-screen.html       ← écran 1 complet
├── intro-screen.html      ← écran 2 complet
├── reader-screen.html     ← écran 3 complet
├── end-screen.html        ← écran 4 complet
├── story-card.html        ← composant vignette
├── btn-primary.html       ← composant bouton CTA
├── reader-bar.html        ← composant barre lecture
└── paragraph-states.html  ← composant états paragraphes
```
