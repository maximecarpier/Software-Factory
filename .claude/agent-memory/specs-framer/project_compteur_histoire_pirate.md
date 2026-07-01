---
name: project-compteur-histoire-pirate
description: Périmètre MVP prototype v0.1 et features V2+ différées pour l'app de contes pirates
metadata:
  type: project
---

App familiale de contes pirates en français — Mode B (Prototype UI first).

**MVP Prototype v0.1 (4 écrans)**
- F1 Accueil : vignettes des 2 histoires hard-codées, tap → Image Introductive
- F2 Image Introductive : image plein écran + titre + bouton "Écouter l'histoire"
- F3 Lecture : texte paragraphe par paragraphe + TTS Web Speech API (fr-FR, 0.9x) + play/pause/restart
- F4 Fin d'histoire : message de clôture + retour accueil

**Contrainte absolue** : zéro contenu généré par IA — tout contenu pré-produit humain.
**TTS** : Web Speech API (natif navigateur), voix robotique acceptable.
**Fixtures** : `src/data/fixtures.js` — 2 histoires, champs V2+ null (coordsCarte, ambianceSonore, objetsDebloques, personnageNarrateur).

**V2+ différées (10 features)**
- V2-F1 Carte océan navigable (chaque histoire = une île)
- V2-F2 Ambiance sonore de fond (vagues, craquements)
- V2-F3 Personnage narrateur récurrent
- V2-F4 Collection objets débloqués (boussole, sextant…)
- V2-F5 Historique histoires écoutées
- V2-F6 Mode mini (illustration + audio, sans texte)
- V2-F7 Mode duo (surlignage synchronisé TTS)
- V2-F8 Vitesse lecture ajustable
- V2-F9 Mode veille (luminosité décroissante + arrêt auto)
- V2-F10 Contenu réel (textes + images + audio MP3 pré-générés)

**Gate P** : validation UX prototype avant investissement V1.

**Why:** Contexte Mode B — prototype navigable avant tout backend pour valider l'UX familiale.
**How to apply:** En V1, specs-framer reprend en mode update en activant en priorité V2-F10 (contenu réel) qui conditionne toutes les autres features.
