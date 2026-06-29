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

const { SummaryService } = require("../app.js");

beforeEach(() => {
  localStore = {};
  jest.clearAllMocks();
});

describe("SummaryService — clés localStorage", () => {
  test("keyEpisode génère la clé correcte", () => {
    expect(SummaryService.keyEpisode(42)).toBe("op_summary_ep_42");
    expect(SummaryService.keyEpisode(1)).toBe("op_summary_ep_1");
  });

  test("keyArc génère la clé correcte", () => {
    expect(SummaryService.keyArc("alabasta")).toBe("op_summary_arc_alabasta");
    expect(SummaryService.keyArc("g8-filler")).toBe("op_summary_arc_g8-filler");
  });
});

describe("SummaryService — cache localStorage", () => {
  test("getCached retourne null si rien en cache", () => {
    expect(SummaryService.getCached("op_summary_ep_1")).toBeNull();
  });

  test("saveToCache stocke le texte et getCached le restitue", () => {
    SummaryService.saveToCache("op_summary_ep_5", "Résumé de test");
    expect(SummaryService.getCached("op_summary_ep_5")).toBe("Résumé de test");
  });

  test("saveToCache écrase une valeur existante", () => {
    SummaryService.saveToCache("op_summary_ep_5", "V1");
    SummaryService.saveToCache("op_summary_ep_5", "V2");
    expect(SummaryService.getCached("op_summary_ep_5")).toBe("V2");
  });
});

describe("SummaryService.callGemini", () => {
  test("appelle /api/summary en POST et retourne le texte", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ text: "Résumé généré" }),
    });

    const result = await SummaryService.callGemini("Un prompt de test");

    expect(global.fetch).toHaveBeenCalledWith("/api/summary", expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Un prompt de test" }),
    }));
    expect(result).toBe("Résumé généré");
  });

  test("lève une erreur si l'API répond en erreur", async () => {
    global.fetch.mockResolvedValueOnce({ ok: false });
    await expect(SummaryService.callGemini("prompt")).rejects.toThrow("Erreur API Gemini");
  });
});
