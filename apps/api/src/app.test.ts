import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "./app";

describe("API boundary", () => {
  it("reports service health", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, service: "career-platform-api" });
  });

  it("protects chat sessions", async () => {
    const response = await request(app).get("/api/chat/sessions");
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Authentication required");
  });
});
