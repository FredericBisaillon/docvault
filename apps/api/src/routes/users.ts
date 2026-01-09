import type { FastifyInstance } from "fastify";
import { createUser, getUserByEmail } from "../repositories/users.repo.js";
import { listDocumentsWithLatestVersionByOwner } from "../repositories/documents.repo.js";
import { getUserById } from "../repositories/users.repo.js";


export async function usersRoutes(app: FastifyInstance) {
  app.post("/users", async (req, reply) => {
    const body = req.body as { email?: string; displayName?: string };

    if (!body.email || !body.displayName) {
      return reply.code(400).send({ error: "email and displayName are required" });
    }

    const existing = await getUserByEmail(body.email);
    if (existing) {
      return reply.code(409).send({ error: "email already exists" });
    }

    const user = await createUser({
      email: body.email,
      displayName: body.displayName,
    });

    return reply.code(201).send({ user });
  });

  app.get("/users/:id/documents", async (req, reply) => {
  const params = req.params as { id?: string };
  if (!params.id) {
    return reply.code(400).send({ error: "id is required" });
  }

  const user = await getUserById(params.id);
  if (!user) {
    return reply.code(404).send({ error: "user not found" });
  }

  const items = await listDocumentsWithLatestVersionByOwner(params.id);
  return reply.code(200).send({ items });
});

}
