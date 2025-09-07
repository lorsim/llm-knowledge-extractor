import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/server.js";

describe("API", () => {
  it("rejects empty input", async () => {
    const res = await request(app)
      .post("/analyze")
      .send({ texts: ["  "] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("analyzes and searches", async () => {
    const text =
      "Project Phoenix\nWe improved reliability and fixed crash issues. Users are happy.";
    const res = await request(app)
      .post("/analyze")
      .send({ texts: [text] });
    expect(res.status).toBe(200);
    expect(res.body[0].summary.length).toBeGreaterThan(0);

    const search = await request(app)
      .get("/search")
      .query({ topic: "project" });
    expect(search.status).toBe(200);
    expect(Array.isArray(search.body)).toBe(true);
    expect(search.body.length).toBeGreaterThan(0);
  });
});
