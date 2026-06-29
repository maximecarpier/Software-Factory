let localStore = {};
global.localStorage = {
  getItem: (key) => (localStore[key] !== undefined ? localStore[key] : null),
  setItem: (key, val) => { localStore[key] = String(val); },
  clear: () => { localStore = {}; },
};
global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });
global.navigator = {};
global.window = { addEventListener: () => {} };
global.document = {
  getElementById: () => ({ innerHTML: "", value: "", dataset: {}, addEventListener: () => {}, querySelector: () => null, querySelectorAll: () => [] }),
  querySelectorAll: () => [],
};

const { FilterEngine, escapeAttr } = require("../app.js");

const ARCS = [
  { id: "1", name: "East Blue", type: "canon", episodes: [] },
  { id: "2", name: "G8", type: "filler", episodes: [] },
  { id: "3", name: "Alabasta", type: "mixte", episodes: [] },
  { id: "4", name: "Skypiea", type: "canon", episodes: [] },
];

describe("FilterEngine.applyFilters", () => {
  test("retourne tous les arcs si tous les filtres sont actifs", () => {
    expect(FilterEngine.applyFilters(ARCS, ["canon", "filler", "mixte"])).toHaveLength(4);
  });

  test("filtre uniquement les arcs canon", () => {
    const result = FilterEngine.applyFilters(ARCS, ["canon"]);
    expect(result).toHaveLength(2);
    expect(result.every((a) => a.type === "canon")).toBe(true);
  });

  test("filtre uniquement les arcs filler", () => {
    const result = FilterEngine.applyFilters(ARCS, ["filler"]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  test("retourne un tableau vide si aucun filtre actif", () => {
    expect(FilterEngine.applyFilters(ARCS, [])).toHaveLength(0);
  });

  test("fonctionne avec une liste d'arcs vide", () => {
    expect(FilterEngine.applyFilters([], ["canon", "filler"])).toHaveLength(0);
  });
});

describe("escapeAttr", () => {
  test("échappe les &", () => {
    expect(escapeAttr("foo & bar")).toBe("foo &amp; bar");
  });

  test('échappe les "', () => {
    expect(escapeAttr('say "hello"')).toBe("say &quot;hello&quot;");
  });

  test("laisse intact un texte sans caractères spéciaux", () => {
    expect(escapeAttr("East Blue")).toBe("East Blue");
  });

  test("convertit les nombres en string", () => {
    expect(escapeAttr(42)).toBe("42");
  });
});
