import type { FastifyInstance } from "fastify";
import { createDocumentWithVersion } from "../repositories/documents.repo.js";
import { getDocumentWithLatestVersion } from "../repositories/documents.repo.js";
import { getUserById } from "../repositories/users.repo.js";

export async function documentsRoutes(app: FastifyInstance) {
  app.post("/documents", async (req, reply) => {
    const body = req.body as {
      ownerId?: string;
      title?: string;
      content?: string;
    };

    if (!body.ownerId || !body.title || !body.content) {
      return reply
        .code(400)
        .send({ error: "ownerId, title and content are required" });
    }

    const owner = await getUserById(body.ownerId);
    if (!owner) {
      return reply.code(404).send({ error: "owner not found" });
    }

    const result = await createDocumentWithVersion({
      ownerId: body.ownerId,
      title: body.title,
      content: body.content,
    });

    return reply.code(201).send(result);
  });
  app.get("/documents/:id", async (req, reply) => {
  const params = req.params as { id?: string };
  if (!params.id) {
    return reply.code(400).send({ error: "id is required" });
  }

  const result = await getDocumentWithLatestVersion(params.id);
  if (!result) {
    return reply.code(404).send({ error: "document not found" });
  }

  return reply.code(200).send(result);
});
}
