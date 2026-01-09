import type { FastifyInstance } from "fastify";
import { Type } from "@sinclair/typebox";

import {
    createDocumentWithVersion,
    createDocumentVersion,
    getDocumentWithLatestVersion,
    listDocumentVersions,
    setDocumentArchived,
} from "../repositories/documents.repo.js";
import { getUserById } from "../repositories/users.repo.js";

const ErrorSchema = Type.Object({ error: Type.String() });

const DocIdParams = Type.Object({ id: Type.String() });

const CreateDocumentBody = Type.Object({
    ownerId: Type.String(),
    title: Type.String({ minLength: 1, maxLength: 200 }),
    content: Type.String({ minLength: 1 }),
});

const CreateVersionBody = Type.Object({
    content: Type.String({ minLength: 1 }),
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

export async function documentsRoutes(app: FastifyInstance) {
    // POST /documents
    app.post(
        "/documents",
        {
            schema: {
                tags: ["documents"],
                body: CreateDocumentBody,
                response: {
                    201: Type.Object({
                        document: DocumentSchema,
                        version: VersionSchema,
                    }),
                    404: ErrorSchema,
                },
            },
        },
        async (req, reply) => {
            const body = req.body as { ownerId: string; title: string; content: string };

            const owner = await getUserById(body.ownerId);
            if (!owner) return reply.code(404).send({ error: "owner not found" });

            const result = await createDocumentWithVersion(body);
            return reply.code(201).send(result);
        }
    );

    // GET /documents/:id (latest version)
    app.get(
        "/documents/:id",
        {
            schema: {
                tags: ["documents"],
                params: DocIdParams,
                response: {
                    200: Type.Object({
                        document: DocumentSchema,
                        latestVersion: VersionSchema,
                    }),
                    404: ErrorSchema,
                },
            },
        },
        async (req, reply) => {
            const params = req.params as { id: string };

            const result = await getDocumentWithLatestVersion(params.id);
            if (!result) return reply.code(404).send({ error: "document not found" });

            return reply.code(200).send(result);
        }
    );

    // GET /documents/:id/versions
    app.get(
        "/documents/:id/versions",
        {
            schema: {
                tags: ["versions"],
                params: DocIdParams,
                response: {
                    200: Type.Object({ versions: Type.Array(VersionSchema) }),
                },
            },
        },
        async (req, reply) => {
            const params = req.params as { id: string };
            const versions = await listDocumentVersions(params.id);
            return reply.code(200).send({ versions });
        }
    );

    // POST /documents/:id/versions
    app.post(
        "/documents/:id/versions",
        {
            schema: {
                tags: ["versions"],
                params: DocIdParams,
                body: CreateVersionBody,
                response: {
                    201: Type.Object({ version: VersionSchema }),
                    404: ErrorSchema,
                },
            },
        },
        async (req, reply) => {
            const params = req.params as { id: string };
            const body = req.body as { content: string };

            try {
                const version = await createDocumentVersion({
                    documentId: params.id,
                    content: body.content,
                });
                return reply.code(201).send({ version });
            } catch (err: any) {
                if (err?.message === "DOCUMENT_NOT_FOUND") {
                    return reply.code(404).send({ error: "document not found" });
                }
                throw err;
            }
        }
    );

    // PATCH /documents/:id/archive
    app.patch(
        "/documents/:id/archive",
        {
            schema: {
                tags: ["documents"],
                params: DocIdParams,
                response: {
                    200: Type.Object({ document: DocumentSchema }),
                    404: ErrorSchema,
                },
            },
        },
        async (req, reply) => {
            const params = req.params as { id: string };

            const updated = await setDocumentArchived({ documentId: params.id, isArchived: true });
            if (!updated) return reply.code(404).send({ error: "document not found" });

            return reply.code(200).send({ document: updated });
        }
    );

    // PATCH /documents/:id/unarchive
    app.patch(
        "/documents/:id/unarchive",
        {
            schema: {
                tags: ["documents"],
                params: DocIdParams,
                response: {
                    200: Type.Object({ document: DocumentSchema }),
                    404: ErrorSchema,
                },
            },
        },
        async (req, reply) => {
            const params = req.params as { id: string };

            const updated = await setDocumentArchived({ documentId: params.id, isArchived: false });
            if (!updated) return reply.code(404).send({ error: "document not found" });

            return reply.code(200).send({ document: updated });
        }
    );
}
