import { summaryLead2 } from "./nlp.js";

export type LlmSummary = { summary: string };

export async function summarizeWithLLM(text: string): Promise<LlmSummary> {
  if (process.env.SIMULATE_LLM_FAILURE === "1") {
    throw new Error("LLM upstream unavailable");
  }

  if (process.env.USE_OPENAI === "1" && process.env.OPENAI_API_KEY) {
    const body = {
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: "Summarize in 1–2 sentences." },
        { role: "user", content: text.slice(0, 8000) },
      ],
      temperature: 0.2,
      max_tokens: 80,
    };
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
    const data = await res.json();
    const summary = data.choices?.[0]?.message?.content?.trim() || "";
    return { summary };
  }

  return { summary: summaryLead2(text) };
}
