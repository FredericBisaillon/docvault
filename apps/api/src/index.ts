import "dotenv/config";
import { buildServer } from "./server.js";
import { usersRoutes } from "./routes/users.js";
import { documentsRoutes } from "./routes/documents.js";


const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? "0.0.0.0";

async function main() {
  const app = buildServer();

  app.register(usersRoutes);
  app.register(documentsRoutes);


  try {
    await app.listen({ port: PORT, host: HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
