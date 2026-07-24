/**
 * Windows / integrated-auth connector (SQLSERVER_AUTH=windows).
 *
 * Uses the native `msnodesqlv8` driver, which authenticates with the current
 * Windows account (trusted connection) — no username/password. It is loaded
 * lazily via a dynamic import so SQL-login users never need to install it.
 *
 * Prerequisites (Windows only):
 *   1. `npm install msnodesqlv8` in the server package.
 *   2. Microsoft ODBC Driver for SQL Server installed on the machine.
 */
import type { ConnectionPool } from "mssql";
import type { SqlServerSettings } from "./sqlConfig.js";

export async function connectWindowsAuth(s: SqlServerSettings): Promise<ConnectionPool> {
  // Non-literal specifier so TypeScript treats it as optional (typed `any`) and
  // the module is only required when Windows auth is actually selected.
  const moduleName = "mssql/msnodesqlv8.js";
  let driver: any;
  try {
    driver = (await import(moduleName)).default;
  } catch {
    throw new Error(
      "Windows auth needs the native driver. Run `npm install msnodesqlv8` in server/ " +
        "and install the Microsoft ODBC Driver for SQL Server.",
    );
  }

  // Named instance goes as "HOST\\INSTANCE"; otherwise pass the port.
  const server = s.instance ? `${s.host}\\${s.instance}` : s.host;

  const pool: ConnectionPool = new driver.ConnectionPool({
    server,
    ...(s.instance ? {} : { port: s.port }),
    database: s.database,
    options: {
      trustedConnection: true,
      trustServerCertificate: s.trustServerCertificate,
    },
    connectionTimeout: s.connectTimeoutMs,
  });

  await pool.connect();
  return pool;
}
