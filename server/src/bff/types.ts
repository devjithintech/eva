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

/**
 * Renderer `params` — parsed from the `params` JSON-string query param on
 * `GET /renderers/:label`, per FRONTEND_API_GUIDE_v6.pdf's `RunParams`
 * contract. All fields optional; used by the Peer Fit & Sim renderers
 * (D1-5/6/6b/7/7b/8/9/9b) — see `server/src/data/peerfit.ts`.
 */
export interface RunParams {
  peer_group?: string;
  peer_set?: string[];
  window_start?: string;
  window_end?: string;
  benchmark?: string;
  risk_free?: string;
  allocation_pct?: number;
  gross_exposure?: number;
  net_exposure?: number;
  kelly_multiplier?: number;
  regime_selector?: string;
  /** Other candidate-fund keys/names to compare the subject against. */
  candidate_peer_set?: string[];
  /** false = drop the established peer universe, candidate cohort only. */
  include_peer_universe?: boolean;
}

/** Who/what a renderer result describes. */
export interface Identity {
  scope: "Candidate" | "Fund" | "Book";
  fund_id: string | null;
  fund_name: string | null;
  candidate_id: string | null;
  pm_id: string | null;
}

/** Universal renderer response envelope (per the Frontend API Guide). */
export interface RendererEnvelope<TRow = Record<string, unknown>> {
  schema: { name: string; type: string }[];
  rows: TRow[];
  attrs?: Record<string, unknown>;
  identity: Identity;
}
