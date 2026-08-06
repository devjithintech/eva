/**
 * Candidate dataset, served from SQL Server instead of `server/data/data.json`.
 *
 * `dbo.Candidates.profile_json` holds each candidate's full lossless profile
 * (loaded by `server/db/load_candidate_analytics.py`), keyed by the same
 * display name data.json used as its map key — so the dataset reconstructed
 * here is shape-identical to the old file and every builder in
 * `candidates.ts` works unchanged. The normalized analytics tables
 * (dbo.Funds, dbo.FundReturnSkill, ...) exist for direct SQL querying; this
 * module is the app's read path.
 *
 * The builders are synchronous, so the dataset is held in an in-memory cache:
 * `primeDataset()` fills it once at startup (awaited before the server
 * listens), and `getDataset()` returns it synchronously, kicking off a
 * background refresh when it's older than TTL_MS — preserving data.json's
 * "edits show up without a restart" behaviour, now for DB rows. If SQL Server
 * is unreachable, the file remains as a read-only fallback so dev setups
 * without the DB keep working.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPool } from "../db/sqlServer.js";

/** Same shape as the raw `data.json` file: count + candidates keyed by name. */
export interface RawDataset {
  count: number;
  candidates: Record<string, Record<string, unknown>>;
}

/** Fallback candidates, first match wins (the file was renamed data_new.json
 *  once the DB became the primary source). */
const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../data");
const DATA_FILES = ["data.json", "data_new.json"].map((f) => path.join(DATA_DIR, f));
const TTL_MS = 30_000;

let cache: RawDataset | null = null;
let cacheSource: "sqlserver" | "file" = "file";
let fetchedAt = 0;
let refreshing: Promise<void> | null = null;

async function fetchFromDb(): Promise<RawDataset> {
  const pool = await getPool();
  const result = await pool
    .request()
    .query<{ name: string; profile_json: string }>("SELECT name, profile_json FROM dbo.Candidates");
  const candidates: RawDataset["candidates"] = {};
  for (const row of result.recordset) {
    try {
      candidates[row.name] = JSON.parse(row.profile_json) as Record<string, unknown>;
    } catch {
      console.warn(`sqlDataset: unparseable profile_json for '${row.name}' — row skipped`);
    }
  }
  return { count: Object.keys(candidates).length, candidates };
}

function readFileFallback(): RawDataset {
  for (const file of DATA_FILES) {
    try {
      return JSON.parse(readFileSync(file, "utf8")) as RawDataset;
    } catch {
      // try the next candidate file
    }
  }
  return { count: 0, candidates: {} };
}

/** Re-pull from the DB into the cache. Concurrent calls share one round-trip. */
export function refreshDataset(): Promise<void> {
  refreshing ??= fetchFromDb()
    .then((ds) => {
      cache = ds;
      cacheSource = "sqlserver";
      fetchedAt = Date.now();
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/**
 * Load the dataset once at startup. Falls back to data.json (with a console
 * warning) when the DB is unreachable, so the BFF still serves data.
 */
export async function primeDataset(): Promise<{ source: typeof cacheSource; count: number }> {
  try {
    await refreshDataset();
  } catch (err) {
    cache = readFileFallback();
    cacheSource = "file";
    fetchedAt = Date.now();
    console.warn(
      `sqlDataset: SQL Server unavailable (${err instanceof Error ? err.message : String(err)}) — serving data.json fallback`,
    );
  }
  return { source: cacheSource, count: cache?.count ?? 0 };
}

/**
 * The current dataset, synchronously. Stale caches trigger a background DB
 * refresh; a cold cache (prime not run/failed) serves the file fallback while
 * one loads.
 */
export function getDataset(): RawDataset {
  if (!cache) {
    cache = readFileFallback();
    fetchedAt = Date.now();
    void refreshDataset().catch(() => {});
  } else if (Date.now() - fetchedAt > TTL_MS) {
    void refreshDataset().catch(() => {});
  }
  return cache;
}
