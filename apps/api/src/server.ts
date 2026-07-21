import closeWithGrace from "close-with-grace";
import { loadEnv } from "./env.js";
import { buildApp } from "./app.js";

async function main(): Promise<void> {
  const env = loadEnv();
  const app = await buildApp(env);

  closeWithGrace(async ({ err }) => {
    if (err) app.log.error(err);
    await app.close();
  });

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
