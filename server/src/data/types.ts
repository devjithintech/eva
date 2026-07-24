/**
 * Domain + artifact-payload contracts.
 *
 * These interfaces are the wire contract between the agent (server) and the
 * generative-UI renderer (web). The agent emits AG-UI TOOL_CALL events whose
 * arguments match one of the `*Payload` shapes below; the web app renders the
 * matching React artifact purely from that payload. The web package mirrors
 * these types in `web/src/agui/artifacts.ts` — keep the two in sync.
 */

export type ArtifactKind =
  | "opportunity_map"
  | "candidate_pool"
  | "comparison"
  | "returns"
  | "benchmark_correlation"
  | "characteristics"
  | "analyst_flags"
  | "scorecard"
  | "analysis"
  | "document";

export interface Candidate {
  id: string;
  name: string;
  manager: string;
  location: string;
  teamSize: number;
  aum: string;
  strategyFamily: string;
  netExposure: string;
  benchmark: string;
  currency: string;
  inception: string;
  vehicle: string;
  blurb: string;
  styleTags: { label: string; primary: boolean }[];
}

/* ── Artifact payloads ─────────────────────────────────────────────────── */

export interface MatrixRow {
  name: string;
  /** Metrics are nullable — not every candidate reports every figure. */
  cagr: number | null;
  sharpe: number | null;
  alpha: number | null;
  dd: number | null;
  you?: boolean;
}
export interface CandidatePoolPayload {
  title: string;
  rows: MatrixRow[];
}

/** One metric row in the comparison matrix — one `values` entry per column. */
export interface ComparisonRow {
  label: string;
  /** Display strings aligned to `columns` by index; "—" when unreported. */
  values: string[];
}
/** A labelled group of rows (PROFILE, PERFORMANCE, RISK, …). */
export interface ComparisonSection {
  title: string;
  rows: ComparisonRow[];
}
export interface ComparisonPayload {
  title: string;
  /** Candidate/fund names, one per column, left→right. */
  columns: string[];
  sections: ComparisonSection[];
}

export interface ReturnsPayload {
  title: string;
  /** Trailing window actually shown (years). */
  years: number;
  cagr: string;
  cumulative: string;
  bestYear: string;
  worstYear: string;
  positiveMonths: string;
  /** growth-of-100 sampled points for fund + benchmark, 0..1 normalized */
  fundCurve: number[];
  benchmarkCurve: number[];
  benchmarkLabel: string;
  calendar: { year: string; value: number }[];
}

export interface CorrelationPayload {
  title: string;
  funds: string[];
  /** square matrix; null on the diagonal */
  matrix: (number | null)[][];
}

export interface CharacteristicsPayload {
  candidate: Candidate;
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

export interface ScorecardCriterion {
  label: string;
  score: number;
  tone: "green" | "violet" | "amber";
}
export interface ScorecardPayload {
  title: string;
  overall: number;
  criteria: ScorecardCriterion[];
  recommendation: string;
  recommendationDetail: string;
}

/** One plotted candidate on the opportunity scatter (CAGR × drawdown). */
export interface OppPoint {
  name: string;
  cagr: number;
  dd: number;
  stage: "scored" | "shortlisted" | "interview";
}

export interface OpportunityMapPayload {
  title: string;
  funnel: { scored: number; shortlisted: number; interview: number };
  pool: { candidates: number; funds: number };
  points: OppPoint[];
}

/**
 * Dynamic analytical view. The agent maps an open-ended question to a structured
 * intent (entities + metrics + mode); the server computes the answer and lays it
 * out as a sequence of primitive blocks the generic renderer draws. This is the
 * "generative UI" path for questions the fixed views don't cover — numbers stay
 * server-owned (blocks carry only computed display strings).
 */
export type AnalysisBlock =
  | { type: "verdict"; winner: string; reason: string; tone: "green" | "violet" | "amber" }
  | { type: "statTiles"; tiles: { label: string; value: string; sub?: string }[] }
  | { type: "metricTable"; columns: string[]; rows: { cells: string[]; highlight?: boolean }[] }
  | { type: "barChart"; label: string; bars: { label: string; value: number; display: string; highlight?: boolean }[] }
  | { type: "callout"; text: string };

export interface AnalysisPayload {
  title: string;
  subtitle?: string;
  /** One-line prose overview shown above the blocks, on the same card. */
  summary?: string;
  /** Full reasoned narrative (markdown), rendered above the component in-card. */
  narrative?: string;
  blocks: AnalysisBlock[];
}

/**
 * Generic "answer document" — the fallback view when no specific artifact fits.
 * The model composes a structured written answer; the renderer lays it out as
 * title → intro → key points → callout → body → collapsible sections → follow-ups.
 */
export interface DocumentSection {
  title: string;
  /** Markdown body. */
  body: string;
}
export interface DocumentPayload {
  title?: string;
  intro?: string;
  keyPoints?: string[];
  callout?: { tone: "tip" | "warning" | "important"; text: string };
  /** Optional markdown block (table / code / extra detail) when relevant. */
  body?: string;
  /** Collapsible groups, e.g. Sources, Supporting details, Related resources. */
  sections?: DocumentSection[];
  /** Suggested follow-up prompts, rendered as clickable chips. */
  followups?: string[];
}

/** Discriminated union the renderer switches on. */
export type ArtifactPayload =
  | ({ kind: "opportunity_map" } & OpportunityMapPayload)
  | ({ kind: "candidate_pool" } & CandidatePoolPayload)
  | ({ kind: "comparison" } & ComparisonPayload)
  | ({ kind: "returns" } & ReturnsPayload)
  | ({ kind: "benchmark_correlation" } & CorrelationPayload)
  | ({ kind: "characteristics" } & CharacteristicsPayload)
  | ({ kind: "analyst_flags" } & AnalystFlagsPayload)
  | ({ kind: "scorecard" } & ScorecardPayload)
  | ({ kind: "analysis" } & AnalysisPayload)
  | ({ kind: "document" } & DocumentPayload);
