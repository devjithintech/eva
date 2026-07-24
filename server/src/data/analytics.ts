/**
 * Dynamic analytical engine — the "very dynamic questions" path.
 *
 * The agent maps an open-ended question to a structured intent (which funds,
 * which metrics, compare vs rank vs screen). This module resolves fuzzy metric
 * language against a capability catalog, computes a normalized composite score
 * over the chosen metrics, and lays the answer out as generic UI blocks the
 * `analysis` renderer draws. Numbers stay server-owned — blocks carry only
 * computed display strings.
 */
import type { AnalysisBlock, AnalysisPayload } from "./types.js";
import { candidateNames, num, resolveCandidateRecord, sec } from "./candidates.js";

/* ── metric capability catalog ──────────────────────────────────────────────
 * The single source of "what can be asked". Each metric knows how to read its
 * value from a candidate record, whether higher or lower is better, how to
 * format it, and the words a user might use for it (synonyms drive resolution).
 */
type Dir = "high" | "low";
interface MetricDef {
  key: string;
  label: string;
  dir: Dir;
  /** Absolute scoring bounds: value at/below `lo` and at/above `hi` clamp. */
  lo: number;
  hi: number;
  /** Score on |value| instead of the signed value (e.g. beta near 0). */
  abs?: boolean;
  synonyms: string[];
  get: (c: Record<string, unknown>) => number | null;
  fmt: (v: number) => string;
}

const signed = (v: number) => (v > 0 ? "+" : "") + v.toFixed(1) + "%";
const pct = (v: number) => v.toFixed(1) + "%";
const ratio = (v: number) => v.toFixed(2);
const rs = (c: Record<string, unknown>) => sec(c, "return_skill");
const dd = (c: Record<string, unknown>) => sec(c, "downside_distribution");
const ba = (c: Record<string, unknown>) => sec(c, "benchmark_activeness");

/** Composite "survived perturbation / stress" score (0–100) from the risk data:
 *  shallow drawdown, low volatility, contained tail loss (CVaR), and a documented
 *  risk framework each contribute. Higher = more robust under stress. */
function stressSurvival(c: Record<string, unknown>): number | null {
  const d = dd(c), rf = sec(c, "risk_framework");
  const maxdd = num(d.max_drawdown_pct);
  const vol = num(d.volatility_pct);
  const cvar = num(d.cvar_95_pct);
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const parts: number[] = [];
  if (maxdd != null) parts.push(clamp((35 - Math.abs(maxdd)) / 32)); // -3%→~1, -35%→0
  if (vol != null) parts.push(clamp((22 - vol) / 19)); // 3%→~1, 22%→0
  if (cvar != null) parts.push(clamp((20 - Math.abs(cvar)) / 18));
  const framework = [rf.risk_framework_description, rf.stop_loss_policy, rf.risk_model_used].filter(
    (v) => (typeof v === "string" ? v.trim().length > 0 : !!v),
  ).length;
  parts.push(clamp(framework / 3));
  if (!parts.length) return null;
  return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100);
}

