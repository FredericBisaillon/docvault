import type { FastifyInstance } from "fastify";
import { createUser, getUserByEmail } from "../repositories/users.repo.js";

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
}
