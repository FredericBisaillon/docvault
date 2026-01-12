import { pool } from "../db/pool.js";
import type { Document, DocumentVersion } from "../db/types.js";

export async function createDocumentWithVersion(input: {
    ownerId: string;
    title: string;
    content: string;
}): Promise<{ document: Document; version: DocumentVersion }> {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const docRes = await client.query<Document>(
            `
      INSERT INTO documents (owner_id, title)
      VALUES ($1, $2)
      RETURNING *
      `,
            [input.ownerId, input.title]
        );

        const document = docRes.rows[0]!;
        const verRes = await client.query<DocumentVersion>(
            `
      INSERT INTO document_versions (document_id, version_number, content)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
            [document.id, 1, input.content]
        );

        const version = verRes.rows[0]!;
        await client.query("COMMIT");
        return { document, version };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

export async function getDocumentWithLatestVersionForOwner(input: {
    documentId: string;
    ownerId: string;
}): Promise<{ document: Document; latestVersion: DocumentVersion } | null> {
    const res = await pool.query<
        Document & {
            v_id: string;
            v_document_id: string;
            v_version_number: number;
            v_content: string;
            v_created_at: string;
        }
    >(
        `
    SELECT
      d.*,
      v.id AS v_id,
      v.document_id AS v_document_id,
      v.version_number AS v_version_number,
      v.content AS v_content,
      v.created_at AS v_created_at
    FROM documents d
    JOIN document_versions v
      ON v.document_id = d.id
    WHERE d.id = $1
      AND d.owner_id = $2
    ORDER BY v.version_number DESC
    LIMIT 1
    `,
        [input.documentId, input.ownerId]
    );

    const row = res.rows[0];
    if (!row) return null;

    const document: Document = {
        id: row.id,
        owner_id: row.owner_id,
        title: row.title,
        is_archived: row.is_archived,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };

    const latestVersion: DocumentVersion = {
        id: row.v_id,
        document_id: row.v_document_id,
        version_number: row.v_version_number,
        content: row.v_content,
        created_at: row.v_created_at,
    };

    return { document, latestVersion };
}

export async function listDocumentVersionsForOwner(input: {
    documentId: string;
    ownerId: string;
}): Promise<DocumentVersion[] | null> {
    const own = await pool.query(
        `SELECT 1 FROM documents WHERE id = $1 AND owner_id = $2 LIMIT 1`,
        [input.documentId, input.ownerId]
    );
    if (own.rowCount === 0) return null;

    const res = await pool.query<DocumentVersion>(
        `
    SELECT *
    FROM document_versions
    WHERE document_id = $1
    ORDER BY version_number DESC
    `,
        [input.documentId]
    );

    return res.rows;
}

export async function createDocumentVersionForOwner(input: {
    documentId: string;
    ownerId: string;
    content: string;
}): Promise<DocumentVersion | null> {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const lockRes = await client.query<{ id: string }>(
            `SELECT id FROM documents WHERE id = $1 AND owner_id = $2 FOR UPDATE`,
            [input.documentId, input.ownerId]
        );

        if (lockRes.rows.length === 0) {
            await client.query("ROLLBACK");
            return null;
        }

        const nextRes = await client.query<{ next_version: number }>(
            `
      SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version
      FROM document_versions
      WHERE document_id = $1
      `,
            [input.documentId]
        );

        const nextVersion = nextRes.rows[0]!.next_version;

        const verRes = await client.query<DocumentVersion>(
            `
      INSERT INTO document_versions (document_id, version_number, content)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
            [input.documentId, nextVersion, input.content]
        );

        const version = verRes.rows[0]!;
        await client.query("COMMIT");
        return version;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

export async function setDocumentArchivedForOwner(input: {
    documentId: string;
    ownerId: string;
    isArchived: boolean;
}): Promise<Document | null> {
    const res = await pool.query<Document>(
        `
    UPDATE documents
    SET is_archived = $3,
        updated_at = now()
    WHERE id = $1
      AND owner_id = $2
    RETURNING *
    `,
        [input.documentId, input.ownerId, input.isArchived]
    );

    return res.rows[0] ?? null;
}

export async function listDocumentsWithLatestVersionByOwnerPaged(input: {
    ownerId: string;
    includeArchived?: boolean;
    limit?: number;
    cursor?: string;
}): Promise<{
    items: Array<{ document: Document; latestVersion: DocumentVersion }>;
    nextCursor: string | null;
}> {
    const includeArchived = input.includeArchived ?? false;
    const limit = Math.min(Math.max(input.limit ?? 10, 1), 50);
    const cursor = input.cursor ?? null;

    const pageSize = limit + 1;

    const res = await pool.query<
        Document & {
            v_id: string;
            v_document_id: string;
            v_version_number: number;
            v_content: string;
            v_created_at: string;
        }
    >(
        `
    WITH latest AS (
      SELECT DISTINCT ON (d.id)
        d.*,
        v.id AS v_id,
        v.document_id AS v_document_id,
        v.version_number AS v_version_number,
        v.content AS v_content,
        v.created_at AS v_created_at
      FROM documents d
      JOIN document_versions v
        ON v.document_id = d.id
      WHERE d.owner_id = $1
        AND ($2::boolean = true OR d.is_archived = false)
        AND ($3::uuid IS NULL OR d.id > $3::uuid)
      ORDER BY d.id, v.version_number DESC
    )
    SELECT *
    FROM latest
    ORDER BY id
    LIMIT $4
    `,
        [input.ownerId, includeArchived, cursor, pageSize]
    );

    const mapped = res.rows.map((row) => ({
        document: {
            id: row.id,
            owner_id: row.owner_id,
            title: row.title,
            is_archived: row.is_archived,
            created_at: row.created_at,
            updated_at: row.updated_at,
        },
        latestVersion: {
            id: row.v_id,
            document_id: row.v_document_id,
            version_number: row.v_version_number,
            content: row.v_content,
            created_at: row.v_created_at,
        },
    }));

    const hasNext = mapped.length > limit;
    const items = hasNext ? mapped.slice(0, limit) : mapped;

    const nextCursor = hasNext ? items[items.length - 1]!.document.id : null;

    return { items, nextCursor };
}

export async function renameDocumentForOwner(opts: {
    documentId: string;
    ownerId: string;
    title: string;
}) {
    const { documentId, ownerId, title } = opts;

    const result = await pool.query(
        `
    UPDATE documents
    SET title = $3, updated_at = now()
    WHERE id = $1 AND owner_id = $2
    RETURNING id, owner_id, title, is_archived, created_at, updated_at
    `,
        [documentId, ownerId, title]
    );

    return result.rows[0] ?? null;
}