const CATALOG: MetricDef[] = [
  { key: "annualised_return", label: "Annualised return", dir: "high", lo: 0, hi: 25, synonyms: ["return", "returns", "annualised return", "annualized return", "performance", "cagr", "growth"], get: (c) => num(rs(c).annualized_return_pct) ?? num(rs(c).cagr_pct), fmt: signed },
  { key: "alpha", label: "Alpha", dir: "high", lo: 0, hi: 15, synonyms: ["alpha", "alpha production", "excess return", "active return"], get: (c) => num(rs(c).alpha_annualized_pct) ?? num(rs(c).active_return_pct) ?? num(rs(c).excess_return_pct), fmt: signed },
  { key: "sharpe", label: "Sharpe", dir: "high", lo: 0, hi: 2.5, synonyms: ["sharpe", "sharpe ratio", "risk adjusted", "risk-adjusted"], get: (c) => num(rs(c).sharpe_ratio), fmt: ratio },
  { key: "sortino", label: "Sortino", dir: "high", lo: 0, hi: 3.5, synonyms: ["sortino", "sortino ratio", "downside risk adjusted"], get: (c) => num(rs(c).sortino_ratio), fmt: ratio },
  { key: "information_ratio", label: "Info ratio", dir: "high", lo: 0, hi: 1.5, synonyms: ["information ratio", "info ratio", "ir"], get: (c) => num(rs(c).information_ratio), fmt: ratio },
  { key: "beta", label: "Beta", dir: "low", lo: 0, hi: 1, abs: true, synonyms: ["beta", "market beta", "beta to market", "market sensitivity"], get: (c) => num(ba(c).beta), fmt: ratio },
  { key: "correlation", label: "Correlation", dir: "low", lo: 0, hi: 1, abs: true, synonyms: ["correlation", "market correlation", "diversification"], get: (c) => num(ba(c).market_correlation), fmt: ratio },
  { key: "volatility", label: "Volatility", dir: "low", lo: 3, hi: 25, synonyms: ["volatility", "vol", "risk"], get: (c) => num(dd(c).volatility_pct), fmt: pct },
  { key: "max_drawdown", label: "Max drawdown", dir: "high", lo: -35, hi: 0, synonyms: ["drawdown", "max drawdown", "minimal drawdown", "lowest drawdown", "dd"], get: (c) => num(dd(c).max_drawdown_pct), fmt: pct },
  { key: "positive_months", label: "Positive months", dir: "high", lo: 40, hi: 80, synonyms: ["positive months", "hit rate", "win rate", "consistency"], get: (c) => num(dd(c).positive_months_pct), fmt: pct },
  { key: "stress_survival", label: "Stress survival", dir: "high", lo: 0, hi: 100, synonyms: ["stress", "perturbation", "survived", "survive", "survival", "robustness", "resilience", "stress test", "shock"], get: stressSurvival, fmt: (v) => `${Math.round(v)}/100` },
  { key: "aum", label: "AUM (US$m)", dir: "high", lo: 0, hi: 3000, synonyms: ["aum", "size", "assets", "assets under management"], get: (c) => pickAum(c), fmt: (v) => `$${Math.round(v).toLocaleString("en-US")}m` },
  { key: "fee", label: "Management fee", dir: "low", lo: 0, hi: 2.5, synonyms: ["fee", "fees", "management fee", "cost"], get: (c) => num(sec(c, "fees").management_fee_pct), fmt: pct },
];

