// api/backlog.js — Vercel Serverless Function
// Securite : KV_REST_API_TOKEN ne sont accessibles que via process.env cote serveur.
// Jamais expose dans une reponse publique ni dans le code frontend.

const REDIS_KEY = 'factory:backlog';

function isValidItemsArray(value) {
  return Array.isArray(value);
}

export default async function handler(req, res) {
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (!kvUrl || !kvToken) {
    return res.status(500).json({ error: 'KV_REST_API_URL ou KV_REST_API_TOKEN non configure' });
  }

  const kvHeaders = {
    Authorization: `Bearer ${kvToken}`,
    'Content-Type': 'application/json',
  };

  // ── GET — lit le backlog depuis Redis ──────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const response = await fetch(`${kvUrl}/get/${REDIS_KEY}`, { headers: kvHeaders });

      if (!response.ok) {
        throw new Error(`Upstash GET error ${response.status}`);
      }

      const data = await response.json();
      let items = [];

      if (data.result !== null && data.result !== undefined) {
        try {
          const p = JSON.parse(data.result);
          items = Array.isArray(p) ? p : [];
        } catch {
          items = [];
        }
      }

      return res.status(200).json({ items });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── PUT — ecrit le backlog dans Redis ──────────────────────────────────────
  if (req.method === 'PUT') {
    try {
      const body = req.body;

      // Validation des inputs
      if (!body || !isValidItemsArray(body.items)) {
        return res.status(400).json({ error: 'Corps invalide : items doit etre un tableau' });
      }

      const { items } = body;

      const response = await fetch(kvUrl, {
        method: 'POST',
        headers: kvHeaders,
        body: JSON.stringify(['SET', REDIS_KEY, JSON.stringify(items)]),
      });

      if (!response.ok) {
        throw new Error(`Upstash SET error ${response.status}`);
      }

      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Methode non autorisee' });
}
