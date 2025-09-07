# LLM Knowledge Extractor (Node + Express + SQLite)

A small prototype service that takes unstructured text, generates a **1–2 sentence summary**, extracts structured metadata, stores it in SQLite, and exposes a simple API for analysis and search.

---

## Setup & Run

### 1. Install dependencies
```bash
npm install
```

### 2. Run in development (hot reload with tsx)
```bash
npm run dev
```

The server will be available at http://localhost:3000

## API Endpoints

```bash
POST /analyze
```

Analyze one or more pieces of text.

### Request body:

```bash
{
  "texts": [
    "Project Phoenix\nWe improved reliability and fixed crash issues. Users are happy."
  ]
}
```
### Response body:

```bash
[
  {
    "id": 1,
    "title": "Project Phoenix",
    "summary": "We improved reliability and fixed crash issues. Users are happy.",
    "topics": ["project","improv","reliabil"],
    "sentiment": "positive",
    "keywords": ["project","phoenix","reliabil"],
    "confidence": 0.62
  }
]
```

```bash
GET /search?topic=xyz or GET /search?keyword=xyz
```
Search stored analyses by topic or keyword.

### Example:

```bash
curl "http://localhost:3000/search?topic=project"
```

### Tests

Run the Vitest test suite:

```bash
npm run build
npm test
```

Tests include:

In-memory integration tests (real DB + heuristics).

Mocked tests (LLM and DB calls stubbed with Vitest).

## Docker

### Build image

```bash
docker build -t llm-extractor .
```

### Run container

```bash
docker run -p 3000:3000 llm-extractor
```
By default, the SQLite database (analyses.db) will live inside the container.
If you want persistence across runs, mount a volume:

```bash
docker run -p 3000:3000 -v $(pwd)/data:/app/data \
  -e DB_PATH=/app/data/analyses.db llm-extractor
```

## Design Choices

Express + better-sqlite3: lightweight, synchronous DB access with no setup. Perfect for a one-file table and simple queries.

LLM wrapper: defaults to a deterministic mock (lead-2 summary). Can switch to OpenAI via environment variables without changing the API.

NLP heuristics: tokenization + stopword removal + simple stemming for topics/keywords; a tiny sentiment lexicon; avoids heavy NLP dependencies.

API-first design: two endpoints (/analyze and /search) cover all requirements.

Confidence score: naive heuristic combining input length and keyword coverage—good enough for quick ranking.

## Trade-offs

Heuristic NLP is simple but not linguistically rich; swapping in spaCy or VADER would improve accuracy.

Search is implemented by filtering rows in memory; for scale, FTS5 or SQL LIKE queries would be better.

Error handling is pragmatic (400 for empty input, 502 for LLM failure). In production, we’d add retries and monitoring.

No UI is included (timebox), but the API design makes it easy to bolt on a frontend.
