# Cahier des charges fonctionnel — Compteur Histoire Pirate

## Changelog

| Version | Date       | Changements                                         |
|---------|------------|-----------------------------------------------------|
| v0.1    | 2026-07-01 | Prototype UI — écrans Accueil, Intro, Lecture, Fin  |

---

## Résumé exécutif

Application familiale de contes de pirates en français. L'utilisateur choisit une histoire, découvre une image d'ambiance, puis la lit et l'écoute (texte affiché + audio TTS via Web Speech API). Tout le contenu est pré-produit par des humains — aucune génération IA. Le prototype couvre les quatre écrans du parcours principal avec des données entièrement hard-codées.

---

## Utilisateurs cibles

**Persona principal — Famille en soirée**
- Parents et enfants (6-12 ans) réunis autour d'un iPhone
- Contexte : moment calme du soir, lumière tamisée
- Attente : immersion rapide, interface lisible même pour un enfant, pas de surcharge cognitive

**Registre visuel** : dark theme, ambiance mer et trésor — couleurs foncées (bleu marine, noir ancre), accents dorés/ambrés, typographie lisible à distance.

**Cible** : iPhone principalement (375 px et plus), responsive mobile-first.

---

## Périmètre — Prototype UI (v0.1)

### Ce que couvre le prototype

- Quatre écrans avec navigation complète et fonctionnelle
- Deux histoires hard-codées dans `src/data/fixtures.js`
- Lecture TTS via **Web Speech API** (navigateur natif, aucun backend) — voix robotique acceptable
- Zéro appel réseau, zéro backend, zéro authentification

### Ce qui est exclu du prototype (V2+)

Toutes les fonctionnalités réelles sont différées — voir section V2+ ci-dessous.

---

## MVP Prototype — Écrans et parcours

### Carte des écrans

```
┌──────────────┐
│   Accueil    │ ← point d'entrée
└──────┬───────┘
       │ tap sur une vignette d'histoire
       ▼
┌──────────────┐
│    Image     │ ← image plein écran + titre
│  Introductive│
└──────┬───────┘
       │ tap "Écouter l'histoire"
       ▼
┌──────────────┐
│   Lecture    │ ← texte + contrôles TTS
│  d'histoire  │
└──────┬───────┘
       │ fin de l'histoire (automatique ou bouton)
       ▼
┌──────────────┐
│  Fin         │ ← message de clôture + retour
│  d'histoire  │
└──────────────┘
```

### Flows de navigation

**Flow principal**
1. Accueil → tap vignette → Image Introductive
2. Image Introductive → tap "Écouter l'histoire" → Lecture
3. Lecture → fin de lecture → Fin d'histoire
4. Fin d'histoire → tap "Retourner à l'accueil" → Accueil

**Flow abandon en cours de lecture**
- Lecture → tap icône retour (haut gauche) → Accueil (sans confirmation, arrêt TTS immédiat)

**Flow retour depuis l'image introductive**
- Image Introductive → tap icône retour (haut gauche) → Accueil

---

## F1 — Écran Accueil

### Description

Premier écran affiché au lancement. Présente les histoires disponibles sous forme de vignettes verticales (liste scrollable). Ambiance dark, logo ou titre "Histoires de Pirates" en haut, deux histoires hard-codées.

### Comportement attendu

- Titre de l'app centré en haut (`"Histoires de Pirates"`)
- Sous-titre : `"Choisis ton aventure"`
- Liste de vignettes : image miniature + titre de l'histoire + durée estimée
- Tap sur une vignette → navigation vers l'Écran Image Introductive de cette histoire
- Pas de barre de navigation, pas de menu : interface épurée

### Cas limites

- Liste avec deux histoires uniquement (prototype) — pas de scroll nécessaire, mais la structure doit supporter n histoires

### Critères d'acceptance

**Scénario nominal — sélection d'une histoire**
- Étant donné que l'utilisateur est sur l'écran Accueil
- Quand il tape sur la vignette de l'histoire "Le Trésor de l'Île Maudite"
- Alors l'écran Image Introductive de cette histoire s'affiche avec l'image et le titre correspondants

**Scénario d'erreur — image vignette absente**
- Étant donné que l'attribut `imageVignette` d'une histoire est `null` ou que l'image ne charge pas
- Quand l'utilisateur accède à l'écran Accueil
- Alors un placeholder sombre avec l'icône ancre s'affiche à la place de l'image manquante, et la vignette reste tappable

---

## F2 — Écran Image Introductive

### Description

