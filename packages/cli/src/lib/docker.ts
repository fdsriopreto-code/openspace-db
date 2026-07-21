import { execa } from "execa";

const COMPOSE_FILE = "infra/docker/docker-compose.yml";

export async function isDockerAvailable(): Promise<boolean> {
  try {
    await execa("docker", ["info"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export async function composeUp(cwd: string, envFile: string): Promise<void> {
  await execa("docker", ["compose", "-f", COMPOSE_FILE, "--env-file", envFile, "up", "-d", "--build"], {
    cwd,
    stdio: "inherit",
  });
}

export async function composeDown(cwd: string, envFile: string): Promise<void> {
  await execa("docker", ["compose", "-f", COMPOSE_FILE, "--env-file", envFile, "down"], {
    cwd,
    stdio: "inherit",
  });
}

export async function composePs(cwd: string, envFile: string): Promise<string> {
  const { stdout } = await execa("docker", ["compose", "-f", COMPOSE_FILE, "--env-file", envFile, "ps"], { cwd });
  return stdout;
}
