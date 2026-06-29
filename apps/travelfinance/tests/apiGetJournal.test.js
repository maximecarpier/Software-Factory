global.fetch = jest.fn();

const handler = require("../api/get-journal");

function makeRes() {
  const res = { _status: 200, _body: null };
  res.status = jest.fn((code) => { res._status = code; return res; });
  res.json = jest.fn((data) => { res._body = data; });
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.KV_REST_API_URL = "https://kv.example.com";
  process.env.KV_REST_API_TOKEN = "test-token";
});

describe("GET /api/get-journal", () => {
  test("retourne 500 si KV_REST_API_URL manque", async () => {
    delete process.env.KV_REST_API_URL;
    const res = makeRes();
    await handler({}, res);
    expect(res._status).toBe(500);
    expect(res._body.error).toMatch(/KV_REST_API_URL/);
  });

  test("retourne 500 si KV_REST_API_TOKEN manque", async () => {
    delete process.env.KV_REST_API_TOKEN;
    const res = makeRes();
    await handler({}, res);
    expect(res._status).toBe(500);
  });

  test("retourne { pays: [], jours: [] } si la clé KV est vide", async () => {
    global.fetch.mockResolvedValue({ json: () => Promise.resolve({ result: null }) });
    const res = makeRes();
    await handler({}, res);
    expect(res._status).toBe(200);
    expect(res._body).toEqual({ pays: [], jours: [] });
  });

  test("retourne les données si la clé principale a un résultat", async () => {
    const payload = { pays: [{ id: "1", nom: "Thaïlande" }], jours: [] };
    global.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ result: JSON.stringify(payload) }),
    });
    const res = makeRes();
    await handler({}, res);
    expect(res._status).toBe(200);
    expect(res._body.pays[0].nom).toBe("Thaïlande");
  });

  test("décode le double encodage JSON (tableau contenant une chaîne)", async () => {
    const inner = JSON.stringify({ pays: [], jours: [{ id: "j1" }] });
    const result = JSON.stringify([inner]);
    global.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ result }),
    });
    const res = makeRes();
    await handler({}, res);
    expect(res._body.jours[0].id).toBe("j1");
  });

  test("migration lazy : utilise la clé legacy si la clé principale est vide", async () => {
    const payload = { pays: [], jours: [{ id: "legacy" }] };
    global.fetch
      .mockResolvedValueOnce({ json: () => Promise.resolve({ result: null }) }) // clé principale vide
      .mockResolvedValueOnce({ json: () => Promise.resolve({ result: JSON.stringify(payload) }) }) // clé legacy
      .mockResolvedValueOnce({ json: () => Promise.resolve({}) }) // SET nouvelle clé
      .mockResolvedValueOnce({ json: () => Promise.resolve({}) }); // DEL legacy
    const res = makeRes();
    await handler({}, res);
    expect(res._body.jours[0].id).toBe("legacy");
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });

  test("retourne 500 si fetch lève une exception", async () => {
    global.fetch.mockRejectedValueOnce(new Error("Network failure"));
    const res = makeRes();
    await handler({}, res);
    expect(res._status).toBe(500);
    expect(res._body.error).toBe("Network failure");
  });
});
