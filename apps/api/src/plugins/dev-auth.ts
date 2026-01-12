import type { FastifyPluginAsync } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    user?: { id: string };
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function pathOnly(url: string) {
  return url.split("?")[0] ?? url;
}

function isPublic(path: string, method: string) {
  // Health / readiness / docs (peu importe prefix)
  if (path.endsWith("/health") || path.endsWith("/ready") || path.includes("/docs")) return true;

  // Signup public (peu importe prefix)
  if (method === "POST" && path.endsWith("/users")) return true;

  return false;
}

export const devAuthPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest("user", undefined);

  app.addHook("preHandler", async (req, reply) => {
    const path = pathOnly(req.url);

    if (isPublic(path, req.method)) return;

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
};
