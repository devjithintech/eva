/**
 * BFF response types — mirror `server/src/bff/types.ts` and the payload shapes
 * returned by `server/src/data/candidates.ts`'s builders. Backed by
 * `server/data/data.json`. Keep in sync with the server.
 */

/** Lightweight candidate entry for lists. */
export interface CandidateSummary {
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

/** Full candidate profile — loose; ~20 analysis sections whose shapes evolve.
 *  Sections come back as either a single object or an array of scoped objects
 *  (one per fund_ref/scope) — see `firstSection()` in `api/hooks.ts`. */
export interface CandidateRecord {
  id: string;
  name: string;
  pm_id?: string;
  subject_fund?: {
    fund_name?: string;
    sibling_funds?: unknown[];
    [key: string]: unknown;
  };
  analyst_flags?: string[];
  [key: string]: unknown;
}

/** One row of the candidate comparison matrix. Metrics are nullable — not
 *  every candidate reports every figure. */
export interface MatrixRow {
  name: string;
  cagr: number | null;
  sharpe: number | null;
  alpha: number | null;
  dd: number | null;
  infoRatio: number | null;
  beta: number | null;
  you?: boolean;
}

/** Candidate comparison matrix payload. */
export interface CandidateMatrix {
  title: string;
  rows: MatrixRow[];
}

export type Stage = "analyzed" | "shortlisted" | "interview" | "rejected";

/** Funnel counts + explicitly-set stages (in-memory on the server; default
 *  stage for everyone not listed is "analyzed"). */
export interface PipelineState {
  analyzed: number;
  shortlisted: number;
  interview: number;
  stages: Record<string, Stage>;
}

export interface ScorecardCriterion {
  label: string;
  score: number;
  tone: "green" | "violet" | "amber";
}

/** Committee scorecard (1–5 per criterion), derived from data.json fields. */
export interface ScorecardPayload {
  title: string;
  overall: number;
  criteria: ScorecardCriterion[];
  recommendation: string;
  recommendationDetail: string;
}

export interface AnalystFlag {
  title: string;
  detail: string;
  severity: "high" | "medium" | "low";
}

export interface AnalystFlagsPayload {
  title: string;
  counts: { high: number; medium: number; low: number };
  flags: AnalystFlag[];
  total: number;
}

/** Trailing-returns view: annual bar chart + growth-of-100 curve (both
 *  0..1-normalized), derived from real annual_returns. */
export interface ReturnsPayload {
  title: string;
  years: number;
  cagr: string;
  cumulative: string;
  bestYear: string;
  worstYear: string;
  positiveMonths: string;
  benchmarkLabel: string;
  fundCurve: number[];
  benchmarkCurve: number[];
  calendar: { year: string; value: number }[];
}

export interface ComparisonRow {
  label: string;
  /** Display strings aligned to `columns` by index; "—" when unreported. */
  values: string[];
}

export interface ComparisonSection {
  title: string;
  rows: ComparisonRow[];
}

export interface ComparisonPayload {
  title: string;
  columns: string[];
  sections: ComparisonSection[];
}

/**
 * Renderer `params` — sent as a JSON-encoded `params` query string on
 * `GET /renderers/:label`, per FRONTEND_API_GUIDE_v6.pdf's `RunParams`
 * contract. All fields optional; used by the Peer Fit & Sim renderers
 * (D1-5/6/6b/7/7b/8/9/9b).
 */
export interface RunParams {
  peer_group?: string;
  peer_set?: string[];
  /** Month-end dates ("2022-11-30") — monthly return series are dated at month end. */
  window_start?: string;
  window_end?: string;
  benchmark?: string;
  risk_free?: string;
  /** Return-series providers feeding the Peer-Fit stats (e.g. ["lh_internal", "bloomberg"]). */
  datasets?: string[];
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

/** One node of the fund hierarchy (`GET /fund-hierarchy`, renderers service). */
export interface FundHierarchyRow {
  level: number;
  fund_id: number;
  name: string;
  fund: string;
  map_number: string | null;
  parent_fund_id: number | null;
  parent_fund: string | null;
  parent_map_number: string | null;
  is_active: boolean;
}

export interface FundHierarchyResponse {
  as_of: string;
  recent_days: number;
  count: number;
  active_count: number;
  rows: FundHierarchyRow[];
}

/** Universal renderer response envelope (per the Frontend API Guide). */
export interface RendererEnvelope<TRow = Record<string, unknown>> {
  schema: { name: string; type: string }[];
  rows: TRow[];
  attrs?: Record<string, unknown>;
  identity: Identity;
}

/** A pre-built peer group (`GET /peer_groups`). */
export interface PeerGroup {
  name: string;
  count: number;
  source: string;
}

/** A candidate-peer roster entry (`GET /peer_candidates`) — a valid
 *  `candidate_peer_set` member for the Peer Fit & Sim renderers. */
export interface CandPeer {
  key: string;
  short: string;
  fund: string;
  cand: string;
  id: string;
  /** Fund key on the renderers service (e.g. "C-2026-019::vega") — what
   *  `candidate_peer_set` must carry. */
  analytics_fund_id?: string;
  ret: number;
  vol: number;
  dd: number;
  corr: number;
}

/** One plotted candidate on the opportunity scatter (CAGR × drawdown). */
export interface OppPoint {
  name: string;
  cagr: number;
  dd: number;
  alpha: number | null;
  stage: "analyzed" | "shortlisted" | "interview";
}

export interface OpportunityMapData {
  title: string;
  funnel: { analyzed: number; shortlisted: number; interview: number };
  pool: { candidates: number; funds: number };
  points: OppPoint[];
}
