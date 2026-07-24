/**
 * SQL Server connector — the switch.
 *
 * Reads the settings, dispatches to the SQL-login or Windows-auth file based on
 * SQLSERVER_AUTH, and hands back a single shared connection pool. `getPool()`
 * is memoized so the whole app reuses one pool; `testConnection()` verifies the
 * link with a trivial round-trip; `closePool()` tears it down.
 */
import type { ConnectionPool } from "mssql";
import { loadSqlSettings, type SqlServerSettings } from "./sqlConfig.js";
import { connectSqlAuth } from "./sqlAuth.js";
import { connectWindowsAuth } from "./windowsAuth.js";

let poolPromise: Promise<ConnectionPool> | null = null;

async function createPool(s: SqlServerSettings): Promise<ConnectionPool> {
  return s.authMode === "windows" ? connectWindowsAuth(s) : connectSqlAuth(s);
}

/** The shared, lazily-opened connection pool. */
export function getPool(): Promise<ConnectionPool> {
  if (!poolPromise) {
    const settings = loadSqlSettings();
    poolPromise = createPool(settings).catch((err) => {
      // Reset so a later call can retry instead of getting a stuck rejection.
      poolPromise = null;
      throw err;
    });
  }
  return poolPromise;
}

export interface ConnectionTestResult {
  ok: boolean;
  authMode: SqlServerSettings["authMode"];
  target: string;
  serverVersion?: string;
  databaseName?: string;
  error?: string;
}

/** Open the pool and run a trivial query to prove the connection works. */
export async function testConnection(): Promise<ConnectionTestResult> {
  const s = loadSqlSettings();
  const target = `${s.host}${s.instance ? `\\${s.instance}` : `,${s.port}`}/${s.database}`;
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .query<{ version: string; db: string }>(
        "SELECT @@VERSION AS version, DB_NAME() AS db;",
      );
    const row = result.recordset[0];
    return {
      ok: true,
      authMode: s.authMode,
      target,
      serverVersion: row?.version?.split("\n")[0]?.trim(),
      databaseName: row?.db,
    };
  } catch (err) {
    return {
      ok: false,
      authMode: s.authMode,
      target,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Close the shared pool (e.g. on shutdown or after the test script). */
export async function closePool(): Promise<void> {
  if (!poolPromise) return;
  const pool = await poolPromise.catch(() => null);
  poolPromise = null;
  if (pool) await pool.close();
}
