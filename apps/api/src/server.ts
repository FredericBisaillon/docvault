import Fastify from "fastify";
import { healthRoutes } from "./routes/health.js";
import { readyRoutes } from "./routes/ready.js";


export function buildServer() {
  const app = Fastify({ logger: true });

  app.register(healthRoutes);
  app.register(readyRoutes);

  return app;
}
