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
