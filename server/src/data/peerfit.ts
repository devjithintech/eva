/**
 * Peer Fit & Sim — mock dataset + renderer builders (D1-5/6/6b/7/7b/8/9/9b).
 *
 * `data.json` has no pairwise fund-to-fund return series (see
 * `buildPeerCorrelation`'s comment in `candidates.ts`), so these numbers stay
 * illustrative — ported from what was previously
 * `dashboard-ui/src/components/peerfit/fixtures.ts` (client-side only, no
 * network calls). What changes here is the CONTRACT: every builder returns
 * the `{schema, rows, attrs, identity}` envelope + accepts the `RunParams`
 * shape described in FRONTEND_API_GUIDE_v6.pdf, so the frontend fetches this
 * data over HTTP instead of importing a fixtures module directly.
 */
import { resolveCandidateRecord, sec } from "./candidates.js";
import type { Identity, RendererEnvelope, RunParams } from "../bff/types.js";

/* ── Mock dataset (ported verbatim from fixtures.ts) ────────────────────── */

export const PEER_FUNDS = [
  "LH — Qianyan 500 MN",
  "LH — RL Onshore MN",
  "LH — Minghong Jupiter China",
  "LH — Mingshi Maxima",
  "LH — Minghong Multistrategy",
  "LH — Alphachi MN",
  "LH — Wanyan MN — SXV601",
  "LH — WizardQuant Onshore MN",
  "LH — Wanyan MN — STA785",
  "LH — Century Frontier Onshore",
  "LH — Minghong 300 MN",
  "LH — Maoyuan (MN)",
  "LH — Goku Onshore MN",
  "LH — Jasper onshore MN",
  "LH — Tianyan MN",
  "LH — Jinde MN",
  "LH — Pandtong CSI1000 MN",
  "LH — Pandtong CSI500 MN",
];

export interface CandPeer {
  key: string;
  short: string;
  fund: string;
  cand: string;
  ret: number;
  vol: number;
  dd: number;
  corr: number;
}

export const CAND_PEERS: CandPeer[] = [
  { key: "reyes", short: "Reyes", fund: "Vega Market Neutral", cand: "Sofia Reyes", ret: 9.2, vol: 8.8, dd: -7.8, corr: 0.44 },
  { key: "chen", short: "Chen", fund: "Aris Quant L/S", cand: "Marcus Chen", ret: 10.6, vol: 8.9, dd: -7.1, corr: 0.61 },
  { key: "okafor", short: "Okafor", fund: "Meridian Stat Arb", cand: "David Okafor", ret: 8.1, vol: 8.5, dd: -8.4, corr: 0.58 },
];

/** Deterministic pseudo-random correlation, seeded by row/col index — mirrors
 *  the old client-side `_seed()` generator so responses stay stable. */
function seed(i: number, j: number): number {
  const x = Math.sin((i + 1) * 9.7 + (j + 1) * 4.3) * 10000;
  return x - Math.floor(x);
}

/** Build a symmetric correlation matrix for [subject, ...peers]. Index 0 is
 *  always the subject fund. */
export function buildCorrelationMatrix(names: string[]): number[][] {
  const n = names.length;
  const m: number[][] = names.map((_, i) =>
    names.map((_, j) => {
      if (i === j) return 1;
      const k = Math.max(i, j);
      if (i === 0 || j === 0) {
        if (k <= 6) return Math.round((0.3 + seed(i, j) * 0.4) * 100) / 100;
        if (k <= 10) return Math.round((-0.05 + seed(i, j) * 0.3) * 100) / 100;
        return Math.round((-0.2 + seed(i, j) * 0.3) * 100) / 100;
      }
      return Math.round((0.2 + seed(Math.min(i, j), Math.max(i, j)) * 0.55) * 100) / 100;
    }),
  );
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const v = Math.round(((m[i][j] + m[j][i]) / 2) * 100) / 100;
      m[i][j] = v;
      m[j][i] = v;
    }
  return m;
}