Écran de transition immersif. L'image de l'histoire occupe toute la hauteur de l'écran (cover). Le titre de l'histoire est affiché en overlay bas. Un bouton unique "Écouter l'histoire" invite à démarrer.

### Comportement attendu

- Image plein écran (object-fit: cover), fond sombre en fallback
- Gradient sombre en bas de l'image (lisibilité du texte)
- Titre de l'histoire : grande typographie, couleur crème/or
- Sous-titre court de l'histoire (ex : "Une aventure dans les Caraïbes")
- Durée estimée : `"~5 min"` en badge
- Bouton principal : `"Écouter l'histoire"` — centré en bas, design ambre/doré
- Icône retour (flèche gauche) en haut à gauche → Accueil

### Cas limites

- Image longue à charger → fond sombre + spinner de chargement
- Titre très long → tronqué avec ellipsis sur deux lignes max

### Critères d'acceptance

**Scénario nominal — affichage de l'intro**
- Étant donné que l'utilisateur a sélectionné l'histoire "La Tempête du Cap Horn"
- Quand l'écran Image Introductive s'affiche
- Alors l'image de cette histoire occupe tout l'écran, son titre et son sous-titre sont lisibles en bas, et le bouton "Écouter l'histoire" est visible

**Scénario nominal — démarrage de la lecture**
- Étant donné que l'utilisateur est sur l'écran Image Introductive
- Quand il tape le bouton "Écouter l'histoire"
- Alors l'écran Lecture s'affiche et la lecture TTS démarre automatiquement après 1 seconde

**Scénario d'erreur — retour en arrière**
- Étant donné que l'utilisateur est sur l'écran Image Introductive
- Quand il tape l'icône retour en haut à gauche
- Alors il revient à l'écran Accueil sans que la TTS ne démarre

---

## F3 — Écran Lecture

### Description

Écran principal de l'expérience. Affiche le texte de l'histoire paragraphe par paragraphe, synchronisé avec la lecture TTS. Les contrôles audio sont accessibles sans quitter l'écran.

### Comportement attendu

**Affichage du texte**
- Défilement automatique (scroll) du texte au rythme de la lecture
- Paragraphe en cours : légèrement surligné ou en couleur accentuée (blanc/crème)
- Paragraphes passés : grisés (opacity réduite)
- Paragraphes à venir : couleur intermédiaire
- Fond : noir ou bleu très foncé

**Contrôles TTS (barre fixe en bas)**
- Bouton Play/Pause : toggle — démarre ou met en pause la lecture TTS
- Bouton Restart : relance depuis le début
- Barre de progression : indique l'avancement dans l'histoire (lecture seule, non interactive dans le prototype)

**En-tête**
- Titre court de l'histoire en petit (haut centré)
- Icône retour en haut à gauche → Accueil (arrêt TTS immédiat)

**Fin de lecture**
- Quand le dernier paragraphe est lu → navigation automatique vers l'écran Fin d'histoire (délai 1,5 s)

**TTS (Web Speech API)**
- Langue : `fr-FR`
- Vitesse : 0,9 (légèrement ralentie pour la clarté)
- Voix : première voix française disponible dans le navigateur

### Cas limites

- Web Speech API non disponible (navigateur incompatible) → afficher un bandeau `"Lecture audio non disponible sur ce navigateur. Le texte reste lisible."` — l'utilisateur peut lire manuellement
- Tap Play/Pause rapide successif → ignorer les taps pendant la transition (debounce 300 ms)
- Mise en arrière-plan de l'app (iOS) → mettre en pause automatiquement

### Critères d'acceptance

**Scénario nominal — lecture complète**
- Étant donné que l'utilisateur est sur l'écran Lecture avec la TTS en cours
- Quand le dernier paragraphe est lu par la TTS
- Alors l'écran Fin d'histoire s'affiche automatiquement après 1,5 seconde

**Scénario nominal — pause et reprise**
- Étant donné que la TTS est en cours de lecture
- Quand l'utilisateur tape le bouton Pause
- Alors la lecture s'arrête et le bouton se transforme en Play ; quand il tape Play, la lecture reprend depuis l'endroit où elle s'était arrêtée

**Scénario nominal — restart**
- Étant donné que la TTS est en cours ou en pause
- Quand l'utilisateur tape le bouton Restart
- Alors la lecture reprend depuis le premier paragraphe et le défilement revient au début

**Scénario d'erreur — TTS indisponible**
- Étant donné que le navigateur ne supporte pas `window.speechSynthesis`
- Quand l'écran Lecture s'affiche
- Alors un bandeau d'information `"Lecture audio non disponible sur ce navigateur"` s'affiche en haut, et le texte de l'histoire est entièrement visible pour une lecture manuelle

