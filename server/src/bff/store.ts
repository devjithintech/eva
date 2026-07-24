import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Reads the BFF's JSON data files. Resolves `server/data/` from this module's
 * location so it works both in dev (`src/bff`) and prod (`dist/bff`) — the data
 * folder is NOT compiled, it's read at runtime, so editing JSON needs no rebuild.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.resolve(here, "../../data");

/** Thrown when a requested data file doesn't exist — routes map this to 404. */
export class DataNotFound extends Error {}

/** Load and parse `<name>.json` from the data folder. `name` is a bare key
 *  (no slashes) — guards against path traversal. Read fresh each call so edits
 *  to the JSON show up without a server restart. */
export async function readJson<T>(name: string): Promise<T> {
  if (!/^[a-z0-9_-]+$/i.test(name)) throw new DataNotFound(`Invalid data key: ${name}`);
  const file = path.join(DATA_DIR, `${name}.json`);
  try {
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new DataNotFound(`No data file: ${name}.json`);
    }
    throw err;
  }
}
