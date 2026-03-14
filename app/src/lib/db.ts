import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is required in production");
  }
  // Dev-only warning — app will fail gracefully if DB unreachable
  console.warn("[db] DATABASE_URL not set — using fallback (dev only)");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5433/openloop",
  max: 10,                        // max connections
  idleTimeoutMillis: 30_000,      // release idle connections after 30s
  connectionTimeoutMillis: 5_000, // fail fast if can't connect in 5s
  statement_timeout: 15_000,      // kill queries running > 15s
  application_name: "openloop",
});

pool.on("error", (err) => {
  console.error("[db] Pool error:", err.message);
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
