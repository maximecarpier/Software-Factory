---
name: project-pirate
description: compteur-histoire-pirate — système visuel dark/pirate validé, palette et typographie
metadata:
  type: project
---

Système visuel du projet `apps/compteur-histoire-pirate/` :

**Palette (tokens.css — base)** : `--c-bg: #0a0a0f` / `--c-surface: #0d1b2a` / `--c-accent: #c9a227` / `--c-text: #f5e6c8` / `--c-muted: #6b7a8d`

**Palette (tavern.css — surcharge)** : `--c-bg: #0f0a06` (brun-noir chaud) / `--c-amber-dark: #8B5E0A` (liserés de cadre)

**Fonts** : Cinzel 400/600/700 (titres) + Lora 400/400it/600 (corps) + Inter 400/500/600 (UI) — Google Fonts

**Cible principale** : iPhone (375px+), dark mode natif, touch targets 44px

**Snippets** : `docs/design-snippets/` — 4 écrans complets + 4 composants + `_tokens.css`

**Statut** : v0.2 prototype — ambiance taverne CSS appliquée (tavern.css)

**Fichiers CSS** :
- `styles/tokens.css` — variables de base + reset
- `styles/app.css` — composants et écrans
- `styles/tavern.css` — overlay atmosphérique (chargé en dernier)

**Patterns taverne validés (v0.2)** :
- Texture bois : SVG inline data URI (veines ondulées Bézier) + repeating-linear-gradient grain vertical
- Vignette bougie : `body::before` radial-gradient + animation `candle-vignette` opacity 0.97→1.00 (9s)
- Double bordure card : `border` or 0.40 + `box-shadow inset` ambre sombre + halo ambre externe
- Séparateur corde : `repeating-linear-gradient` 3 tons or sur 12px de période
- Text-shadow Cinzel : lueur diffuse or (grand blur) + ombre portée sombre (petit blur)
- Lueur bougie boutons : `box-shadow` or à faible opacité sur `.btn-primary` et `.btn-playpause`

**Why:** Feedback utilisateur post-prototype : "pas assez immersif". Ambiance taverne maritime demandée. CSS pur uniquement, zéro image externe.
**How to apply:** Pour toute itération future, charger tavern.css en dernier. Ne pas modifier tokens.css ni app.css pour l'atmosphère — tavern.css est la couche d'override séparée. Si l'utilisateur demande une "version claire" ou un autre thème, créer un fichier parallèle (ex: sea.css) plutôt que modifier tavern.css.
