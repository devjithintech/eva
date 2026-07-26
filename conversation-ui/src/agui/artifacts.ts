/**
 * Artifact payload contract — mirrors `server/src/data/types.ts`. These are the
 * shapes carried in AG-UI TOOL_CALL args; the canvas renders each `kind` from
 * the matching payload. Keep in sync with the server.
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

/** One plotted candidate on the opportunity scatter (CAGR × drawdown). */
export interface OppPoint {
  name: string;
  cagr: number;
  dd: number;
  stage: "scored" | "shortlisted" | "interview";
}

export interface MatrixRow {
  name: string;
  /** Metrics are nullable — not every candidate reports every figure. */
  cagr: number | null;
  sharpe: number | null;
  alpha: number | null;
  dd: number | null;
  you?: boolean;
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

export interface AnalystFlag {
  title: string;
  detail: string;
  severity: "high" | "medium" | "low";
}

export interface ScorecardCriterion {
  label: string;
  score: number;
  tone: "green" | "violet" | "amber";
}

/** Dynamic analytical view blocks — mirrors the server contract. */
export type AnalysisBlock =
  | { type: "verdict"; winner: string; reason: string; tone: "green" | "violet" | "amber" }
  | { type: "statTiles"; tiles: { label: string; value: string; sub?: string }[] }
  | { type: "metricTable"; columns: string[]; rows: { cells: string[]; highlight?: boolean }[] }
  | { type: "barChart"; label: string; bars: { label: string; value: number; display: string; highlight?: boolean }[] }
  | { type: "callout"; text: string };

export type ArtifactPayload =
  | { kind: "opportunity_map"; title: string; funnel: { scored: number; shortlisted: number; interview: number }; pool: { candidates: number; funds: number }; points: OppPoint[] }
  | { kind: "candidate_pool"; title: string; rows: MatrixRow[] }
  | {
      kind: "comparison";
      title: string;
      columns: string[];
      sections: ComparisonSection[];
    }
  | {
      kind: "returns";
      title: string;
      years: number;
      cagr: string;
      cumulative: string;
      bestYear: string;
      worstYear: string;
      positiveMonths: string;
      fundCurve: number[];
      benchmarkCurve: number[];
      benchmarkLabel: string;
      calendar: { year: string; value: number }[];
    }
  | { kind: "benchmark_correlation"; title: string; funds: string[]; matrix: (number | null)[][] }
  | { kind: "characteristics"; candidate: Candidate }
  | {
      kind: "analyst_flags";
      title: string;
      counts: { high: number; medium: number; low: number };
      flags: AnalystFlag[];
      total: number;
    }
  | {
      kind: "scorecard";
      title: string;
      overall: number;
      criteria: ScorecardCriterion[];
      recommendation: string;
      recommendationDetail: string;
    }
  | { kind: "analysis"; title: string; subtitle?: string; summary?: string; narrative?: string; blocks: AnalysisBlock[] }
  | {
      kind: "document";
      title?: string;
      intro?: string;
      keyPoints?: string[];
      callout?: { tone: "tip" | "warning" | "important"; text: string };
      body?: string;
      sections?: { title: string; body: string }[];
      followups?: string[];
    };

/** Friendly labels for the living-canvas rail / tabs, keyed by artifact kind. */
export const ARTIFACT_LABELS: Record<ArtifactKind, string> = {
  opportunity_map: "Opportunity map",
  candidate_pool: "Candidate pool",
  comparison: "Comparison",
  returns: "5Y returns",
  benchmark_correlation: "Peer correlation matrix",
  characteristics: "Characteristics",
  analyst_flags: "Analyst flags",
  scorecard: "Scorecard",
  analysis: "Analysis",
  document: "Answer",
};
