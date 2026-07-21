import { PrismaClient } from "../generated/client/index.js";

declare global {
  var __openspaceDbPrisma: PrismaClient | undefined;
}

/**
 * Single shared PrismaClient instance for the control-plane (`openspace` schema).
 * Reused across hot-reloads in dev to avoid exhausting Postgres connections.
 */
export const prisma = globalThis.__openspaceDbPrisma ?? new PrismaClient();

if (process.env["NODE_ENV"] !== "production") {
  globalThis.__openspaceDbPrisma = prisma;
}
