/**
 * Standalone connectivity check — run it directly, no server needed:
 *
 *   cd server
 *   npx tsx src/db/testConnection.ts
 *
 * Configure via server/.env (or the repo-root .env):
 *
 *   # --- pick the auth mode (the switch) ---
 *   SQLSERVER_AUTH=sql            # or "windows"
 *
 *   # --- where ---
 *   SQLSERVER_HOST=localhost
 *   SQLSERVER_PORT=1433
 *   SQLSERVER_INSTANCE=           # e.g. SQLEXPRESS (leave blank for default instance)
 *   SQLSERVER_DATABASE=master
 *
 *   # --- SQL-login only ---
 *   SQLSERVER_USER=sa
 *   SQLSERVER_PASSWORD=your-password
 *
 *   # --- optional TLS knobs (default: encrypt + trust self-signed) ---
 *   SQLSERVER_ENCRYPT=true
 *   SQLSERVER_TRUST_CERT=true
 */
import { closePool, testConnection } from "./sqlServer.js";

const result = await testConnection();

if (result.ok) {
  console.log("✅ SQL Server connection OK");
  console.log(`   auth:     ${result.authMode}`);
  console.log(`   target:   ${result.target}`);
  console.log(`   database: ${result.databaseName}`);
  console.log(`   version:  ${result.serverVersion}`);
} else {
  console.error("❌ SQL Server connection FAILED");
  console.error(`   auth:   ${result.authMode}`);
  console.error(`   target: ${result.target}`);
  console.error(`   error:  ${result.error}`);
}

await closePool();
process.exit(result.ok ? 0 : 1);