---

## F4 — Écran Fin d'histoire

### Description

Écran de conclusion. Félicite l'utilisateur pour l'écoute complète de l'histoire. Ton chaleureux, une illustration de fin (coffre au trésor ou coucher de soleil sur mer), et un bouton unique de retour.

### Comportement attendu

- Illustration de fin (image statique hard-codée dans fixtures)
- Message de clôture : `"Fin de l'aventure !"` + sous-texte court en lien avec l'histoire (ex : `"Barbe d'Acier garde son secret encore quelques nuits…"`)
- Bouton `"Retourner à l'accueil"` → Accueil
- Aucun bouton "Rejouer" dans le prototype (V2+)

### Cas limites

- Écran atteint via navigation directe (URL ou state inattendu) sans avoir écouté une histoire → afficher l'écran avec contenu générique de la première histoire

### Critères d'acceptance

**Scénario nominal — fin naturelle**
- Étant donné que l'utilisateur a écouté l'histoire jusqu'à la fin
- Quand l'écran Fin d'histoire s'affiche automatiquement
- Alors l'illustration de fin, le message de clôture personnalisé et le bouton "Retourner à l'accueil" sont visibles

**Scénario nominal — retour accueil**
- Étant donné que l'utilisateur est sur l'écran Fin d'histoire
- Quand il tape "Retourner à l'accueil"
- Alors l'écran Accueil s'affiche et toutes les vignettes sont à nouveau disponibles

---

## Structure des données hard-codées (`src/data/fixtures.js`)

```js
// src/data/fixtures.js
// Source de vérité unique pour le prototype — remplacée par API réelle en V1

export const histoires = [
  {
    id: "histoire-1",
    titre: "Le Trésor de l'Île Maudite",
    sousTitre: "Une aventure dans les Caraïbes",
    imageVignette: "/assets/images/histoire-1-vignette.jpg",
    imageIntro: "/assets/images/histoire-1-intro.jpg",
    imageFin: "/assets/images/histoire-1-fin.jpg",
    messageFin: "Barbe d'Acier garde son secret encore quelques nuits…",
    dureeEstimee: 5, // minutes
    paragraphes: [
      "Il était une fois, sur les mers tumultueuses des Caraïbes, un capitaine dont la barbe brillait comme de l'acier poli au soleil couchant.",
      "Le Capitaine Barbe d'Acier navigua trois jours et trois nuits sans jamais quitter la barre, les yeux rivés sur une étoile que nul marin n'avait su nommer.",
      "Au matin du quatrième jour, une île surgit de la brume — noire de roche, silencieuse comme un secret.",
      "\"C'est là\", murmura-t-il à son mousse Tim, qui tremblait autant de fièvre que d'excitation.",
      "Ils débarquèrent dans la crique aux sables rouges, armés d'une vieille carte cousue dans la doublure du chapeau du capitaine.",
      "Trois pas vers le palmier tordu, sept pas vers le rocher en forme de crâne, et creuser jusqu'à ce que le métal chante.",
      "La pelle de Tim heurta quelque chose de dur. Un coffre, cerclé de fer rouillé, fermé par un cadenas en forme de serpent.",
      "Barbe d'Acier sourit — le seul sourire que Tim lui connut jamais — et sortit de sa botte une clé minuscule, portée depuis vingt ans.",
      "Le coffre s'ouvrit dans un grincement qui fit fuir les perroquets. À l'intérieur : non pas de l'or, mais une carte encore plus ancienne.",
      "\"L'aventure ne fait que commencer\", dit le capitaine. Et ils repartirent vers la mer, le vent dans le dos et le mystère plein les yeux."
    ],
    // Champs réservés V2+ — null dans le prototype
    coordsCarte: null,       // { x: 42, y: 67 } — position sur la carte navigable
    ambianceSonore: null,    // "vagues" | "tempete" | "port"
    objetsDebloques: null,   // ["boussole", "sextant"]
    personnageNarrateur: null
  },
  {
    id: "histoire-2",
    titre: "La Tempête du Cap Horn",
    sousTitre: "Quand la mer décide de tout",
    imageVignette: "/assets/images/histoire-2-vignette.jpg",
    imageIntro: "/assets/images/histoire-2-intro.jpg",
    imageFin: "/assets/images/histoire-2-fin.jpg",
    messageFin: "L'équipage du Vent Fou n'oublia jamais cette nuit-là.",
    dureeEstimee: 6, // minutes
    paragraphes: [
      "La goélette s'appelait le Vent Fou, et ce soir-là elle méritait bien son nom.",
      "Le ciel avait tourné vert à l'heure du souper — signe que les vieux marins connaissaient bien, et qui ne leur inspirait jamais rien de bon.",
      "\"Tous les hommes sur le pont !\" hurla la capitaine Maëlis, dont la voix couvrit même le premier coup de tonnerre.",
      "Elle avait dix-neuf ans et commandait ce navire depuis que son père avait décidé que la mer était trop dure pour lui.",
      "Les voiles claquaient comme des coups de fouet. La pluie arriva en mur, verticale et froide, aveuglante.",
      "Un matelot glissa sur le pont mouillé. Maëlis le rattrapa par le poignet d'une main, de l'autre elle tenait le câble de sécurité.",
      "\"Tiens-moi !\", cria-t-elle. Et il tint. Et elle tint.",
      "Pendant six heures, le Vent Fou dansa avec la tempête — parfois vaincu, jamais coulé.",
      "À l'aube, quand les eaux se calmèrent enfin, Maëlis compta son équipage : quatorze partis, quatorze présents.",
      "Elle ne dit rien. Elle s'assit sur le bord du bastingage, les pieds dans le vide au-dessus de la mer grise, et sourit au soleil qui revenait."
    ],
    coordsCarte: null,
    ambianceSonore: null,
    objetsDebloques: null,
    personnageNarrateur: null
  }
];

export const configTTS = {
  langue: "fr-FR",
  vitesse: 0.9,    // légèrement ralentie pour la clarté
  pitch: 1.0,
  // V2+: voix sélectionnable par l'utilisateur
};

export const configApp = {
  version: "prototype-v0.1",
  // V2+ : tous les champs ci-dessous sont null dans le prototype
  modeMini: false,
  modeDuo: false,
  modeVeille: false,
  vitesseLectureAjustable: false,
  historiqueActif: false,
};
```

