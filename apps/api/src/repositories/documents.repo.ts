import type { PoolClient } from "pg";
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

export async function getDocumentWithLatestVersion(documentId: string): Promise<{
  document: Document;
  latestVersion: DocumentVersion;
} | null> {
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
    ORDER BY v.version_number DESC
    LIMIT 1
    `,
    [documentId]
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

export async function listDocumentsWithLatestVersionByOwner(ownerId: string): Promise<
  Array<{ document: Document; latestVersion: DocumentVersion }>
> {
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
    ORDER BY d.id, v.version_number DESC
    `,
    [ownerId]
  );

  return res.rows.map((row) => ({
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
}

