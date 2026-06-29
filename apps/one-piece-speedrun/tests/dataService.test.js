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

const { DataService } = require("../app.js");

const SAMPLE = [{ id: "1", name: "East Blue", type: "canon", episodes: [] }];

beforeEach(() => {
  localStore = {};
  DataService.data = [];
  jest.clearAllMocks();
  global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });
});

describe("DataService.fetchData", () => {
  test("retourne les données du cache sans appel réseau", async () => {
    localStore["op_data"] = JSON.stringify(SAMPLE);
    const result = await DataService.fetchData();
    expect(result).toEqual(SAMPLE);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("charge depuis le réseau si le cache est vide", async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(SAMPLE) });
    const result = await DataService.fetchData();
    expect(global.fetch).toHaveBeenCalledWith("data/one-piece.json");
    expect(result).toEqual(SAMPLE);
    expect(localStore["op_data"]).toBe(JSON.stringify(SAMPLE));
    expect(localStore["op_data_timestamp"]).toBeTruthy();
  });

  test("retourne un tableau vide si le réseau échoue", async () => {
    global.fetch.mockRejectedValueOnce(new Error("Network error"));
    const result = await DataService.fetchData();
    expect(result).toEqual([]);
  });

  test("getData retourne les données déjà chargées", async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(SAMPLE) });
    await DataService.fetchData();
    expect(DataService.getData()).toEqual(SAMPLE);
  });
});

describe("DataService.refreshData", () => {
  test("appelle le réseau avec un cache-buster t=", async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(SAMPLE) });
    await DataService.refreshData();
    const calledUrl = global.fetch.mock.calls[0][0];
    expect(calledUrl).toMatch(/data\/one-piece\.json\?t=\d+/);
  });

  test("ignore le cache et met à jour localStorage", async () => {
    localStore["op_data"] = JSON.stringify([]);
    global.fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(SAMPLE) });
    const result = await DataService.refreshData();
    expect(result).toEqual(SAMPLE);
    expect(localStore["op_data"]).toBe(JSON.stringify(SAMPLE));
  });
});
