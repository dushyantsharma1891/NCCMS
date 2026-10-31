// Optional upgrade path for the AI Complaint Assistant / "Need Help?" chat.
// If a GOOGLE_API_KEY is present in the environment (backend/.env — never
// hardcoded in source), calls Google's Gemini API for a genuinely
// context-aware natural-language response. If the key is missing, or the
// call fails for any reason (bad key, quota, network, etc), callers fall
// back to the deterministic rule-based engine in aiController.js — the
// assistant always still works, just less richly, with no key configured.

const MODEL = 'gemini-1.5-flash';

const isConfigured = () => !!process.env.GOOGLE_API_KEY;

const callGemini = async (prompt) => {
  if (!isConfigured()) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GOOGLE_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 500 },
      }),
    });
    if (!response.ok) {
      console.error('Gemini API error:', response.status, await response.text().catch(() => ''));
      return null;
    }
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || null;
  } catch (err) {
    console.error('Gemini API call failed:', err.message);
    return null;
  }
};

module.exports = { callGemini, isConfigured };
