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
    coordsCarte: null,
    ambianceSonore: null,
    objetsDebloques: null,
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
  vitesse: 0.9,
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
