/**
 * SQL Server connection settings, read from the environment.
 *
 * Self-contained: it loads .env the same way src/config.ts does (server/.env
 * first, then the repo-root .env) so the connector works whether it's driven
 * from the running server or from the standalone test script. No existing
 * config is modified.
 *
 * The `authMode` value is the switch that selects which connector file runs:
 *   SQLSERVER_AUTH=sql      -> src/db/sqlAuth.ts       (SQL login, pure JS)
 *   SQLSERVER_AUTH=windows  -> src/db/windowsAuth.ts   (Windows/integrated)
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../.env") });
dotenv.config({ path: path.resolve(here, "../../../.env") });

export type SqlAuthMode = "sql" | "windows";

export interface SqlServerSettings {
  authMode: SqlAuthMode;
  host: string;
  /** Ignored when `instance` is set (a named instance resolves its own port). */
  port: number;
  /** Named instance, e.g. "SQLEXPRESS". Empty string means the default instance. */
  instance: string;
  database: string;
  /** SQL-login only. */
  user: string;
  /** SQL-login only. */
  password: string;
  encrypt: boolean;
  trustServerCertificate: boolean;
  connectTimeoutMs: number;
}

const bool = (v: string | undefined, fallback: boolean): boolean =>
  v === undefined ? fallback : /^(1|true|yes|on)$/i.test(v.trim());

/** Master switch for DB-backed conversation persistence (default on). Set
 *  PERSIST_CONVERSATIONS=false to run fully stateless (client-driven history). */
export const persistConversations = bool(process.env.PERSIST_CONVERSATIONS, true);

export function loadSqlSettings(): SqlServerSettings {
  const authRaw = (process.env.SQLSERVER_AUTH ?? "sql").trim().toLowerCase();
  const authMode: SqlAuthMode = authRaw === "windows" ? "windows" : "sql";

  return {
    authMode,
    host: process.env.SQLSERVER_HOST ?? "localhost",
    port: Number(process.env.SQLSERVER_PORT ?? 1433),
    instance: (process.env.SQLSERVER_INSTANCE ?? "").trim(),
    database: process.env.SQLSERVER_DATABASE ?? "master",
    user: process.env.SQLSERVER_USER ?? "",
    password: process.env.SQLSERVER_PASSWORD ?? "",
    // Local dev SQL Server usually has a self-signed cert, so trust it and keep
    // the connection encrypted. Override both via env for a real deployment.
    encrypt: bool(process.env.SQLSERVER_ENCRYPT, true),
    trustServerCertificate: bool(process.env.SQLSERVER_TRUST_CERT, true),
    connectTimeoutMs: Number(process.env.SQLSERVER_CONNECT_TIMEOUT_MS ?? 15000),
  };
}