export const PEER_GROUPS: { name: string; count: number; source: string }[] = [
  { name: "China Onshore Quant MN", count: 19, source: "LH internal" },
  { name: "Consumer", count: 9, source: "LH internal" },
  { name: "TMT", count: 18, source: "LH internal" },
  { name: "Biotech", count: 11, source: "LH internal" },
  { name: "Long/Short Equity Fundamental", count: 23, source: "LH internal" },
  { name: "Macro Discretionary", count: 12, source: "LH internal" },
  { name: "CTA Trend", count: 18, source: "LH internal" },
  { name: "Multi-Strategy Tier 1", count: 12, source: "LH internal" },
];

export const SAVED_GROUPS: { name: string; members: string[] } = {
  name: "My Quant L/S Watchlist",
  members: PEER_FUNDS.slice(0, 12),
};

export const POOL_MEMBERS: [string, string, number][] = [
  ["LH-NA Equity L/S", "North America equity L/S", 14.0],
  ["LH-Global Macro", "Discretionary global macro", 11.5],
  ["LH-Systematic Trend", "Managed futures / CTA", 9.8],
  ["LH-EU Equity L/S", "Europe equity L/S", 8.6],
  ["LH-Credit Opps", "Corporate credit", 7.9],
  ["LH-Stat Arb", "Equity statistical arb", 7.0],
  ["LH-Event Driven", "Merger / event", 6.3],
  ["LH-Asia Equity", "Asia ex-Japan equity", 5.6],
];

export const SIM_BASE = { ret: 9.4, vol: 8.2, sharpe: 1.05, dd: -7.6, corr: 0.42, ens: 4.1, var: -1.4 };

/** The subject's own baseline stats fed into `simCompute` — centralized here
 *  so D1-9/D1-9b/D1-5's cohort share one number, instead of three ad hoc
 *  literals scattered across view components (as they were pre-migration). */
export const SUBJECT_BASE = { ret: 12.7, vol: 7.0, sharpe: 1.42, dd: -5.3, corr: 0.53 };

interface SimResult {
  ret: number; vol: number; sharpe: number; dd: number; corr: number; ens: number; var: number;
  maxcorr: number; zone: "div" | "app" | "pen";
  dRet: number; dVol: number; dSharpe: number; dDD: number; dCorr: number; dENS: number; dVaR: number;
}

/** Closed-form blend of the mock base pool with a candidate at a given
 *  allocation % — unchanged math, ported from fixtures.ts. */
function simCompute(alloc: number, candidate: { ret: number; vol: number; dd: number; corr: number }): SimResult {
  const w = alloc / 100;
  const corrCand = Math.min(0.95, Math.max(0, candidate.corr));
  const poolR = SIM_BASE.ret, poolV = SIM_BASE.vol, poolDD = SIM_BASE.dd;
  const newR = (1 - w) * poolR + w * candidate.ret;
  const newV = Math.sqrt((1 - w) ** 2 * poolV ** 2 + w ** 2 * candidate.vol ** 2 + 2 * w * (1 - w) * corrCand * poolV * candidate.vol);
  const baseSharpe = (poolR - 4.5) / poolV;
  const newSharpe = (newR - 4.5) / newV;
  const newDD = poolDD * (1 - w * 0.4) + candidate.dd * w * 1.4;
  const newCorr = SIM_BASE.corr - w * 0.6 * (0.6 / Math.max(candidate.corr, 0.3));
  const newENS = SIM_BASE.ens + w * 16 * (1 - corrCand);
  const newVaR = SIM_BASE.var * (1 + w * 0.05);
  const zone: SimResult["zone"] = corrCand >= 0.6 ? "pen" : corrCand >= 0.5 ? "app" : "div";
  return {
    ret: newR, vol: newV, sharpe: newSharpe, dd: newDD, corr: newCorr, ens: newENS, var: newVaR,
    maxcorr: corrCand, zone,
    dRet: newR - SIM_BASE.ret, dVol: newV - SIM_BASE.vol, dSharpe: newSharpe - baseSharpe,
    dDD: newDD - SIM_BASE.dd, dCorr: newCorr - SIM_BASE.corr, dENS: newENS - SIM_BASE.ens, dVaR: newVaR - SIM_BASE.var,
  };
}

