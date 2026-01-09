import { pool } from "../db/pool.js";
import type { User } from "../db/types.js";

export async function createUser(input: {
  email: string;
  displayName: string;
}): Promise<User> {
  const res = await pool.query<User>(
    `
    INSERT INTO users (email, display_name)
    VALUES ($1, $2)
    RETURNING *
    `,
    [input.email, input.displayName]
  );

  return res.rows[0]!;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const res = await pool.query<User>(
    `SELECT * FROM users WHERE email = $1`,
    [email]
  );

  return res.rows[0] ?? null;
}

export async function getUserById(id: string): Promise<User | null> {
  const res = await pool.query<User>(
    `SELECT * FROM users WHERE id = $1`,
    [id]
  );

  return res.rows[0] ?? null;
}
