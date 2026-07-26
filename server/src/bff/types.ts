/**
 * BFF response contracts — the shapes the web app fetches from `/api/*`.
 * Backed by `server/data/data.json`, a map of rich candidate-intelligence
 * records keyed by fund name. The web package mirrors these in
 * `web/src/api/types.ts` — keep them in sync.
 */

/** One candidate's full intelligence record. Deliberately loose — the record
 *  has ~20 analysis sections whose shapes evolve; only the fields the BFF reads
 *  are typed. */
export interface CandidateRecord {
  pm_id?: string;
  subject_fund?: { fund_name?: string; [key: string]: unknown };
  analyst_flags?: unknown[];
  [key: string]: unknown;
}

/** The raw `data.json` file: a count + candidates keyed by fund name. */
export interface Dataset {
  count: number;
  candidates: Record<string, CandidateRecord>;
}

/** Lightweight candidate entry for lists (no heavy analysis sections). */
export interface CandidateSummary {
  /** URL-safe slug of the fund name, e.g. "meadow-park". */
  id: string;
  name: string;
  pmId: string | null;
  fundName: string | null;
  flagCount: number;
  /** Base currency code (e.g. "USD"), or null when unreported. Filter facet. */
  currency: string | null;
  /** Display-cased strategy family (e.g. "Long/short equity"). Filter facet. */
  strategy: string;
  /** Raw geographic-focus tags (e.g. ["North America", "Europe"]). Filter facet. */
  regions: string[];
}

/** Pool overview: total count + candidate summaries. */
export interface PoolData {
  count: number;
  candidates: CandidateSummary[];
}
