#!/usr/bin/env node
import { Command } from "commander";
import { runInit } from "./commands/init.js";
import { runInstall } from "./commands/install.js";
import { runDoctor } from "./commands/doctor.js";

const program = new Command();

program.name("openspace").description("CLI oficial do OpenSpace-DB").version("0.1.0");

program
  .command("init")
  .description("Gera o .env com segredos e configuração padrão do Core")
  .action(() => runInit(process.cwd()));

program
  .command("install")
  .description("Sobe o Core (Postgres, API, Dashboard) e cria o primeiro administrador")
  .action(async () => runInstall(process.cwd()));

program
  .command("doctor")
  .description("Diagnostica a instalação local")
  .action(async () => runDoctor(process.cwd()));

program.parseAsync().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
