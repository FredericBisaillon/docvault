import type { FastifyInstance } from "fastify";

export async function readyRoutes(app: FastifyInstance) {
  app.get(
    "/ready",
    {
      schema: {
        tags: ["health"],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: { status: { type: "string" } },
            required: ["status"],
          },
          401: {
            type: "object",
            properties: { error: { type: "string" } },
            required: ["error"],
          },
        },
      },
    },
    async (_req, reply) => {
      return reply.code(200).send({ status: "ready" });
    }
  );
}