---

## Roadmap V2+

Les features ci-dessous sont différées après validation du prototype. Elles sont documentées ici pour permettre à tech-architect d'anticiper l'architecture cible sans sur-ingénierie au stade prototype.

### V2-F1 — Carte de l'océan navigable

Écran supplémentaire entre l'Accueil et la sélection d'histoire : une carte illustrée de l'océan où chaque histoire est représentée par une île. L'utilisateur explore la carte (pan/zoom), tape une île pour accéder à son Image Introductive.

**Valeur** : renforce l'immersion et la rétention — l'utilisateur veut "compléter" la carte.
**Raison du report** : nécessite un asset carte complexe, une gestion de coordonnées par histoire, et probablement une animation de navigation entre îles. Hors périmètre prototype.
**Dépendances MVP** : champ `coordsCarte` déjà prévu dans fixtures.js — migration vers V1 sans réécriture.

### V2-F2 — Ambiance sonore de fond

Piste audio en boucle (vagues, craquements de coque, port animé) jouée en fond pendant la lecture, indépendante de la TTS.

**Valeur** : immersion sonore — critère de qualité cité par les utilisateurs de contenu audio pour enfants.
**Raison du report** : nécessite des assets audio, une gestion du volume indépendant de la TTS, et des droits d'utilisation. Complexité d'implémentation non justifiée pour un prototype.
**Dépendances MVP** : champ `ambianceSonore` prévu dans fixtures.js.

### V2-F3 — Personnage narrateur récurrent

Un personnage (voix ou avatar) introduit chaque histoire depuis l'Image Introductive et conclut l'Écran Fin. Crée une cohérence narrative entre les histoires.

**Valeur** : attachement émotionnel — les enfants reviennent pour retrouver le narrateur, pas seulement l'histoire.
**Raison du report** : requiert un design de personnage, des assets voix ou animation, et une intégration dans chaque histoire. Travail éditorial significatif.

### V2-F4 — Collection d'objets débloqués

Après chaque histoire écoutée, l'utilisateur débloque un objet de pirate (boussole, sextant, carte au trésor…). Un écran Collection liste les objets acquis.

**Valeur** : boucle de progression — incite à écouter toutes les histoires.
**Raison du report** : nécessite persistance locale (localStorage minimum), logique de progression, et assets visuels pour chaque objet. Hors périmètre prototype.
**Dépendances MVP** : champ `objetsDebloques` prévu dans fixtures.js.

### V2-F5 — Historique des histoires écoutées

L'écran Accueil affiche un indicateur visuel sur les histoires déjà écoutées (badge, icône cochée).

