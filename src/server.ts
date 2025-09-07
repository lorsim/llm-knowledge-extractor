import "dotenv/config";
import express from "express";
import { z } from "zod";
import { insert, searchByTopicOrKeyword, Row } from "./db.js";
import { summarizeWithLLM } from "./llm.js";
import {
  inferTitle,
  topTopics,
  nounKeywords,
  sentiment,
  confidence,
} from "./nlp.js";

export const app = express();
app.use(express.json({ limit: "1mb" }));

const AnalyzeIn = z.object({
  texts: z.array(z.string()).min(1, "texts must contain at least one item"),
});
type AnalyzeOut = Omit<Row, "raw" | "created_at" | "input_len"> & {
  id: number | undefined;
};

app.post("/analyze", async (req, res) => {
  const parse = AnalyzeIn.safeParse(req.body);
  if (!parse.success)
    return res.status(400).json({ error: parse.error.message });

  try {
    const results: AnalyzeOut[] = [];
    for (const text of parse.data.texts) {
      const raw = (text || "").trim();
      if (!raw) return res.status(400).json({ error: "Input is empty." });

      let llmSummary = "";
      try {
        llmSummary = (await summarizeWithLLM(raw)).summary || "";
      } catch (e: any) {
        return res
          .status(502)
          .json({ error: `LLM failure: ${e.message || String(e)}` });
      }

      const kws = nounKeywords(raw, 3);
      const row: Row = {
        created_at: Math.floor(Date.now() / 1000),
        title: inferTitle(raw),
        summary: llmSummary,
        topics: topTopics(raw, 3),
        sentiment: sentiment(raw),
        keywords: kws,
        confidence: confidence(raw, llmSummary, kws),
        input_len: raw.length,
        raw,
      };
      const id = insert(row);
      results.push({
        id,
        title: row.title,
        summary: row.summary,
        topics: row.topics,
        sentiment: row.sentiment,
        keywords: row.keywords,
        confidence: row.confidence,
      });
    }
    res.json(results);
  } catch (err: any) {
    res
      .status(500)
      .json({ error: "Server error", detail: String(err?.message || err) });
  }
});

app.get("/search", (req, res) => {
  const topic =
    typeof req.query.topic === "string" ? req.query.topic : undefined;
  const keyword =
    typeof req.query.keyword === "string" ? req.query.keyword : undefined;
  const rows = searchByTopicOrKeyword({ topic, keyword });
  const shaped = rows.map((r) => ({
    id: r.id,
    title: r.title,
    summary: r.summary,
    topics: r.topics,
    sentiment: r.sentiment,
    keywords: r.keywords,
    confidence: r.confidence,
  }));
  res.json(shaped);
});

const PORT = Number(process.env.PORT || 3000);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
}
