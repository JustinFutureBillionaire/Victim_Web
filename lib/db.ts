import "server-only";
import { Pool, type QueryResult } from "pg";

export type SqlResult =
  | { ok: true; rowCount: number | null; rows: unknown[] }
  | { ok: false; error: string };

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;
  const url = process.env.CUSTOMER_DATABASE_URL;
  if (!url) throw new Error("CUSTOMER_DATABASE_URL is not set");
  const u = new URL(url);
  u.searchParams.delete("sslmode"); // pg lets URL sslmode override the ssl option below
  const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
  // Hosted Supabase Postgres: encrypted but cert not pinned (lab fixture; matches the Breaker repo setup).
  pool = new Pool({ connectionString: u.toString(), ssl: local ? undefined : { rejectUnauthorized: false } });
  pool.on("error", () => {}); // idle connection drops must not crash the dev server
  return pool;
}

// DELIBERATELY UNSAFE: runs arbitrary SQL straight on the Customer DB.
// This is the "Breaker OFF" before-state of the demo. Server-only; never reachable from the browser.
export async function runSqlDirect(sql: string): Promise<SqlResult> {
  try {
    const res: QueryResult | QueryResult[] = await getPool().query(sql);
    const r = Array.isArray(res) ? res[res.length - 1] : res; // multi-statement SQL returns an array
    return { ok: true, rowCount: r?.rowCount ?? null, rows: r?.rows ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
