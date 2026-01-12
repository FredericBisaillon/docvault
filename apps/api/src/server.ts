import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";

import { healthRoutes } from "./routes/health.js";
import { readyRoutes } from "./routes/ready.js";
import { usersRoutes } from "./routes/users.js";
import { documentsRoutes } from "./routes/documents.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: { id: string };
  }
}

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


  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function pathOnly(url: string) {
    return url.split("?")[0] ?? url;
  }

  function isPublicRoute(path: string, method: string) {
    // Public infra
    if (path.startsWith("/health") || path.startsWith("/ready") || path.startsWith("/docs")) {
      return true;
    }

    // Signup public
    if (method === "POST" && path === "/users") {
      return true;
    }

    return false;
  }

  app.decorateRequest("user", undefined);

  app.addHook("preHandler", async (req, reply) => {
    const path = pathOnly(req.url);

    if (isPublicRoute(path, req.method)) return;

    const userId = req.headers["x-user-id"];

    if (!userId || typeof userId !== "string") {
      return reply.code(401).send({
        error: "AUTH_REQUIRED",
        message: "Missing x-user-id header",
      });
    }

    if (!UUID_RE.test(userId)) {
      return reply.code(401).send({
        error: "INVALID_AUTH",
        message: "Invalid x-user-id (must be UUID)",
      });
    }

    req.user = { id: userId };
  });


  app.register(healthRoutes);
  app.register(readyRoutes);
  app.register(usersRoutes);
  app.register(documentsRoutes);

  return app;
}