function pickAum(c: Record<string, unknown>): number | null {
  const raw = sec(c, "classification").current_aum_usd_mn;
  if (!Array.isArray(raw)) return num(raw);
  const rows = raw as Array<{ scope?: string; fund_ref?: string; value?: unknown }>;
  const pick =
    rows.find((r) => r.scope === "fund" && r.fund_ref === "subject" && num(r.value) != null) ??
    rows.find((r) => r.scope === "fund" && num(r.value) != null) ??
    rows.find((r) => num(r.value) != null);
  return pick ? num(pick.value) : null;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/** Resolve a free-text metric phrase to a catalog entry (exact key, synonym, or
 *  containment either way). Returns null when nothing matches. */
function resolveMetric(term: string): MetricDef | null {
  const q = norm(term);
  if (!q) return null;
  return (
    CATALOG.find((m) => m.key === q || m.label.toLowerCase() === q) ??
    CATALOG.find((m) => m.synonyms.some((s) => q === s || q.includes(s) || s.includes(q))) ??
    null
  );
}

export interface AnalysisIntent {
  question?: string;
  /** Fund names/ids to analyse; empty → screen the whole pool. */
  candidates?: string[];
  /** Free-text metric phrases; resolved against the catalog. */
  metrics?: string[];
  mode?: "compare" | "rank" | "screen";
}

const DEFAULT_METRICS = ["alpha", "sharpe", "max_drawdown"];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Compute a dynamic analytical view from a structured intent: resolve funds and
 * metrics, min-max normalize each metric across the set (respecting direction),
 * average into a 0–100 composite, rank, and lay out verdict + table + bar blocks.
 */
export function buildAnalysis(intent: AnalysisIntent): AnalysisPayload {
  // ── resolve metrics (fall back to a sensible default set) ──
  const wanted = (intent.metrics?.length ? intent.metrics : DEFAULT_METRICS)
    .map(resolveMetric)
    .filter((m): m is MetricDef => m !== null);
  const seenM = new Set<string>();
  const metrics = wanted.filter((m) => (seenM.has(m.key) ? false : (seenM.add(m.key), true)));
  const useMetrics = metrics.length ? metrics : (DEFAULT_METRICS.map(resolveMetric).filter(Boolean) as MetricDef[]);

  // ── resolve entities (named funds, else the whole pool) ──
  const named = (intent.candidates ?? [])
    .map((q) => resolveCandidateRecord(q))
    .filter((r): r is { name: string; rec: Record<string, unknown> } => r !== null);
  const seenE = new Set<string>();
  let entities = named.filter((e) => (seenE.has(e.name) ? false : (seenE.add(e.name), true)));
  const screening = entities.length < 2;
  if (screening) {
    entities = candidateNames()
      .map((n) => resolveCandidateRecord(n))
      .filter((r): r is { name: string; rec: Record<string, unknown> } => r !== null);
  }
  const mode = intent.mode ?? (screening ? "rank" : "compare");

  // ── raw values + absolute per-metric scoring (0..1, fixed bounds) ──
  // Absolute (not min-max) so scores are stable and interpretable regardless of
  // how many funds are in the set — a 2-fund compare doesn't force the loser to 0.
  const raw = entities.map((e) => ({ name: e.name, vals: useMetrics.map((m) => m.get(e.rec)) }));
  const scoreCol = useMetrics.map((m, i) =>
    raw.map((r) => {
      const v = r.vals[i];
      if (v == null) return null;
      const x = m.abs ? Math.abs(v) : v;
      const t = clamp01((x - m.lo) / (m.hi - m.lo));
      return m.dir === "high" ? t : 1 - t; // low-is-better → invert
    }),
  );

  // composite 0–100 per entity (mean of available metric scores)
  const scored = entities.map((e, r) => {
    const parts = scoreCol.map((col) => col[r]).filter((v): v is number => v != null);
    const composite = parts.length ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100) : 0;
    // which metrics this entity leads the set on (for the verdict reason)
    const leads = useMetrics.filter((_, i) => {
      const col = scoreCol[i];
      const mine = col[r];
      const best = Math.max(...col.filter((v): v is number => v != null), -Infinity);
      return mine != null && Number.isFinite(best) && mine >= best - 1e-9;
    });
    return { name: e.name, rec: e.rec, values: raw[r].vals, composite, leads };
  });
  scored.sort((a, b) => b.composite - a.composite);

  const winner = scored[0];
  const metricLabels = useMetrics.map((m) => m.label);

  // ── assemble blocks ──
  const blocks: AnalysisBlock[] = [];

  if (winner && mode === "compare" && scored.length >= 2) {
    const leadLabels = winner.leads.map((m) => m.label.toLowerCase());
    const reason =
      (leadLabels.length ? `Leads on ${listPhrase(leadLabels)}. ` : "") +
      `Composite ${winner.composite}/100 vs ${scored[1].composite} for ${scored[1].name}.`;
    blocks.push({ type: "verdict", winner: winner.name, reason, tone: winner.composite >= 66 ? "green" : winner.composite >= 45 ? "violet" : "amber" });
  }

  // headline tiles: the winner's value on each requested metric
  if (winner) {
    blocks.push({
      type: "statTiles",
      tiles: useMetrics.map((m, i) => ({
        label: m.label,
        value: winner.values[i] == null ? "—" : m.fmt(winner.values[i] as number),
        sub: winner.name,
      })),
    });
  }

  // full comparison / ranking table
  blocks.push({
    type: "metricTable",
    columns: ["Fund", ...metricLabels, "Score"],
    rows: scored.slice(0, 12).map((s) => ({
      cells: [s.name, ...useMetrics.map((m, i) => (s.values[i] == null ? "—" : m.fmt(s.values[i] as number))), `${s.composite}`],
      highlight: winner ? s.name === winner.name : false,
    })),
  });

  // composite bar chart
  blocks.push({
    type: "barChart",
    label: "Composite score (0–100)",
    bars: scored.slice(0, 12).map((s) => ({ label: s.name, value: clamp01(s.composite / 100), display: `${s.composite}`, highlight: winner ? s.name === winner.name : false })),
  });

  if (screening) {
    blocks.push({ type: "callout", text: `Screened the full pool of ${entities.length} funds. Name specific funds to compare just those.` });
  }

  const title = intent.question?.trim() || (mode === "compare" ? `${scored.map((s) => s.name).slice(0, 3).join(" vs ")}` : `Ranked by ${listPhrase(metricLabels.map((l) => l.toLowerCase()))}`);
  const subtitle = `${mode === "compare" ? "Comparison" : mode === "screen" ? "Screen" : "Ranking"} · ${metricLabels.join(" · ")}`;

  // One-line prose overview above the view.
  const metricPhrase = listPhrase(metricLabels.map((l) => l.toLowerCase()));
  let summary = "";
  if (winner && mode === "compare" && scored.length >= 2) {
    const lead = winner.leads.length ? `, topping ${listPhrase(winner.leads.map((m) => m.label.toLowerCase()))}` : "";
    summary = `Across ${scored.length} funds on ${metricPhrase}, ${winner.name} scores highest (${winner.composite}/100 vs ${scored[1].composite} for ${scored[1].name})${lead}.`;
  } else if (winner) {
    const top = scored.slice(0, 3).map((s) => s.name);
    summary = `Screened ${entities.length} funds on ${metricPhrase}. ${top.join(", ")} lead the ranking — ${winner.name} first at ${winner.composite}/100.`;
  }

  return { title: title.length > 80 ? title.slice(0, 79) + "…" : title, subtitle, summary, blocks };
}

/** "a, b and c" */
function listPhrase(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
