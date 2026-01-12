import { pool } from "../db.js";

export type ApiKeyRecord = {
  id: string;
  user_id: string;
  scopes: string[];
  is_active: boolean;
};

export async function getApiKeyByHash(hashHex: string) {
  const res = await pool.query<ApiKeyRecord>(
    `
    SELECT id, user_id, scopes, is_active
    FROM api_keys
    WHERE key_hash = $1
    LIMIT 1
    `,
    [hashHex]
  );

  return res.rows[0] ?? null;
}

export async function touchApiKeyLastUsed(apiKeyId: string) {
  await pool.query(`UPDATE api_keys SET last_used_at = now() WHERE id = $1`, [
    apiKeyId,
  ]);
}
