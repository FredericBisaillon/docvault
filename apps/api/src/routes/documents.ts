// apps/api/src/routes/documents.ts
import type { FastifyInstance, FastifyRequest } from "fastify";
import { Type } from "@sinclair/typebox";

import {
    createDocumentWithVersion,
    createDocumentVersionForOwner,
    getDocumentWithLatestVersionForOwner,
    listDocumentVersionsForOwner,
    setDocumentArchivedForOwner,
    listDocumentsWithLatestVersionByOwnerPaged,
    renameDocumentForOwner
} from "../repositories/documents.repo.js";

function requireUser(req: FastifyRequest): { id: string } {
    if (!req.user) {
        throw new Error("AUTH_REQUIRED: req.user missing (devAuthPlugin not applied?)");
    }
    return req.user;
}

const ErrorSchema = Type.Object({
    error: Type.String(),
    message: Type.Optional(Type.String()),
});

const DocIdParams = Type.Object({
    id: Type.String({ format: "uuid" }),
});

const CreateDocumentBody = Type.Object({
    title: Type.String({ minLength: 1, maxLength: 200 }),
    content: Type.String({ minLength: 1 }),
});

const CreateVersionBody = Type.Object({
    content: Type.String({ minLength: 1 }),
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

const RenameDocumentBody = Type.Object({
    title: Type.String({ minLength: 1, maxLength: 200 }),
});


const ListDocumentsQuery = Type.Object({
    includeArchived: Type.Optional(
        Type.Union([Type.Literal("true"), Type.Literal("false"), Type.Literal("1"), Type.Literal("0")])
    ),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
    cursor: Type.Optional(Type.String()),
});

const ListDocumentsResponse = Type.Object({
    items: Type.Array(
        Type.Object({
            document: DocumentSchema,
            latestVersion: VersionSchema,
        })
    ),
    nextCursor: Type.Union([Type.String(), Type.Null()]),
});


export async function documentsRoutes(app: FastifyInstance) {
    app.post(
        "/documents",
        {
            schema: {
                tags: ["documents"],
                body: CreateDocumentBody,
                response: {
                    201: Type.Object({ document: DocumentSchema, version: VersionSchema }),
                    401: ErrorSchema,
                    422: ErrorSchema,
                    500: ErrorSchema,
                },
            },
        },
        async (req, reply) => {
            const ownerId = requireUser(req).id;
            const { title, content } = req.body as { title: string; content: string };

            const result = await createDocumentWithVersion({
                ownerId,
                title,
                content,
            });

            return reply.code(201).send(result);
        }
    );
    app.get(
        "/documents",
        {
            schema: {
                tags: ["documents"],
                querystring: ListDocumentsQuery,
                response: {
                    200: ListDocumentsResponse,
                    401: ErrorSchema,
                    400: ErrorSchema,
                    500: ErrorSchema,
                },
            },
        },
        async (req, reply) => {
            const ownerId = requireUser(req).id;
            const query = req.query as { includeArchived?: string; limit?: number; cursor?: string };

            const includeArchived = query.includeArchived === "true" || query.includeArchived === "1";
            const limit = query.limit ?? 10;

            const result = await listDocumentsWithLatestVersionByOwnerPaged({
                ownerId,
                includeArchived,
                limit,
                cursor: query.cursor,
            });

            return reply.code(200).send(result);
        }
    );

    app.get(
        "/documents/:id",
        {
            schema: {
                tags: ["documents"],
                params: DocIdParams,
                response: {
                    200: Type.Object({ document: DocumentSchema, latestVersion: VersionSchema }),
                    401: ErrorSchema,
                    404: ErrorSchema,
                    422: ErrorSchema,
                    500: ErrorSchema,
                },
            },
        },
        async (req, reply) => {
            const ownerId = requireUser(req).id;
            const { id: documentId } = req.params as { id: string };

            const result = await getDocumentWithLatestVersionForOwner({
                documentId,
                ownerId,
            });

            if (!result) {
                return reply.code(404).send({
                    error: "DOCUMENT_NOT_FOUND",
                    message: "Document not found",
                });
            }

            return reply.code(200).send(result);
        }
    );

    app.get(
        "/documents/:id/versions",
        {
            schema: {
                tags: ["versions"],
                params: DocIdParams,
                response: {
                    200: Type.Object({ versions: Type.Array(VersionSchema) }),
                    401: ErrorSchema,
                    404: ErrorSchema,
                    422: ErrorSchema,
                    500: ErrorSchema,
                },
            },
        },
        async (req, reply) => {
            const ownerId = requireUser(req).id;
            const { id: documentId } = req.params as { id: string };

            const versions = await listDocumentVersionsForOwner({
                documentId,
                ownerId,
            });

            if (!versions) {
                return reply.code(404).send({
                    error: "DOCUMENT_NOT_FOUND",
                    message: "Document not found",
                });
            }

            return reply.code(200).send({ versions });
        }
    );

    app.post(
        "/documents/:id/versions",
        {
            schema: {
                tags: ["versions"],
                params: DocIdParams,
                body: CreateVersionBody,
                response: {
                    201: Type.Object({ version: VersionSchema }),
                    401: ErrorSchema,
                    404: ErrorSchema,
                    409: ErrorSchema,
                    422: ErrorSchema,
                    500: ErrorSchema,
                },
            },
        },
        async (req, reply) => {
            const ownerId = requireUser(req).id;
            const { id: documentId } = req.params as { id: string };
            const { content } = req.body as { content: string };

            const version = await createDocumentVersionForOwner({
                documentId,
                ownerId,
                content,
            });

            if (!version) {
                return reply.code(404).send({
                    error: "DOCUMENT_NOT_FOUND",
                    message: "Document not found",
                });
            }

            return reply.code(201).send({ version });
        }
    );
    // PATCH /documents/:id (rename title)
    app.patch(
        "/documents/:id",
        {
            schema: {
                tags: ["documents"],
                params: DocIdParams,
                body: RenameDocumentBody,
                response: {
                    200: Type.Object({ document: DocumentSchema }),
                    401: ErrorSchema,
                    404: ErrorSchema,
                    400: ErrorSchema,
                    500: ErrorSchema,
                },
            },
        },
        async (req, reply) => {
            const ownerId = requireUser(req).id;
            const { id: documentId } = req.params as { id: string };
            const { title } = req.body as { title: string };

            const updated = await renameDocumentForOwner({ documentId, ownerId, title });

            if (!updated) {
                return reply.code(404).send({
                    error: "DOCUMENT_NOT_FOUND",
                    message: "Document not found",
                });
            }

            return reply.code(200).send({ document: updated });
        }
    );

    app.patch(
        "/documents/:id/archive",
        {
            schema: {
                tags: ["documents"],
                params: DocIdParams,
                response: {
                    200: Type.Object({ document: DocumentSchema }),
                    401: ErrorSchema,
                    404: ErrorSchema,
                    422: ErrorSchema,
                    500: ErrorSchema,
                },
            },
        },
        async (req, reply) => {
            const ownerId = requireUser(req).id;
            const { id: documentId } = req.params as { id: string };

            const updated = await setDocumentArchivedForOwner({
                documentId,
                ownerId,
                isArchived: true,
            });

            if (!updated) {
                return reply.code(404).send({
                    error: "DOCUMENT_NOT_FOUND",
                    message: "Document not found",
                });
            }

            return reply.code(200).send({ document: updated });
        }
    );

    app.patch(
        "/documents/:id/unarchive",
        {
            schema: {
                tags: ["documents"],
                params: DocIdParams,
                response: {
                    200: Type.Object({ document: DocumentSchema }),
                    401: ErrorSchema,
                    404: ErrorSchema,
                    422: ErrorSchema,
                    500: ErrorSchema,
                },
            },
        },
        async (req, reply) => {
            const ownerId = requireUser(req).id;
            const { id: documentId } = req.params as { id: string };

            const updated = await setDocumentArchivedForOwner({
                documentId,
                ownerId,
                isArchived: false,
            });

            if (!updated) {
                return reply.code(404).send({
                    error: "DOCUMENT_NOT_FOUND",
                    message: "Document not found",
                });
            }

            return reply.code(200).send({ document: updated });
        }
    );
}
