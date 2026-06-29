## Changelog
| Version | Date | Changements |
|---|---|---|
| v1.0 | 2024-11 | Système visuel initial — dark finance UI |

---

# Design — TravelFinance

## Identité visuelle

Thème **dark finance** : fond quasi-noir, accents bleu électrique et violet, typographies clean. Contraste fort entre surfaces. Inspiré des apps fintech modernes.

## Palette de couleurs

| Variable | Valeur | Usage |
|---|---|---|
| `--bg` | `#0d0f14` | Fond de page |
| `--surface` | `#161923` | Cartes, modals |
| `--surface2` | `#1e2330` | Stop headers, inputs, blocs secondaires |
| `--border` | `#2a3044` | Bordures, séparateurs |
| `--accent` | `#4f8ef7` | Bleu — CTA principal, totaux, onglet actif |
| `--accent2` | `#7c5af0` | Violet — gradient titre, catégorie "Déplacements" |
| `--gold` | `#f5a623` | Or — total journée preview, catégorie "Nourriture" |
| `--green` | `#34d399` | Vert — durée, catégorie "Activités" |
| `--red` | `#f87171` | Rouge — actions destructives, catégorie "Soirées" |
| `--text` | `#e8ecf4` | Texte principal |
| `--muted` | `#6b7a99` | Labels, texte secondaire, compteurs |

## Typographie

| Usage | Police | Poids |
|---|---|---|
| Corps, labels | Inter | 300 / 400 / 500 / 600 / 700 |
| Titres, stats | Space Grotesk | 400 / 500 / 600 / 700 |

`font-size: 16px` sur tous les `<input>` — prévient le zoom automatique sur iOS Safari.

## Layout

- **Mobile-first** — pas de max-width (plein écran mobile)
- Bottom tab bar fixe : 56px + safe-area-inset-bottom
- Contenu scrollable avec padding-bottom pour ne pas passer sous la tab bar
- Sticky header avec backdrop-filter blur

## Composants

### Tab Bar
- Fond `rgba(13,15,20,.95)` + blur
- 3 onglets : Journal / Stats / Pays
- Icône 20px + label 10px
- Actif : `--accent`

### Bottom Sheet Modal
- Border-radius 24px en haut uniquement
- Drag handle (40×4px) en haut
- `max-height: 92vh`, scroll interne
- Fermeture : croix ou clic sur l'overlay

### Boutons
| Classe | Style |
|---|---|
| `.btn-primary` | Fond `--accent`, texte blanc |
| `.btn-ghost` | Transparent, bordure `--border`, texte `--muted` |
| `.btn-danger` | Transparent, bordure rouge foncé, texte `--red` |
| `.btn-sm` | height 36px, font 12px |
| `.btn-icon` | Carré 44px |

Tous min-height 44px. Animation `.btn:active` : `scale(0.97)`.

### Stop Card (journal)
- Border-radius 16px, fond `--surface`
- Stop header : fond `--surface2`
- Journées séparées par `border-top: 1px solid --border`
- Category pills colorés par catégorie (fond `color + 22` = 13% opacité)

### Stat Card
- Fond `--surface`, border-radius 16px
- Chiffre en Space Grotesk 700, 22px
- Progress bar (4px, border-radius 2px)

### Toast
- Fixé au-dessus de la tab bar
- Fade in/out (opacity transition 0.3s)
- Durée : 2500ms
