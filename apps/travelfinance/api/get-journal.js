const REDIS_KEY = 'travelfinance:journal';
const LEGACY_KEY = 'journal_de_voyage';

export default async function handler(request, response) {
  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;

    if (!url || !token) {
      return response.status(500).json({ error: 'KV_REST_API_URL ou KV_REST_API_TOKEN non configure' });
    }

    const kvHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    let rawResult = null;

    const redisResponse = await fetch(`${url}/get/${REDIS_KEY}`, { headers: kvHeaders });
    const data = await redisResponse.json();

    if (data?.result != null) {
      rawResult = data.result;
    } else {
      // Migration lazy : tente l'ancienne clé
      const legacyResponse = await fetch(`${url}/get/${LEGACY_KEY}`, { headers: kvHeaders });
      const legacyData = await legacyResponse.json();

      if (legacyData?.result != null) {
        rawResult = legacyData.result;

        // Copie vers la nouvelle clé puis suppression de l'ancienne
        await fetch(url, {
          method: 'POST',
          headers: kvHeaders,
          body: JSON.stringify(['SET', REDIS_KEY, rawResult]),
        });
        await fetch(url, {
          method: 'POST',
          headers: kvHeaders,
          body: JSON.stringify(['DEL', LEGACY_KEY]),
        });
      }
    }

    if (rawResult == null) {
      return response.status(200).json({ pays: [], jours: [] });
    }

    // Décodage de la première couche (le résultat peut être un tableau ou une chaîne)
    let content = typeof rawResult === 'string' ? JSON.parse(rawResult) : rawResult;

    // Si c'est un tableau (comme ["{...}"]), on prend le premier élément
    if (Array.isArray(content)) {
      content = content[0];
    }

    // Décodage de la deuxième couche (la chaîne JSON contenant les pays)
    const finalData = typeof content === 'string' ? JSON.parse(content) : content;

    return response.status(200).json(finalData);
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
