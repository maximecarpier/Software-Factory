# Canal inter-agents — Compteur Histoire Pirate

## [designer → tech-architect]
> Round 1 — 2026-07-01

- Les 4 écrans utilisent `position: fixed` pour la barre de lecture et l'overlay intro. Sur iOS Safari, `position: fixed` peut avoir des comportements inattendus avec le clavier virtuel ou le scroll élastique — surveiller ces cas si un champ input est ajouté en V1.
- Les écrans `screen-reader` et `screen-intro` utilisent `height: 100dvh` / `overflow: hidden` pour bloquer le scroll du body. Il faudra s'assurer que le scroll du contenu (`reader-content`) fonctionne bien avec `-webkit-overflow-scrolling: touch` sur iOS 15.
- Le `backdrop-filter: blur()` utilisé sur la reader bar et les badges n'est pas supporté partout (Firefox < 103, Chrome Android peut être lent). Impact UX mineur — fallback : fond opaque `--c-surface-95` déjà en place.
- Le prototype utilise `env(safe-area-inset-*)` pour les notches iOS — la meta `viewport-fit=cover` doit être présente dans le HTML final.
- `scroll-behavior: smooth` sur `.reader-content` pour le défilement automatique vers le paragraphe actif : vérifier que l'API `element.scrollIntoView({ behavior: 'smooth' })` fonctionne bien depuis Web Speech API `onboundary` sur Safari iOS (historiquement capricieux).
- Pas de question bloquante sur l'architecture réseau — le prototype est 100% client-side, zéro appel réseau.

## [designer → tech-architect]
> Round 2 — 2026-07-01 (itération ambiance taverne)

- `body::before` avec `position: fixed` et `z-index: 9998` est utilisé pour la vignette animée. Vérifier qu'aucun futur overlay modal ou bottom-sheet n'oublie d'avoir un z-index supérieur à 9998. Recommandation : réserver 9998-9999 pour les overlays atmosphériques, les modaux applicatifs au-dessus de 10000.
- L'animation `candle-vignette` sur `body::before` est CSS-only et ne consomme que la propriété `opacity` — GPU-composited sur iOS Safari, pas d'impact layout. Aucune contrainte architecture supplémentaire.
- La texture bois (SVG inline + repeating-linear-gradient) est portée sur `body` via `background-image`. Si une future V1 ajoute un fond image sur un `.screen` spécifique, ce dernier devra définir son propre `background` pour masquer la texture sous-jacente — sinon la texture sera visible à travers les écrans transparents.
- (aucune question bloquante pour ce round)
