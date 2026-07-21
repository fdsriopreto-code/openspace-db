import { resolve } from "node:path";
import chalk from "chalk";
import ora from "ora";
import open from "open";
import prompts from "prompts";
import { ensureEnvFile } from "../lib/env-file.js";
import { composeUp, isDockerAvailable } from "../lib/docker.js";
import { waitForHttpOk } from "../lib/wait-for.js";

export async function runInstall(cwd: string): Promise<void> {
  const envPath = resolve(cwd, ".env");
  const env = ensureEnvFile(envPath);

  if (!(await isDockerAvailable())) {
    console.error(chalk.red("✗ Docker não encontrado ou não está em execução."));
    console.error(
      chalk.dim("  Instale o Docker Desktop (https://docs.docker.com/desktop/) e rode `openspace install` novamente."),
    );
    process.exitCode = 1;
    return;
  }

  const spinner = ora("Subindo Postgres, API e Dashboard...").start();
  try {
    await composeUp(cwd, envPath);
    spinner.succeed("Containers do Core no ar.");
  } catch (err) {
    spinner.fail("Falha ao subir os containers.");
    throw err;
  }

  const apiUrl = `http://localhost:${env.API_PORT}`;
  const healthSpinner = ora("Aguardando a API responder...").start();
  const healthy = await waitForHttpOk(`${apiUrl}/health`);
  if (!healthy) {
    healthSpinner.fail("A API não respondeu a tempo. Rode `openspace doctor` para diagnosticar.");
    process.exitCode = 1;
    return;
  }
  healthSpinner.succeed("API operacional.");

  await bootstrapAdmin(apiUrl);

  const dashboardUrl = `http://localhost:${env.DASHBOARD_PORT}`;
  console.log(chalk.green(`\n✓ OpenSpace-DB está no ar em ${chalk.bold(dashboardUrl)}`));
  await open(dashboardUrl).catch(() => undefined);
}

async function bootstrapAdmin(apiUrl: string): Promise<void> {
  const status = await fetch(`${apiUrl}/api/auth/bootstrap-status`)
    .then((res) => res.json() as Promise<{ bootstrapped: boolean }>)
    .catch(() => ({ bootstrapped: false }));

  if (status.bootstrapped) {
    console.log(chalk.dim("  Administrador já existe — pulando criação."));
    return;
  }

  console.log(chalk.bold("\nCrie o primeiro administrador:"));
  const answers = await prompts([
    { type: "text", name: "email", message: "Email", validate: (v: string) => v.includes("@") || "Email inválido" },
    {
      type: "password",
      name: "password",
      message: "Senha (mínimo 8 caracteres)",
      validate: (v: string) => v.length >= 8 || "Mínimo de 8 caracteres",
    },
  ]);

  if (!answers.email || !answers.password) {
    console.log(chalk.yellow("  Criação de administrador cancelada. Rode `openspace install` novamente."));
    return;
  }

  const response = await fetch(`${apiUrl}/api/auth/bootstrap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(answers),
  });

  if (!response.ok) {
    console.error(chalk.red("  Falha ao criar administrador:"), await response.text());
    process.exitCode = 1;
    return;
  }

  console.log(chalk.green("  ✓ Administrador criado."));
}