const FIT_ZONE: Record<SimResult["zone"], "diversifying" | "approaching" | "penalty"> = {
  div: "diversifying",
  app: "approaching",
  pen: "penalty",
};

/* ── Shared helpers ───────────────────────────────────────────────────────── */

/** Deterministic mock per-fund figures, descending by Sharpe like the
 *  reference table — index 0 is always the subject. */
function mockRow(name: string, i: number) {
  const sharpe = Math.max(0.3, 1.45 - i * 0.06);
  return {
    fund: name,
    ytd_return: (14.2 - i * 0.5) / 100,
    annualised_return: (12.7 - i * 0.4) / 100,
    annualised_vol: (7.0 + i * 0.15) / 100,
    sharpe: Math.round(sharpe * 100) / 100,
    max_drawdown: (-5.3 - i * 0.4) / 100,
  };
}

function median<T>(sorted: T[]): T {
  return sorted[Math.floor(sorted.length / 2)];
}

/** Resolve the requested candidate + a real `identity` block — `fund_id`/
 *  `fund_name` come from the actual `subject_fund` section in data.json. */
function buildIdentity(candidate: string): { name: string; identity: Identity } {
  const hit = resolveCandidateRecord(candidate);
  const name = hit?.name ?? candidate;
  const sf = hit ? sec(hit.rec, "subject_fund") : {};
  return {
    name,
    identity: {
      scope: "Candidate",
      fund_id: typeof sf.fund_id === "string" ? sf.fund_id : null,
      fund_name: typeof sf.fund_name === "string" ? sf.fund_name : name,
      candidate_id: candidate,
      pm_id: null,
    },
  };
}

/** Resolve `params.candidate_peer_set` (a list of CAND_PEERS keys or fund
 *  names) to actual CandPeer records, de-duplicated, subject excluded. */
function resolveCandidatePeers(params: RunParams): CandPeer[] {
  const keys = params.candidate_peer_set;
  if (!keys || keys.length === 0) return [];
  const wanted = new Set(keys);
  return CAND_PEERS.filter((c) => wanted.has(c.key) || wanted.has(c.fund));
}

function schemaOf(names: string[]): { name: string; type: string }[] {
  return names.map((n) => ({ name: n, type: "float" }));
}

/* ── D1-5 — Snapshot hero + rank cards ───────────────────────────────────── */

export function buildD15(candidate: string, params: RunParams): RendererEnvelope {
  const { name, identity } = buildIdentity(candidate);
  const peers = PEER_FUNDS.map((n, i) => mockRow(n, i + 1));
  const peerSharpes = peers.map((p) => p.sharpe).sort((a, b) => b - a);

  const rows = [
    { metric: "sharpe", label: "Sharpe ratio", value: SUBJECT_BASE.sharpe, unit: "ratio", description: "Excess return per unit of vol.", format: ".2f" },
    { metric: "annualised_return", label: "Annualised return", value: 0.127, unit: "ratio", description: "Annualised total return.", format: ".2%" },
    { metric: "max_drawdown", label: "Max drawdown", value: -0.053, unit: "ratio", description: "Worst peak-to-trough.", format: ".2%" },
    { metric: "annualised_vol", label: "Annualised volatility", value: 0.070, unit: "ratio", description: "Annualised stdev of return.", format: ".2%" },
    { metric: "jensen_alpha", label: "Jensen's alpha", value: 0.184, unit: "ratio", description: "Annualised excess vs benchmark.", format: ".2%" },
    { metric: "beta_benchmark", label: "Benchmark beta", value: 0.38, unit: "ratio", description: `Beta vs ${params.benchmark ?? "S&P 500 TR"}.`, format: ".2f" },
    { metric: "hit_rate_monthly", label: "Monthly hit rate", value: 0.63, unit: "ratio", description: "Share of positive months.", format: ".0%" },
    { metric: "ytd_return", label: "YTD return", value: 0.142, unit: "ratio", description: "Year-to-date return.", format: ".2%" },
    { metric: "dd_vol_ratio", label: "Drawdown / vol ratio", value: 0.76, unit: "ratio", description: "Max DD over annualised vol.", format: ".2f" },
    { metric: "best_month", label: "Best month", value: 0.053, unit: "ratio", description: "Best monthly return.", format: ".2%" },
    { metric: "worst_month", label: "Worst month", value: -0.036, unit: "ratio", description: "Worst monthly return.", format: ".2%" },
    { metric: "avg_fund_correlation", label: "Avg fund correlation", value: SUBJECT_BASE.corr, unit: "ratio", description: "Mean correlation to the proposed pool.", format: ".2f" },
  ];

  const candPeers = resolveCandidatePeers(params);
  const alloc = params.allocation_pct ?? 0.05;
  const cohort = candPeers.length
    ? rankCohort(name, candPeers, alloc * 100)
    : undefined;

  const attrs: Record<string, unknown> = {
    peer_median: { ytd_return: 0.089, annualised_vol: 0.088, sharpe: median(peerSharpes), worst_month: -0.051 },
    fund_percentile: { sharpe: 0.97, best_month: 0.68 },
    sharpe_rank: 1,
    sharpe_rank_n: peers.length + 1,
    max_fund_correlation: SUBJECT_BASE.corr,
    closest_peer: PEER_FUNDS[0],
    ens_impact: 0.80,
    n_months: 36,
    obs_start: params.window_start ?? "2022-11-30",
    obs_end: params.window_end ?? "2025-11-30",
    source: "D1-5 Candidate Snapshot",
  };
  if (cohort) {
    attrs.cohort_rank = cohort.findIndex((c) => c.is_subject) + 1;
    attrs.cohort_rank_n = cohort.length;
    attrs.combined_rank = attrs.cohort_rank;
    attrs.combined_rank_n = peers.length + cohort.length;
    attrs.cohort = cohort;
  }

  return { schema: rowSchema(["metric", "label", "value", "unit", "description", "format"]), rows, attrs, identity };
}

