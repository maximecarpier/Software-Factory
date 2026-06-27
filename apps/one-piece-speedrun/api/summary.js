function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGeminiWithRetry(url, body, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (geminiRes.ok) return geminiRes;

    const isLastAttempt = attempt === retries;
    if (geminiRes.status !== 503 || isLastAttempt) return geminiRes;

    await sleep(500 * (attempt + 1));
  }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { prompt } = req.body || {};
  if (!prompt) {
    res.status(400).json({ error: "Missing prompt" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const geminiRes = await callGeminiWithRetry(url, { contents: [{ parts: [{ text: prompt }] }] });

    if (!geminiRes.ok) {
      const errorBody = await geminiRes.text();
      console.error(`Gemini API error (${geminiRes.status}):`, errorBody);
      res.status(502).json({ error: "Erreur API Gemini" });
      return;
    }

    const data = await geminiRes.json();
    const text = data.candidates[0].content.parts[0].text;
    res.status(200).json({ text });
  } catch (error) {
    console.error("Erreur appel Gemini:", error);
    res.status(502).json({ error: "Erreur API Gemini" });
  }
};
