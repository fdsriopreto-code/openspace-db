import type { FastifyInstance } from "fastify";
import type { HealthCheckResponse } from "@openspace-db/shared-types";

const startedAt = Date.now();

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (): Promise<HealthCheckResponse> => {
    let database: HealthCheckResponse["database"] = "ok";
    try {
      await app.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = "down";
    }

    return {
      status: database === "ok" ? "ok" : "degraded",
      version: process.env["npm_package_version"] ?? "0.1.0",
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      database,
    };
  });
}