/* ── D1-6 — Peer comparison table ────────────────────────────────────────── */

export function buildD16(candidate: string, params: RunParams): RendererEnvelope {
  const { name, identity } = buildIdentity(candidate);
  const subjectRow = { ...mockRow(name, 0), row_type: "candidate", source: "subject" };
  const peerRows = PEER_FUNDS.map((n, i) => ({ ...mockRow(n, i + 1), row_type: "peer", source: "established" }));
  const sortedBySharpe = [...peerRows].sort((a, b) => a.sharpe - b.sharpe);
  const medianRow = { ...median(sortedBySharpe), fund: "Peer median", row_type: "median", source: "established" };

  const candPeers = resolveCandidatePeers(params);
  const candidatePeerRows = candPeers.map((c) => ({
    fund: c.fund,
    ytd_return: (c.ret + 1.5) / 100,
    annualised_return: c.ret / 100,
    annualised_vol: c.vol / 100,
    sharpe: Math.round((c.ret / c.vol) * 100) / 100,
    max_drawdown: c.dd / 100,
    row_type: "candidate_peer",
    source: "candidate_peer",
  }));

  const rows = [medianRow, subjectRow];
  if (candidatePeerRows.length) {
    const cohortMembers = [subjectRow, ...candidatePeerRows].map((r) => r.sharpe).sort((a, b) => a - b);
    rows.push({ ...median([...candidatePeerRows].sort((a, b) => a.sharpe - b.sharpe)), fund: "Cohort median", sharpe: median(cohortMembers), row_type: "cohort_median", source: "cohort" });
    rows.push(...candidatePeerRows);
  }
  rows.push(...peerRows);

  return {
    schema: rowSchema(["fund", "row_type", "source", "ytd_return", "annualised_return", "annualised_vol", "sharpe", "max_drawdown"]),
    rows,
    attrs: { peer_count: peerRows.length, source: "D1-6 Peer Comparison Table" },
    identity,
  };
}

/* ── D1-6b — Peer KPI strip ───────────────────────────────────────────────── */

