import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";

import { healthRoutes } from "./routes/health.js";
import { readyRoutes } from "./routes/ready.js";
import { usersRoutes } from "./routes/users.js";
import { documentsRoutes } from "./routes/documents.js";

export function buildServer() {
  const app = Fastify({ logger: true }).withTypeProvider<TypeBoxTypeProvider>();

  app.setErrorHandler((err, req, reply) => {
    if ((err as any).validation) {
      return reply.code(400).send({
        error: "validation_error",
        details: (err as any).validation,
      });
    }

    req.log.error(err);
    return reply.code(500).send({ error: "internal_error" });
  });

  app.register(swagger, {
    openapi: {
      info: {
        title: "DocVault API",
        description: "Backend API for DocVault (versioned documents)",
        version: "0.1.0",
      },
    },
  });

  app.register(swaggerUI, {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list" },
  });

  // routes
  app.register(healthRoutes);
  app.register(readyRoutes);
  app.register(usersRoutes);
  app.register(documentsRoutes);

  return app;
}