**Valeur** : contextualisation — l'utilisateur sait où il en est sans effort cognitif.
**Raison du report** : nécessite persistance localStorage + logique de suivi. Simple à implémenter mais non prioritaire pour la validation prototype.

### V2-F6 — Mode mini (illustration + audio, sans texte)

Mode alternatif : seule l'image de l'histoire reste affichée pendant la lecture TTS. Pas de texte. Pour les enfants qui ne lisent pas encore ou les adultes qui veulent fermer les yeux.

**Valeur** : accessibilité pour les non-lecteurs, confort pour les auditeurs.
**Raison du report** : nécessite un toggle UI et une logique de bascule d'affichage. Fonctionnellement simple, mais perturbant pour le test de l'UX principale dans le prototype.

### V2-F7 — Mode duo (surlignage synchronisé)

Pendant la lecture TTS, le mot ou la phrase en cours est surligné en temps réel dans le texte. Aide les enfants qui apprennent à lire à suivre le texte avec l'audio.

**Valeur** : pédagogique — valeur forte pour les familles avec enfants en apprentissage de la lecture.
**Raison du report** : la synchronisation mot-par-mot via Web Speech API (événements `boundary`) est fragile selon les navigateurs. Nécessite des tests d'intégration poussés avant déploiement.

### V2-F8 — Vitesse de lecture ajustable

Contrôle dans l'écran Lecture pour augmenter ou réduire la vitesse TTS (0,7× à 1,3×).

**Valeur** : accessibilité et personnalisation — les adultes lisent plus vite, les enfants plus lentement.
**Raison du report** : fonctionnellement trivial (paramètre TTS), mais l'UI de contrôle alourdit l'écran Lecture prototype. Reporter à V1 où les contrôles seront finalisés.

### V2-F9 — Mode veille

Diminution progressive de la luminosité de l'écran en cours de lecture, puis arrêt automatique après la dernière histoire. Pour les écoutes au moment du coucher.

**Valeur** : usage coucher — scénario explicitement cité par le persona principal.
**Raison du report** : nécessite l'API Screen Wake Lock + logique de luminosité. Dépend d'un vrai contenu TTS stable (V1) pour être utile.

### V2-F10 — Contenu réel (textes + images + audio TTS pré-généré)

Remplacer les données fixtures par du contenu pré-produit par des humains, stocké en backend (fichiers statiques ou CMS headless). La voix TTS reste robotique (acceptable) mais est pré-générée en fichiers MP3 pour éviter les variations entre navigateurs.

**Valeur** : passage du prototype à un produit — sans contenu réel, l'app n'a pas de valeur utilisateur.
**Raison du report** : travail éditorial hors périmètre technique. Requiert une décision sur le stockage (Vercel static, CDN, CMS). C'est la feature V1 la plus structurante — elle conditionne l'architecture technique réelle.
**Dépendances MVP** : structure fixtures.js conçue pour migrer sans réécriture UI.

---

## Exigences non fonctionnelles

- **Performance** : premier affichage en moins de 2 secondes sur connexion 4G (assets légers, pas de JS lourd)
- **Compatibilité** : Safari iOS 15+ (cible principale), Chrome Android, Chrome desktop
- **Accessibilité** : taille de police minimum 16px, contrastes suffisants pour lecture sombre, boutons minimum 44×44px (touch target iOS)
- **Responsive** : layout mobile-first, fonctionnel de 375px à 768px sans scroll horizontal

---

## Contraintes et hypothèses

- **Contenu** : textes des deux histoires hard-codés dans fixtures.js — images à fournir (placeholder accepté pour le prototype)
- **TTS** : Web Speech API uniquement — comportement variable selon le navigateur et les voix installées
- **Aucun réseau** : le prototype fonctionne entièrement offline une fois chargé
- **Assets images** : le prototype peut fonctionner avec des images placeholder (fond sombre uni + titre) si les illustrations définitives ne sont pas disponibles

---

## Critères de succès du prototype

| Critère | Mesure |
|---------|--------|
| Flow complet navigable | Les 4 écrans sont accessibles depuis l'Accueil jusqu'à la Fin |
| TTS fonctionnel | La lecture démarre automatiquement et les contrôles play/pause/restart fonctionnent |
| Ambiance validée | Le registre dark/aventure est lisible et convaincant à la première vue |
| Mobile-first | L'app est utilisable sur iPhone sans zoom ni scroll horizontal |
| Gate P passé | L'utilisateur confirme que l'UX prototype valide le concept avant d'investir en V1 |
