import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { generateSecret } from "./secrets.js";

export interface OpenSpaceEnv {
  [key: string]: string;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
  POSTGRES_DB: string;
  DATABASE_URL: string;
  JWT_SIGNING_SECRET: string;
  CORS_ORIGIN: string;
  ENVIRONMENT_TIER: "development" | "staging" | "production";
  API_PORT: string;
  DASHBOARD_PORT: string;
}

export function parseEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const content = readFileSync(path, "utf-8");
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    result[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return result;
}

export function writeEnvFile(path: string, env: Record<string, string>): void {
  const content =
    Object.entries(env)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n") + "\n";
  writeFileSync(path, content, "utf-8");
}

/**
 * Generates every secret and default the platform needs to boot with zero
 * manual configuration (docs/ARCHITECTURE.md §7). Idempotent: if a .env
 * already exists, its values are preserved and returned as-is.
 */
export function ensureEnvFile(path: string): OpenSpaceEnv {
  const existing = parseEnvFile(path);
  if (existing["JWT_SIGNING_SECRET"]) {
    return existing as unknown as OpenSpaceEnv;
  }

  const postgresPassword = generateSecret(24);
  const env: OpenSpaceEnv = {
    POSTGRES_USER: "openspace",
    POSTGRES_PASSWORD: postgresPassword,
    POSTGRES_DB: "openspace",
    DATABASE_URL: `postgresql://openspace:${postgresPassword}@postgres:5432/openspace?schema=openspace`,
    JWT_SIGNING_SECRET: generateSecret(48),
    CORS_ORIGIN: "http://localhost:8080",
    ENVIRONMENT_TIER: "development",
    API_PORT: "4000",
    DASHBOARD_PORT: "8080",
  };

  writeEnvFile(path, env);
  return env;
}
