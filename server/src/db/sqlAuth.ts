/**
 * SQL-login connector (SQLSERVER_AUTH=sql).
 *
 * Uses the pure-JS tedious driver bundled with `mssql` — no native build step,
 * works on any platform. Authenticates with SQLSERVER_USER / SQLSERVER_PASSWORD.
 */
import sql from "mssql";
import type { SqlServerSettings } from "./sqlConfig.js";

export async function connectSqlAuth(s: SqlServerSettings): Promise<sql.ConnectionPool> {
  if (!s.user || !s.password) {
    throw new Error(
      "SQL-login auth needs SQLSERVER_USER and SQLSERVER_PASSWORD (set SQLSERVER_AUTH=windows for Windows auth).",
    );
  }

  const pool = new sql.ConnectionPool({
    server: s.host,
    // Port and a named instance are mutually exclusive in tedious: with an
    // instance, SQL Browser resolves the port, so leave port unset.
    ...(s.instance ? {} : { port: s.port }),
    database: s.database,
    user: s.user,
    password: s.password,
    options: {
      ...(s.instance ? { instanceName: s.instance } : {}),
      encrypt: s.encrypt,
      trustServerCertificate: s.trustServerCertificate,
    },
    connectionTimeout: s.connectTimeoutMs,
  });

  await pool.connect();
  return pool;
}
