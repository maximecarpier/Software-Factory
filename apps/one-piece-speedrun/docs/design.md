## Changelog
| Version | Date | Changements |
|---|---|---|
| v1.0 | 2025-06 | Système visuel initial — thème pirate sombre |

---

# Design — One Piece Speedrun

## Identité visuelle

Thème **pirate sombre**. Ambiance One Piece : fond quasi-noir, rouge corsaire, or de trésor. Typographies contrastées : serif élégant pour le corps, cursive pirate pour les titres.

## Palette de couleurs

| Token | Valeur | Usage |
|---|---|---|
| `--color-bg` | `#0d0d0d` | Fond de page |
| `--color-surface` | `#1c1c1c` | Cartes, champs, blocs |
| `--color-primary` | `#C0392B` | Header (rouge corsaire) |
| `--color-gold` | `#D4A017` | Accents, bordures, boutons d'action |
| `--color-canon` | `#27AE60` | Badge et bordure gauche — arcs canon |
| `--color-filler` | `#555555` | Badge et bordure gauche — arcs filler |
| `--color-mixte` | `#E67E22` | Badge et bordure gauche — arcs mixtes |
| `--color-text` | `#F0E6D3` | Texte principal (crème) |
| `--color-text-muted` | `#888888` | Texte secondaire, compteurs, numéros |

## Typographie

| Usage | Police | Style |
|---|---|---|
| Corps, éléments UI | `Crimson Text`, serif | 16px, line-height 1.5 |
| Titres (header, nom arc en détail) | `Pirata One`, cursive | 1.3–1.5rem |

Google Fonts — chargées depuis `index.html`.

## Layout

- **Mobile-first** — max-width 480px, centré
- À partir de 431px : bordures latérales visibles pour délimiter la colonne
- Pas de navigation latérale — scroll vertical unique

## Composants

### Arc Card
- Surface `#1c1c1c`, border-radius 8px
- Bordure gauche 4px colorée selon le type (canon/filler/mixte)
- Arc courant : bordure or sur les 4 côtés + `box-shadow` or (`glow`)
- Hauteur min touch target : 44px

### Badges (type)
- Pill (border-radius 999px), fond coloré selon type, texte blanc
- Tailles : 0.8rem

### Boutons d'action (⚓, Résumé, Réinitialiser)
- Fond transparent, bordure or `#D4A017`, texte or
- Pill shape, min-height 44px

### Filtres
- Boutons toggle pill, inactif : fond `#333`, texte muted
- Actif : fond couleur du type, texte blanc
- Séparateur bas : ligne or avant la liste des arcs

### Blocs résumé IA
- Fond `#262626`, bordure gauche 3px or
- Apparaît/disparaît en toggle (display none/block)

### Bouton refresh (⟳)
- Absolu dans le header, à droite
- Couleur or, animation `refresh-spin` pendant le chargement
