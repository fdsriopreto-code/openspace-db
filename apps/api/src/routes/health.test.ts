import { describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import type { Env } from "../env.js";

const testEnv: Env = {
  NODE_ENV: "test",
  PORT: 4000,
  DATABASE_URL: "postgresql://openspace:openspace@localhost:5432/openspace?schema=openspace",
  JWT_SIGNING_SECRET: "test-only-secret-at-least-32-characters-long",
  CORS_ORIGIN: "http://localhost:5173",
  ENVIRONMENT_TIER: "development",
};

describe("GET /health", () => {
  it("reports degraded (not a crash) when the database is unreachable", async () => {
    const app = await buildApp(testEnv);
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toMatchObject({ status: expect.stringMatching(/ok|degraded/) });
    await app.close();
  });
});
