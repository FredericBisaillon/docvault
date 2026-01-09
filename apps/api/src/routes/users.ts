import type { FastifyInstance } from "fastify";
import { Type } from "@sinclair/typebox";

import { createUser, getUserByEmail, getUserById } from "../repositories/users.repo.js";
import { listDocumentsWithLatestVersionByOwnerPaged } from "../repositories/documents.repo.js";

const ErrorSchema = Type.Object({ error: Type.String() });

const UserSchema = Type.Object({
    id: Type.String(),
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
    id: Type.String(),
});

const ListUserDocsQuery = Type.Object({
    includeArchived: Type.Optional(Type.Union([Type.Literal("true"), Type.Literal("false"), Type.Literal("1"), Type.Literal("0")])),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
    cursor: Type.Optional(Type.String()),
});

const DocumentSchema = Type.Object({
    id: Type.String(),
    owner_id: Type.String(),
    title: Type.String(),
    is_archived: Type.Boolean(),
    created_at: Type.String(),
    updated_at: Type.String(),
});

const VersionSchema = Type.Object({
    id: Type.String(),
    document_id: Type.String(),
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
    // POST /users
    app.post(
        "/users",
        {
            schema: {
                tags: ["users"],
                body: CreateUserBody,
                response: {
                    201: Type.Object({ user: UserSchema }),
                    409: ErrorSchema,
                },
            },
        },
        async (req, reply) => {
            const body = req.body as { email: string; displayName: string };

            const existing = await getUserByEmail(body.email);
            if (existing) return reply.code(409).send({ error: "email already exists" });

            const user = await createUser({ email: body.email, displayName: body.displayName });
            return reply.code(201).send({ user });
        }
    );

    // GET /users/:id/documents (cursor-based pagination)
    app.get(
        "/users/:id/documents",
        {
            schema: {
                tags: ["users"],
                params: ListUserDocsParams,
                querystring: ListUserDocsQuery,
                response: {
                    200: ListUserDocsResponse,
                    404: ErrorSchema,
                },
            },
        },
        async (req, reply) => {
            const params = req.params as { id: string };
            const query = req.query as { includeArchived?: string; limit?: number; cursor?: string };

            const user = await getUserById(params.id);
            if (!user) return reply.code(404).send({ error: "user not found" });

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
