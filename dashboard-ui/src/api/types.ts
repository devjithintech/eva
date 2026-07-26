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
  subject_fund?: { fund_name?: string; sibling_funds?: unknown[]; [key: string]: unknown };
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
  you?: boolean;
}

/** Candidate comparison matrix payload. */
export interface CandidateMatrix {
  title: string;
  rows: MatrixRow[];
}

export type Stage = "scored" | "shortlisted" | "interview" | "rejected";

/** Funnel counts + explicitly-set stages (in-memory on the server; default
 *  stage for everyone not listed is "scored"). */
export interface PipelineState {
  scored: number;
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

/** One plotted candidate on the opportunity scatter (CAGR × drawdown). */
export interface OppPoint {
  name: string;
  cagr: number;
  dd: number;
  stage: "scored" | "shortlisted" | "interview";
}

export interface OpportunityMapData {
  title: string;
  funnel: { scored: number; shortlisted: number; interview: number };
  pool: { candidates: number; funds: number };
  points: OppPoint[];
}
