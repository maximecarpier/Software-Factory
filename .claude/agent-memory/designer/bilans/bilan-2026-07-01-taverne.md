---
name: bilan-2026-07-01-taverne
description: compteur-histoire-pirate — itération ambiance taverne CSS (tavern.css)
metadata:
  type: bilan
---

**Choix retenus :**
- body::before pour la vignette bougie (position: fixed, z-index 9998, pointer-events none) — couvre tous les écrans sans modifier leur structure
- SVG inline data URI pour la texture bois (veines Bézier ondulées) — CSS pur, aucune image externe, compatible iOS Safari 15+
- Fichier tavern.css séparé (overlay) — n'altère jamais tokens.css ni app.css, facile à désactiver ou remplacer par un autre thème

**Choix rejetés :**
- feTurbulence dans le SVG data URI — potentiellement lourd sur mobile, remplacé par des paths Bézier simples
- Pseudo-éléments ::before/::after sur .story-card pour coins ornementaux — bloqué par overflow: hidden de la card, remplacé par double box-shadow (border externe + inset ambre)

**Patterns validés :**
- Double bordure card via border + box-shadow inset : contournement propre de overflow:hidden
- Texture fond : SVG inline + repeating-linear-gradient combinés = léger et performant
- Animation vacillement : propriété opacity seule = GPU-composited, zéro impact layout sur iOS
- Séparateur corde tressée en CSS pur : repeating-linear-gradient 3 tons, 12px de période

**À améliorer :**
- Prévoir une convention de z-index documentée quand body::before dépasse 9998 — risque de collision avec futurs modaux si non documenté
- La texture bois sur body sera masquée par les .screen opaques — prévoir de le noter pour code-implementer si de futurs écrans ont un fond semi-transparent
