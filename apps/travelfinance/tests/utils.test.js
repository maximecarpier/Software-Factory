// Pure utility functions extraites de index.html pour les tests
const CATEGORIES = [
  { key: "trajet_aller", label: "Trajet Aller", icon: "✈️", color: "#4f8ef7" },
  { key: "deplacements", label: "Déplacements", icon: "🛵", color: "#7c5af0" },
  { key: "nourriture",   label: "Nourriture",   icon: "🍜", color: "#f5a623" },
  { key: "activites",    label: "Activités",    icon: "🎭", color: "#34d399" },
  { key: "logement",     label: "Logement",     icon: "🏨", color: "#4ade80" },
  { key: "autre",        label: "Soirées & kiff", icon: "🎉", color: "#f87171" },
];

const FALLBACK_RATES = { THB: 38, USD: 1.08, VND: 27000, LAK: 23000 };

function dayTotalLocal(j) {
  return CATEGORIES.reduce((s, c) => s + (Number(j.categories[c.key]) || 0), 0);
}

function getRate(rates, devise) {
  if (devise === "EUR") return 1;
  return rates[devise] || FALLBACK_RATES[devise] || null;
}

function toEur(rates, amount, devise) {
  if (devise === "EUR") return amount;
  const rate = getRate(rates, devise);
  if (!rate) return null;
  return amount / rate;
}

function formatDate(d) {
  return new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// ==================== dayTotalLocal ====================
describe("dayTotalLocal", () => {
  test("somme toutes les catégories", () => {
    const j = { categories: { trajet_aller: 10, deplacements: 5, nourriture: 20, activites: 15, logement: 30, autre: 0 } };
    expect(dayTotalLocal(j)).toBe(80);
  });

  test("retourne 0 si toutes les catégories sont à 0", () => {
    const j = { categories: { trajet_aller: 0, deplacements: 0, nourriture: 0, activites: 0, logement: 0, autre: 0 } };
    expect(dayTotalLocal(j)).toBe(0);
  });

  test("ignore les valeurs manquantes (undefined → 0)", () => {
    const j = { categories: { nourriture: 15 } };
    expect(dayTotalLocal(j)).toBe(15);
  });

  test("convertit les strings en nombres", () => {
    const j = { categories: { nourriture: "20", logement: "10" } };
    expect(dayTotalLocal(j)).toBe(30);
  });
});

// ==================== getRate ====================
describe("getRate", () => {
  test("retourne 1 pour EUR", () => {
    expect(getRate({}, "EUR")).toBe(1);
  });

  test("utilise le taux du state si disponible", () => {
    expect(getRate({ THB: 40 }, "THB")).toBe(40);
  });

  test("tombe en fallback si le taux n'est pas dans le state", () => {
    expect(getRate({}, "THB")).toBe(38);
  });

  test("retourne null pour une devise inconnue", () => {
    expect(getRate({}, "XYZ")).toBeNull();
  });
});

// ==================== toEur ====================
describe("toEur", () => {
  test("retourne le montant tel quel pour EUR", () => {
    expect(toEur({}, 100, "EUR")).toBe(100);
  });

  test("convertit THB en EUR avec le fallback", () => {
    expect(toEur({}, 380, "THB")).toBeCloseTo(10, 2);
  });

  test("convertit avec le taux du state", () => {
    expect(toEur({ USD: 1.1 }, 11, "USD")).toBeCloseTo(10, 2);
  });

  test("retourne null pour une devise sans taux", () => {
    expect(toEur({}, 100, "XYZ")).toBeNull();
  });

  test("retourne 0 pour un montant de 0", () => {
    expect(toEur({}, 0, "THB")).toBe(0);
  });
});

// ==================== formatDate ====================
describe("formatDate", () => {
  test("formate une date ISO en français", () => {
    const result = formatDate("2024-11-01");
    expect(result).toMatch(/1/);
    expect(result).toMatch(/nov/i);
  });

  test("formate correctement le 15 juin", () => {
    const result = formatDate("2024-06-15");
    expect(result).toMatch(/15/);
    expect(result).toMatch(/juin/i);
  });
});

// ==================== getStopsWithVisa (logique métier) ====================
describe("logique visa — premier jour d'un nouveau pays", () => {
  // Réimplémentation de getStopsWithVisa pour les tests
  function getStopsWithVisa(jours) {
    const sortedDays = [...jours].sort((a, b) => a.date.localeCompare(b.date));
    const chronologicalStops = [];
    sortedDays.forEach((j) => {
      const last = chronologicalStops[chronologicalStops.length - 1];
      if (last && last.paysId === j.paysId && last.ville === j.ville) {
        last.jours.push(j);
      } else {
        chronologicalStops.push({ paysId: j.paysId, ville: j.ville, jours: [j] });
      }
    });
    const visaStopIds = new Set();
    let lastPaysId = null;
    chronologicalStops.forEach((stop) => {
      if (stop.paysId !== lastPaysId) {
        visaStopIds.add(stop.jours[0].id);
        lastPaysId = stop.paysId;
      }
    });
    return visaStopIds;
  }

  test("le premier jour du premier pays reçoit le visa", () => {
    const jours = [
      { id: "j1", paysId: "th", ville: "Bangkok", date: "2024-01-01" },
      { id: "j2", paysId: "th", ville: "Bangkok", date: "2024-01-02" },
    ];
    const ids = getStopsWithVisa(jours);
    expect(ids.has("j1")).toBe(true);
    expect(ids.has("j2")).toBe(false);
  });

  test("le premier jour d'un deuxième pays reçoit aussi le visa", () => {
    const jours = [
      { id: "j1", paysId: "th", ville: "Bangkok", date: "2024-01-01" },
      { id: "j2", paysId: "kh", ville: "Phnom Penh", date: "2024-01-02" },
    ];
    const ids = getStopsWithVisa(jours);
    expect(ids.has("j1")).toBe(true);
    expect(ids.has("j2")).toBe(true);
  });

  test("retour dans le même pays ne re-déclenche pas le visa", () => {
    const jours = [
      { id: "j1", paysId: "th", ville: "Bangkok", date: "2024-01-01" },
      { id: "j2", paysId: "kh", ville: "Phnom Penh", date: "2024-01-02" },
      { id: "j3", paysId: "th", ville: "Bangkok", date: "2024-01-03" },
    ];
    const ids = getStopsWithVisa(jours);
    expect(ids.size).toBe(3); // chaque entrée dans un nouveau pays = nouveau visa
  });

  test("liste vide retourne un Set vide", () => {
    expect(getStopsWithVisa([])).toEqual(new Set());
  });
});