export function buildD16b(candidate: string, params: RunParams): RendererEnvelope {
  const { identity } = buildIdentity(candidate);
  const candPeers = resolveCandidatePeers(params);
  const hasCohort = candPeers.length > 0;
  const rows = [
    { metric: "ytd_return", value: 0.142, delta_vs_median: 0.053, percentile: 0.95, delta_vs_cohort_median: hasCohort ? -0.013 : null, cohort_percentile: hasCohort ? 0.0 : null },
    { metric: "annualised_return", value: 0.127, delta_vs_median: 0.041, percentile: 0.92, delta_vs_cohort_median: hasCohort ? 0.018 : null, cohort_percentile: hasCohort ? 1.0 : null },
    { metric: "annualised_vol", value: 0.070, delta_vs_median: -0.018, percentile: 0.18, delta_vs_cohort_median: hasCohort ? -0.004 : null, cohort_percentile: hasCohort ? 0.0 : null },
    { metric: "sharpe", value: SUBJECT_BASE.sharpe, delta_vs_median: 0.64, percentile: 0.97, delta_vs_cohort_median: hasCohort ? 0.21 : null, cohort_percentile: hasCohort ? 1.0 : null },
    { metric: "max_drawdown", value: -0.053, delta_vs_median: 0.041, percentile: 0.96, delta_vs_cohort_median: hasCohort ? 0.012 : null, cohort_percentile: hasCohort ? 1.0 : null },
    { metric: "worst_month", value: -0.036, delta_vs_median: 0.015, percentile: 0.88, delta_vs_cohort_median: hasCohort ? 0.004 : null, cohort_percentile: hasCohort ? 1.0 : null },
    { metric: "best_month", value: 0.053, delta_vs_median: 0.009, percentile: 0.68, delta_vs_cohort_median: hasCohort ? 0.002 : null, cohort_percentile: hasCohort ? 1.0 : null },
  ];
  return {
    schema: rowSchema(["metric", "value", "delta_vs_median", "percentile", "delta_vs_cohort_median", "cohort_percentile"]),
    rows,
    attrs: { source: "D1-6b Peer KPI Strip" },
    identity,
  };
}

/* ── D1-7 — Correlations (quadrants) ─────────────────────────────────────── */

export function buildD17(candidate: string, params: RunParams, source: string = "all"): RendererEnvelope {
  const { name, identity } = buildIdentity(candidate);
  const names = [name, ...PEER_FUNDS];
  const matrix = buildCorrelationMatrix(names);
  const subjectRow = matrix[0];
  const ranked = names.map((n, i) => ({ n, corr: subjectRow[i] })).filter((_, i) => i !== 0);
  const most = [...ranked].sort((a, b) => b.corr - a.corr).slice(0, 8);
  const least = [...ranked].sort((a, b) => a.corr - b.corr).slice(0, 8);

  const rows: Record<string, unknown>[] = [];
  if (source === "all" || source === "lh") {
    for (const r of most) rows.push({ quadrant: "lh_most", name: r.n, correlation: r.corr, beta: Math.round(r.corr * 0.9 * 100) / 100, jensen_alpha: null, source: "LH internal" });
    for (const r of least) rows.push({ quadrant: "lh_least", name: r.n, correlation: r.corr, beta: Math.round(r.corr * 0.9 * 100) / 100, jensen_alpha: null, source: "LH internal" });
  }
  return {
    schema: rowSchema(["quadrant", "name", "correlation", "beta", "jensen_alpha", "source"]),
    rows,
    attrs: { scanned: PEER_FUNDS.length, source: "D1-7 Peer Correlations" },
    identity,
  };
}

/* ── D1-7b — Candidate-peer correlations ─────────────────────────────────── */

export function buildD17b(candidate: string, params: RunParams): RendererEnvelope {
  const { identity } = buildIdentity(candidate);
  const candPeers = resolveCandidatePeers(params);
  const rows = candPeers.map((c) => ({
    fund_id: c.key,
    candidate_id: c.key,
    display_name: c.fund,
    corr_vs_subject: c.corr,
  }));
  return {
    schema: rowSchema(["fund_id", "candidate_id", "display_name", "corr_vs_subject"]),
    rows,
    attrs: { source: "D1-7b Candidate-Peer Correlations" },
    identity,
  };
}

/* ── D1-8 — Peer correlation matrix ──────────────────────────────────────── */

