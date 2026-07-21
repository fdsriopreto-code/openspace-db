import { resolve } from "node:path";
import chalk from "chalk";
import { ensureEnvFile } from "../lib/env-file.js";

export function runInit(cwd: string): void {
  const envPath = resolve(cwd, ".env");
  const env = ensureEnvFile(envPath);

  console.log(chalk.green("✓"), `Ambiente pronto em ${chalk.dim(envPath)}`);
  console.log(chalk.dim(`  Postgres: ${env.POSTGRES_USER}@postgres:5432/${env.POSTGRES_DB}`));
  console.log(chalk.dim(`  Dashboard: http://localhost:${env.DASHBOARD_PORT}`));
  console.log(chalk.dim(`  API: http://localhost:${env.API_PORT}`));
}
