---
name: bilan-2026-07-01-pirate
description: compteur-histoire-pirate — prototype UI dark/pirate, 4 écrans, système Cinzel+Lora
metadata:
  type: bilan
---

**Choix validés sans friction :**
- Dark theme immersif imposé par brief — aucun choix alternatif proposé (contexte clair)
- Cinzel (titres) + Lora (corps) : combinaison serif cohérente, jamais testée sur ce projet avant
- Or/ambre #c9a227 comme seul accent chaud sur fond très sombre — contraste suffisant
- Cards 16:9 (pas miniature carrée) — présentation "affiche" plus immersive
- Barre lecture fixed avec backdrop-filter blur : pattern mobile standard

**Choix rejetés :** aucun rejet à ce stade — Gate 2P pas encore validé

**Points d'attention pour suite :**
- Vérifier scroll-behavior: smooth + Web Speech API onboundary sur iOS Safari (historiquement capricieux)
- backdrop-filter: blur() : dégradé de support Firefox/Chrome Android — fallback opaque en place
- Le prototype n'a pas d'images réelles → code-implementer devra gérer gracieusement les placeholders et le fallback onerror sur les img
- Écran Lecture : la hauteur dynamique du clavier virtuel iOS peut décaler la reader bar si input ajouté en V1

**À améliorer :**
- Spécifier les SVG ornements plus précisément (longueur des lignes décoratives, ratio exact)
- Prévoir un variant "dark + lueur verte" pour les moments de tempête (écran histoire 2) en V1 — différenciation narrative entre les deux histoires
