global.fetch = jest.fn();

const handler = require("../api/summary");

function makeReq(method, body) {
  return { method, body };
}

function makeRes() {
  const res = { _status: 200, _body: null };
  res.status = jest.fn((code) => { res._status = code; return res; });
  res.json = jest.fn((data) => { res._body = data; });
  return res;
}

const GEMINI_RESPONSE = {
  candidates: [{ content: { parts: [{ text: "Résumé test" }] } }],
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.GEMINI_API_KEY = "test-key";
});

describe("POST /api/summary", () => {
  test("retourne le texte Gemini si la requête est valide", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(GEMINI_RESPONSE),
    });

    const req = makeReq("POST", { prompt: "Résume l'épisode 1" });
    const res = makeRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._body).toEqual({ text: "Résumé test" });
  });

  test("retourne 405 si la méthode n'est pas POST", async () => {
    const req = makeReq("GET", {});
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(405);
  });

  test("retourne 400 si le prompt est absent", async () => {
    const req = makeReq("POST", {});
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  test("retourne 400 si body est undefined", async () => {
    const req = makeReq("POST", undefined);
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  test("retourne 502 si Gemini répond en erreur non-503", async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500, text: () => Promise.resolve("Internal Error") });
    const req = makeReq("POST", { prompt: "Un prompt" });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(502);
  });

  test("retourne 502 après épuisement des retries sur 503", async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 503, text: () => Promise.resolve("Overloaded") });
    const req = makeReq("POST", { prompt: "Un prompt" });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(502);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  test("retourne 502 si fetch lève une exception réseau", async () => {
    global.fetch.mockRejectedValueOnce(new Error("Network failure"));
    const req = makeReq("POST", { prompt: "Un prompt" });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(502);
  });
});
