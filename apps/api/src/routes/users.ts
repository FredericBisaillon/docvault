import type { FastifyInstance, FastifyRequest } from "fastify";
import { Type } from "@sinclair/typebox";

import { createUser, getUserByEmail, getUserById } from "../repositories/users.repo.js";
import { listDocumentsWithLatestVersionByOwnerPaged } from "../repositories/documents.repo.js";

function requireUser(req: FastifyRequest): { id: string } {
  if (!req.user) {
    throw new Error("AUTH_REQUIRED: req.user missing (auth hook not applied?)");
  }
  return req.user;
}

const ErrorSchema = Type.Object({
  error: Type.String(),
  message: Type.Optional(Type.String()),
});

const UserSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  email: Type.String({ format: "email" }),
  display_name: Type.String(),
  created_at: Type.String(),
  updated_at: Type.String(),
});

const CreateUserBody = Type.Object({
  email: Type.String({ format: "email" }),
  displayName: Type.String({ minLength: 1, maxLength: 80 }),
});

const ListUserDocsParams = Type.Object({
  id: Type.String({ format: "uuid" }),
});

const ListUserDocsQuery = Type.Object({
  includeArchived: Type.Optional(
    Type.Union([Type.Literal("true"), Type.Literal("false"), Type.Literal("1"), Type.Literal("0")])
  ),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
  cursor: Type.Optional(Type.String()),
});

const DocumentSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  owner_id: Type.String({ format: "uuid" }),
  title: Type.String(),
  is_archived: Type.Boolean(),
  created_at: Type.String(),
  updated_at: Type.String(),
});

const VersionSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  document_id: Type.String({ format: "uuid" }),
  version_number: Type.Integer(),
  content: Type.String(),
  created_at: Type.String(),
});

const ListUserDocsResponse = Type.Object({
  items: Type.Array(
    Type.Object({
      document: DocumentSchema,
      latestVersion: VersionSchema,
    })
  ),
  nextCursor: Type.Union([Type.String(), Type.Null()]),
});

export async function usersRoutes(app: FastifyInstance) {
  app.post(
    "/users",
    {
      schema: {
        tags: ["users"],
        body: CreateUserBody,
        response: {
          201: Type.Object({ user: UserSchema }),
          409: ErrorSchema,
          400: ErrorSchema,
          500: ErrorSchema,
        },
      },
    },
    async (req, reply) => {
      const body = req.body as { email: string; displayName: string };

      const existing = await getUserByEmail(body.email);
      if (existing) {
        return reply.code(409).send({ error: "EMAIL_EXISTS", message: "Email already exists" });
      }

      const user = await createUser({ email: body.email, displayName: body.displayName });
      return reply.code(201).send({ user });
    }
  );

  app.get(
    "/users/:id/documents",
    {
      schema: {
        tags: ["users"],
        params: ListUserDocsParams,
        querystring: ListUserDocsQuery,
        response: {
          200: ListUserDocsResponse,
          401: ErrorSchema,
          403: ErrorSchema,
          404: ErrorSchema,
          400: ErrorSchema,
          500: ErrorSchema,
        },
      },
    },
    async (req, reply) => {
      const authUser = requireUser(req);
      const params = req.params as { id: string };
      const query = req.query as { includeArchived?: string; limit?: number; cursor?: string };

      if (authUser.id !== params.id) {
        return reply.code(403).send({
          error: "FORBIDDEN",
          message: "You can only access your own documents",
        });
      }

      const user = await getUserById(params.id);
      if (!user) {
        return reply.code(404).send({ error: "USER_NOT_FOUND", message: "User not found" });
      }

      const includeArchived = query.includeArchived === "true" || query.includeArchived === "1";
      const limit = query.limit ?? 10;

      const result = await listDocumentsWithLatestVersionByOwnerPaged({
        ownerId: params.id,
        includeArchived,
        limit,
        cursor: query.cursor,
      });

      return reply.code(200).send(result);
    }
  );
}
