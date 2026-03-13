import { Pool } from "pg";

// In development always use Docker DB so the app shows data. Production uses DATABASE_URL.
const connectionString =
  process.env.NODE_ENV === "production"
    ? process.env.DATABASE_URL
    : "postgresql://postgres:postgres@127.0.0.1:5433/openloop";

const pool = new Pool({
  connectionString,
  max: 10,
});

export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
  } finally {
    client.release();
  }
}

export async function getClient() {
  return pool.connect();
}

export default pool;
