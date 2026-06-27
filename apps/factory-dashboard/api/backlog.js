// api/backlog.js — Vercel Serverless Function
// Securite : GITHUB_TOKEN n'est accessible que via process.env cote serveur.
// Jamais expose dans une reponse publique ni dans le code frontend.

const REPO = 'maximecarpier/Software-Factory';
const FILE_PATH = '.factory/backlog.json';
const GITHUB_API_URL = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;

/**
 * Valide que la valeur est un tableau d'objets minimalement corrects.
 * @param {unknown} value
 * @returns {boolean}
 */
function isValidItemsArray(value) {
  return Array.isArray(value);
}

export default async function handler(req, res) {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return res.status(500).json({ error: 'GITHUB_TOKEN non configure' });
  }

  const baseHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'factory-dashboard/1.0',
  };

  // ── GET — lit le backlog depuis GitHub ──────────────────────────────────
  if (req.method === 'GET') {
    try {
      const response = await fetch(GITHUB_API_URL, { headers: baseHeaders });

      // Fichier inexistant : backlog vide, pas d'erreur
      if (response.status === 404) {
        return res.status(200).json({ items: [], sha: null });
      }

      if (!response.ok) {
        throw new Error(`GitHub API GET error ${response.status}`);
      }

      const data = await response.json();

      let items = [];
      try {
        const decoded = Buffer.from(data.content, 'base64').toString('utf8');
        items = JSON.parse(decoded);
        if (!Array.isArray(items)) items = [];
      } catch {
        items = [];
      }

      return res.status(200).json({ items, sha: data.sha });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── PUT — ecrit le backlog sur GitHub ───────────────────────────────────
  if (req.method === 'PUT') {
    try {
      const body = req.body;

      // Validation des inputs
      if (!body || !isValidItemsArray(body.items)) {
        return res.status(400).json({ error: 'Corps invalide : items doit etre un tableau' });
      }

      const { items, sha } = body;

      const content = Buffer.from(JSON.stringify(items, null, 2)).toString('base64');

      const payload = {
        message: 'chore: update backlog',
        content,
      };

      // sha requis pour mise a jour, omis pour creation initiale
      if (sha) {
        payload.sha = sha;
      }

      const response = await fetch(GITHUB_API_URL, {
        method: 'PUT',
        headers: {
          ...baseHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`GitHub API PUT error ${response.status}: ${errData.message || ''}`);
      }

      const data = await response.json();
      return res.status(200).json({ sha: data.content.sha });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Methode non autorisee' });
}
