// api/backlog.js — Vercel Serverless Function
// Securite : KV_REST_API_TOKEN et GITHUB_TOKEN ne sont accessibles que via process.env cote serveur.
// Jamais exposes dans une reponse publique ni dans le code frontend.

const REDIS_KEY = 'factory:backlog';

// GitHub fallback (migration unique depuis l'ancien stockage)
const REPO = 'maximecarpier/Software-Factory';
const FILE_PATH = '.factory/backlog.json';
const GITHUB_API_URL = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;

/**
 * Valide que la valeur est un tableau.
 * @param {unknown} value
 * @returns {boolean}
 */
function isValidItemsArray(value) {
  return Array.isArray(value);
}

/**
 * Lit le backlog depuis GitHub (migration one-shot).
 * Retourne un tableau vide si le fichier n'existe pas ou en cas d'erreur.
 * @param {string} token
 * @returns {Promise<Object[]>}
 */
async function fetchFromGitHub(token) {
  try {
    const response = await fetch(GITHUB_API_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'factory-dashboard/1.0',
      },
    });

    if (response.status === 404) return [];
    if (!response.ok) return [];

    const data = await response.json();
    const decoded = Buffer.from(data.content, 'base64').toString('utf8');
    const items = JSON.parse(decoded);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
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

      if (data.result === null || data.result === undefined) {
        // Redis vide — tenter la migration depuis GitHub si GITHUB_TOKEN disponible
        const githubToken = process.env.GITHUB_TOKEN;
        if (githubToken) {
          items = await fetchFromGitHub(githubToken);

          // Seeder Redis avec les donnees migreees
          if (items.length > 0) {
            await fetch(kvUrl, {
              method: 'POST',
              headers: kvHeaders,
              body: JSON.stringify(['SET', REDIS_KEY, JSON.stringify(items)]),
            });
          }
        }
      } else {
        try {
          const parsed = JSON.parse(data.result);
          items = Array.isArray(parsed) ? parsed : [];
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
