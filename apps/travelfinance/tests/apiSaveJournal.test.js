global.fetch = jest.fn();

const handler = require("../api/save-journal");

function makeReq(method, body) {
  return { method, body };
}

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
  global.fetch.mockResolvedValue({ json: () => Promise.resolve({ result: "OK" }) });
});

describe("POST /api/save-journal", () => {
  test("retourne 405 si la méthode n'est pas POST", async () => {
    const res = makeRes();
    await handler(makeReq("GET", {}), res);
    expect(res._status).toBe(405);
  });

  test("retourne 500 si KV_REST_API_URL manque", async () => {
    delete process.env.KV_REST_API_URL;
    const res = makeRes();
    await handler(makeReq("POST", { pays: [], jours: [] }), res);
    expect(res._status).toBe(500);
  });

  test("retourne 500 si KV_REST_API_TOKEN manque", async () => {
    delete process.env.KV_REST_API_TOKEN;
    const res = makeRes();
    await handler(makeReq("POST", { pays: [], jours: [] }), res);
    expect(res._status).toBe(500);
  });

  test("sauvegarde un objet valide et retourne { success: true }", async () => {
    const body = { pays: [{ id: "1", nom: "Thaïlande" }], jours: [] };
    const res = makeRes();
    await handler(makeReq("POST", body), res);
    expect(res._status).toBe(200);
    expect(res._body).toEqual({ success: true });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("accepte un body JSON string et le parse correctement", async () => {
    const body = JSON.stringify({ pays: [], jours: [{ id: "j1" }] });
    const res = makeRes();
    await handler(makeReq("POST", body), res);
    expect(res._status).toBe(200);
    const sentBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    const parsed = JSON.parse(sentBody[0]);
    expect(parsed.jours[0].id).toBe("j1");
  });

  test("appelle Upstash avec le bon format (tableau contenant une chaîne JSON)", async () => {
    const body = { pays: [], jours: [] };
    const res = makeRes();
    await handler(makeReq("POST", body), res);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain("/set/travelfinance:journal");
    const sentBody = JSON.parse(opts.body);
    expect(Array.isArray(sentBody)).toBe(true);
    expect(typeof sentBody[0]).toBe("string");
    expect(JSON.parse(sentBody[0])).toEqual(body);
  });

  test("retourne 500 si fetch lève une exception", async () => {
    global.fetch.mockRejectedValueOnce(new Error("KV unavailable"));
    const res = makeRes();
    await handler(makeReq("POST", { pays: [], jours: [] }), res);
    expect(res._status).toBe(500);
    expect(res._body.error).toBe("KV unavailable");
  });
});
