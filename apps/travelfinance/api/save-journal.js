const REDIS_KEY = 'travelfinance:journal';

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Méthode non autorisée' });

  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;

    if (!url || !token) {
      return response.status(500).json({ error: 'KV_REST_API_URL ou KV_REST_API_TOKEN non configure' });
    }

    // On s'assure d'avoir un objet JSON propre
    const cleanObject = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;

    await fetch(`${url}/set/${REDIS_KEY}`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([JSON.stringify(cleanObject)]) // Format strict attendu par Upstash
    });

    return response.status(200).json({ success: true });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
