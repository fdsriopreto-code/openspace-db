import { existsSync } from "node:fs";
import { resolve } from "node:path";
import chalk from "chalk";
import { isDockerAvailable, composePs } from "../lib/docker.js";

function check(label: string, ok: boolean, hint?: string): void {
  console.log(ok ? chalk.green("✓") : chalk.red("✗"), label);
  if (!ok && hint) console.log(chalk.dim(`  ${hint}`));
}

export async function runDoctor(cwd: string): Promise<void> {
  console.log(chalk.bold("OpenSpace-DB — diagnóstico\n"));

  const envPath = resolve(cwd, ".env");
  const envExists = existsSync(envPath);
  check(".env presente", envExists, "Rode `openspace init` para gerar o ambiente.");

  const dockerOk = await isDockerAvailable();
  check("Docker disponível e em execução", dockerOk, "Instale/inicie o Docker Desktop.");

  if (dockerOk && envExists) {
    try {
      const ps = await composePs(cwd, envPath);
      const running = ps.includes("running") || ps.includes("Up");
      check("Containers do Core em execução", running, "Rode `openspace install` para subir o stack.");
    } catch {
      check("Containers do Core em execução", false, "Rode `openspace install` para subir o stack.");
    }
  }
}
