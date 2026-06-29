const REDIS_KEY = 'travelfinance:journal';

export default async function handler(request, response) {
  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;

    if (!url || !token) {
      return response.status(500).json({ error: 'KV_REST_API_URL ou KV_REST_API_TOKEN non configure' });
    }

    const redisResponse = await fetch(`${url}/get/${REDIS_KEY}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await redisResponse.json();

    if (!data || !data.result) {
      return response.status(200).json({ pays: [], jours: [] });
    }

    // Décodage de la première couche (le résultat peut être un tableau ou une chaîne)
    let content = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
    
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