export function buildD18(candidate: string, params: RunParams): RendererEnvelope {
  const { name, identity } = buildIdentity(candidate);
  const includeUniverse = params.include_peer_universe ?? true;
  const candPeers = resolveCandidatePeers(params);
  const established = includeUniverse ? PEER_FUNDS.slice(0, 11) : [];
  const names = [name, ...candPeers.map((c) => c.fund), ...established];
  const matrix = buildCorrelationMatrix(names);

  const rows = names.map((rowName, i) => {
    const row: Record<string, unknown> = { index: rowName };
    names.forEach((colName, j) => (row[colName] = matrix[i][j]));
    return row;
  });

  const sourceByName: Record<string, string> = { [name]: "Candidate" };
  candPeers.forEach((c) => (sourceByName[c.fund] = "Candidate peer"));
  established.forEach((n) => (sourceByName[n] = "LH internal"));

  return {
    schema: [{ name: "index", type: "str" }, ...schemaOf(names)],
    rows,
    attrs: { obs: 750, source_by_name: sourceByName, source: "D1-8 Peer Correlation Matrix" },
    identity,
  };
}

/* ── D1-9 — What-if simulator (subject only) ─────────────────────────────── */

export function buildD19(candidate: string, params: RunParams): RendererEnvelope {
  const { name, identity } = buildIdentity(candidate);
  const alloc = (params.allocation_pct ?? 0.05) * 100;
  const r = simCompute(alloc, SUBJECT_BASE);
  const totalWeight = POOL_MEMBERS.reduce((a, m) => a + m[2], 0);
  const fmt = (v: number, digits = 1) => Math.round(v * 10 ** digits) / 10 ** digits;

  const rows = [
    { metric: "annualised_return", label: "Ann. return", current: fmt(SIM_BASE.ret), proposed: fmt(r.ret), delta: fmt(r.dRet), format: ".1%" },
    { metric: "annualised_vol", label: "Ann. volatility", current: fmt(SIM_BASE.vol), proposed: fmt(r.vol), delta: fmt(r.dVol), format: ".1%" },
    { metric: "sharpe", label: "Sharpe", current: fmt(SIM_BASE.sharpe, 2), proposed: fmt(r.sharpe, 2), delta: fmt(r.dSharpe, 2), format: ".2f" },
    { metric: "max_drawdown", label: "Max drawdown", current: fmt(SIM_BASE.dd), proposed: fmt(r.dd), delta: fmt(r.dDD), format: ".1%" },
    { metric: "avg_fund_correlation", label: "Avg fund corr.", current: fmt(SIM_BASE.corr, 2), proposed: fmt(r.corr, 2), delta: fmt(r.dCorr, 2), format: ".2f" },
    { metric: "ens", label: "Effective N (ENS)", current: fmt(SIM_BASE.ens), proposed: fmt(r.ens), delta: fmt(r.dENS), format: ".1f" },
    { metric: "var_95", label: "95% VaR (1d)", current: fmt(SIM_BASE.var), proposed: fmt(r.var), delta: fmt(r.dVaR), format: ".1%" },
  ];

  return {
    schema: rowSchema(["metric", "label", "current", "proposed", "delta", "format"]),
    rows,
    attrs: {
      source: "D1-9 Candidate Allocation Simulator",
      verdict_zone: FIT_ZONE[r.zone],
      penalty_zone: r.zone === "pen",
      avg_fund_correlation: r.maxcorr,
      corr_threshold: 0.6,
      target_pool: "LH Diversified Fund",
      pool_members: POOL_MEMBERS.map(([memberName, description, weight]) => ({ name: memberName, description, weight })),
      pool_total_weight: totalWeight,
      baseline: SIM_BASE,
      composition: [
        { fund_id: candidate, current_pct: 0, proposed_pct: alloc / 100 },
        ...POOL_MEMBERS.slice(0, 2).map(([memberName, , weight]) => ({ fund_id: memberName, current_pct: weight / totalWeight, proposed_pct: (weight / totalWeight) * (1 - alloc / 100) })),
      ],
      allocation_pct: alloc / 100,
      benchmark: params.benchmark ?? "S&P 500 TR",
      risk_free: params.risk_free ?? "SP TBill 0-3M",
    },
    identity,
  };
}

