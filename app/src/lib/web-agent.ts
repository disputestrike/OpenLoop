/**
 * Web Agent — Lightweight web research for Loops
 * Fetches URLs, extracts text, summarizes via Cerebras
 * Replaces heavy Playwright browser-engine for Railway deployment
 */

const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
const MODEL = "llama3.1-8b";

function getKey(): string {
  return process.env.CEREBRAS_API_KEY || process.env.CEREBRAS_API_KEY_2 || "";
}

export async function webSearch(query: string): Promise<string> {
  try {
    // Use Cerebras to generate a research response (simulated web search)
    const key = getKey();
    if (!key) return "I couldn't search right now — no API key configured.";

    const res = await fetch(CEREBRAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: "You are a web research assistant. When asked to search for something, provide specific, factual, actionable results with real numbers, prices, and details. Format as a clear summary with options when applicable. Do not say you cannot search — provide the best information you have." },
          { role: "user", content: `Research this for me: ${query}` }
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });
    if (!res.ok) return "Search temporarily unavailable. Try again in a moment.";
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content?.trim() || "No results found.";
  } catch {
    return "Search error. Please try again.";
  }
}

export async function fetchAndSummarize(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "OpenLoop-Agent/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return `Could not fetch ${url} — got status ${res.status}`;
    const html = await res.text();
    // Extract text from HTML (basic)
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000);

    // Summarize via Cerebras
    const key = getKey();
    if (!key) return text.slice(0, 500);

    const sumRes = await fetch(CEREBRAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: "Summarize this web page content concisely. Focus on key facts, prices, and actionable information." },
          { role: "user", content: text }
        ],
        max_tokens: 300,
        temperature: 0.2,
      }),
    });
    if (!sumRes.ok) return text.slice(0, 500);
    const data = (await sumRes.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content?.trim() || text.slice(0, 500);
  } catch {
    return `Could not fetch ${url}`;
  }
}
