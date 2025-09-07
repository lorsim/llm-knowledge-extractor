import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// --- 1) Mock the LLM and the DB BEFORE importing the server ---
// LLM mock: return a fixed summary by default; allow switching to throw in individual tests
const summarizeMock = vi.fn(async (_text: string) => ({
  summary: "MOCKED ONE-LINER SUMMARY.",
}));
vi.mock("../src/llm.js", () => ({
  summarizeWithLLM: summarizeMock,
}));

// DB mock: avoid touching disk; capture writes; control search results
const insertMock = vi.fn(() => 42); // pretend every insert returns id=42
type SearchResult = {
  id: number;
  created_at: number;
  title: string;
  summary: string;
  topics: string[];
  sentiment: string;
  keywords: string[];
  confidence: number;
  input_len: number;
  raw: string;
};
const searchMock = vi.fn<(_: any) => SearchResult[]>(() => []); // default empty search
vi.mock("../src/db.js", () => ({
  insert: insertMock,
  searchByTopicOrKeyword: searchMock,
}));

// --- 2) Import the app AFTER mocks are set ---
const { app } = await import("../src/server.js");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("API (mocked LLM + mocked DB)", () => {
  it("uses mocked LLM summary and stores via mocked DB", async () => {
    const text = "Hello World\nWe improved performance significantly.";
    const res = await request(app)
      .post("/analyze")
      .send({ texts: [text] });

    expect(res.status).toBe(200);
    // LLM was called
    expect(summarizeMock).toHaveBeenCalledTimes(1);
    // DB insert was called with shaped row
    expect(insertMock).toHaveBeenCalledTimes(1);

    // Response uses our mocked summary
    expect(res.body[0].summary).toBe("MOCKED ONE-LINER SUMMARY.");
    // And ID comes from our mocked insert() return value
    expect(res.body[0].id).toBe(42);
  });

  it("propagates LLM failure as 502", async () => {
    summarizeMock.mockImplementationOnce(async () => {
      throw new Error("simulated upstream outage");
    });

    const res = await request(app)
      .post("/analyze")
      .send({ texts: ["text"] });
    expect(res.status).toBe(502);
    expect(res.body.error).toContain("LLM failure");
  });

  it("search uses mocked DB and returns canned results", async () => {
    // Make search return predictable rows
    searchMock.mockReturnValueOnce([
      {
        id: 99,
        created_at: Math.floor(Date.now() / 1000),
        title: "Demo",
        summary: "MOCKED ONE-LINER SUMMARY.",
        topics: ["demo", "topic", "node"],
        sentiment: "positive",
        keywords: ["demo", "topic", "node"],
        confidence: 0.9,
        input_len: 10,
        raw: "ignored",
      },
    ]);

    const res = await request(app).get("/search").query({ topic: "demo" });
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe(99);
    expect(searchMock).toHaveBeenCalledWith({
      topic: "demo",
      keyword: undefined,
    });
  });
});