/* ── D1-9b — Candidate cohort simulator ───────────────────────────────────── */

interface CohortRow {
  rank: number; fund_id: string; is_subject: boolean;
  dENS: number; dSharpe: number; max_pm_corr: number; penalty: boolean; fit_zone: string;
  // superset fields our Simulator UI needs beyond the guide's minimal schema:
  short: string; ret: number; vol: number; sharpe: number; dd: number; ens: number; var: number;
  dRet: number; dVol: number; dDD: number; dVaR: number;
  [key: string]: unknown;
}

function rankCohort(subjectName: string, candPeers: CandPeer[], allocPct: number): CohortRow[] {
  const members = [
    { key: "subject", short: subjectName, fund_id: subjectName, ...SUBJECT_BASE, isSubject: true },
    ...candPeers.map((c) => ({ key: c.key, short: c.short, fund_id: c.key, ret: c.ret, vol: c.vol, dd: c.dd, corr: c.corr, isSubject: false })),
  ];
  const scored = members.map((m) => ({ m, r: simCompute(allocPct, m) }));
  scored.sort((a, b) => b.r.dENS - a.r.dENS);
  return scored.map(({ m, r }, i) => ({
    rank: i + 1,
    fund_id: m.fund_id,
    is_subject: m.isSubject,
    dENS: Math.round(r.dENS * 1000) / 1000,
    dSharpe: Math.round(r.dSharpe * 1000) / 1000,
    max_pm_corr: r.maxcorr,
    penalty: r.zone === "pen",
    fit_zone: FIT_ZONE[r.zone],
    short: m.short,
    ret: Math.round(r.ret * 10) / 10,
    vol: Math.round(r.vol * 10) / 10,
    sharpe: Math.round(r.sharpe * 100) / 100,
    dd: Math.round(r.dd * 10) / 10,
    ens: Math.round(r.ens * 10) / 10,
    var: Math.round(r.var * 10) / 10,
    dRet: Math.round(r.dRet * 100) / 100,
    dVol: Math.round(r.dVol * 100) / 100,
    dDD: Math.round(r.dDD * 100) / 100,
    dVaR: Math.round(r.dVaR * 100) / 100,
  }));
}

export function buildD19b(candidate: string, params: RunParams): RendererEnvelope<CohortRow> {
  const { name, identity } = buildIdentity(candidate);
  const candPeers = resolveCandidatePeers(params);
  const alloc = (params.allocation_pct ?? 0.05) * 100;
  const cohort = rankCohort(name, candPeers, alloc);
  const best = cohort[0];

  return {
    schema: rowSchema(["rank", "fund_id", "is_subject", "dENS", "dSharpe", "max_pm_corr", "penalty", "fit_zone"]),
    rows: cohort,
    attrs: { source: "D1-9b Candidate Cohort Simulator", best_fit_fund_id: best?.fund_id ?? candidate, allocation_pct: alloc / 100 },
    identity,
  };
}

function rowSchema(names: string[]): { name: string; type: string }[] {
  return names.map((n) => ({ name: n, type: "unknown" }));
}

/* ── Dispatch ─────────────────────────────────────────────────────────────── */

export const PEERFIT_LABELS = new Set(["D1-5", "D1-6", "D1-6b", "D1-7", "D1-7b", "D1-8", "D1-9", "D1-9b"]);

export function buildPeerFitRenderer(label: string, candidate: string, params: RunParams, extra: { source?: string } = {}): RendererEnvelope {
  switch (label) {
    case "D1-5": return buildD15(candidate, params);
    case "D1-6": return buildD16(candidate, params);
    case "D1-6b": return buildD16b(candidate, params);
    case "D1-7": return buildD17(candidate, params, extra.source);
    case "D1-7b": return buildD17b(candidate, params);
    case "D1-8": return buildD18(candidate, params);
    case "D1-9": return buildD19(candidate, params);
    case "D1-9b": return buildD19b(candidate, params);
    default: throw new Error(`Unknown Peer-Fit renderer: ${label}`);
  }
}
