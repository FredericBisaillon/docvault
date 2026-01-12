import "dotenv/config";
import { buildServer } from "./server.js";

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? "0.0.0.0";

async function main() {
  const app = buildServer();

  try {
    await (await app).listen({ port: PORT, host: HOST });
  } catch (err) {
    (await app).log.error(err);
    process.exit(1);
  }
}

main();
