/**
 * Canonical candidate-intelligence dataset.
 *
 * The agent never invents numbers — it chooses *which* artifact to render and
 * for *which* entities; the builders here turn that intent into a fully
 * populated artifact payload. Data ported from the original LightHouse demo.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { funnelCounts, getStage } from "./pipeline.js";
import type {
  AnalystFlagsPayload,
  Candidate,
  CharacteristicsPayload,
  ComparisonPayload,
  ComparisonSection,
  CorrelationPayload,
  MatrixRow,
  OppPoint,
  OpportunityMapPayload,
  ReturnsPayload,
  ScorecardCriterion,
  ScorecardPayload,
  CandidatePoolPayload,
} from "./types.js";

/** The live dataset the BFF serves. Read fresh so edits show without a restart.
 *  Resolves `server/data/data.json` in both dev (src/) and prod (dist/). */
const DATA_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../data/data.json");
interface RawDataset {
  count: number;
  candidates: Record<string, Record<string, unknown>>;
}
function loadDataset(): RawDataset {
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf8")) as RawDataset;
  } catch {
    return { count: 0, candidates: {} };
  }
}
/** Coerce a value to a finite number, else null. */
export const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Candidate names currently in the dataset (the map keys). */
export function candidateNames(): string[] {
  return Object.keys(loadDataset().candidates);
}

/**
 * Resolve a free-text candidate reference to its record. Matches on slug, exact
 * name, substring either way, fund name, or pm_id — so "anda", "ANDA Cruise",
 * "meadow" all resolve. Returns null when nothing matches (caller asks back).
 */
export function resolveCandidateRecord(query: string): { name: string; rec: Record<string, unknown> } | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const entries = Object.entries(loadDataset().candidates);
  const hit =
    entries.find(([name]) => slugify(name) === slugify(q) || name.toLowerCase() === q) ??
    entries.find(([name, rec]) => {
      const fund = ((rec.subject_fund as { fund_name?: string } | undefined)?.fund_name ?? "").toLowerCase();
      return name.toLowerCase().includes(q) || q.includes(name.toLowerCase()) || fund.includes(q) || rec.pm_id === query;
    });
  return hit ? { name: hit[0], rec: hit[1] } : null;
}

/** Find a candidate actually named in free text (word-boundary on the fund key,
 *  or a substring of the full fund name). Returns the canonical name, else
 *  undefined — so the agent asks which candidate instead of defaulting one. */
export function findCandidateInText(text?: string): string | undefined {
  if (!text) return undefined;
  const t = text.toLowerCase();
  for (const [name, rec] of Object.entries(loadDataset().candidates)) {
    const key = name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${key}\\b`).test(t)) return name;
    const fund = (rec.subject_fund as { fund_name?: string } | undefined)?.fund_name?.toLowerCase();
    if (fund && fund.length > 4 && t.includes(fund)) return name;
  }
  return undefined;
}

export const ANDA_CRUISE: Candidate = {
  id: "anda-cruise",
  name: "ANDA Cruise",
  manager: "Young Kwang Joo",
  location: "Seoul",
  teamSize: 42,
  aum: "₩412B",
  strategyFamily: "multi_strategy",
  netExposure: "22%",
  benchmark: "KOSPI",
  currency: "KRW",
  inception: "2014-05-15",
  vehicle: "commingled_fund",
  blurb:
    "Flagship multi-strategy fund with the longest track record at the firm. Exploits structural inefficiencies in the Korean equity market across four sleeves, run at consistently low net exposure.",
  styleTags: [
    { label: "Event-driven", primary: true },
    { label: "Special situations", primary: true },
    { label: "Equity value pairs", primary: true },
    { label: "CB arbitrage", primary: true },
    { label: "Korea-only", primary: false },
    { label: "Low net exposure", primary: false },
  ],
};

export const CANDIDATES: Record<string, Candidate> = {
  "anda-cruise": ANDA_CRUISE,
};

const CORR_FUNDS = [
  "ANDA Cruise",
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

// ANDA Cruise's correlation against each peer (row/col 0). Deterministic fill
// for the rest, matching the original demo's generator.
const ANDA_CORR = [
  null, 0.51, 0.47, 0.63, 0.53, 0.47, 0.42, 0.47, 0.34, 0.41, 0.53, 0.17, 0.12,
  0.24, 0.04, -0.18, -0.02, -0.02, 0.02,
];

function buildCorrelationMatrix(): (number | null)[][] {
  const n = CORR_FUNDS.length;
  const m: (number | null)[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) m[i][i] = null;
  for (let j = 1; j < n; j++) {
    m[0][j] = ANDA_CORR[j];
    m[j][0] = ANDA_CORR[j];
  }
  const rng = (a: number, b: number) => {
    const x = Math.sin((a + 1) * 374.13 + (b + 1) * 977.31) * 43758.5453;
    return x - Math.floor(x);
  };
  for (let i = 1; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let v = 0.2 + rng(i, j) * 0.55;
      if (rng(j, i * 2) < 0.05) v = -(0.02 + rng(i, j * 3) * 0.2);
      v = Math.round(v * 100) / 100;
      m[i][j] = v;
      m[j][i] = v;
    }
  }
  return m;
}



/* ── Builders ──────────────────────────────────────────────────────────── */

/** First finite number found across the (sometimes array-shaped) exposure section. */
const firstNum = (vs: unknown[]): number | null => {
  for (const v of vs) {
    const n = num(v);
    if (n != null) return n;
  }
  return null;
};

/**
 * Candidate profile card for ANY candidate in the live dataset. The rich static
 * ANDA profile stays as an override; everyone else is mapped from their
 * data.json record (fields missing in the data render as "—").
 */
export function buildCharacteristics(query = "anda-cruise"): CharacteristicsPayload {
  const staticHit = CANDIDATES[slugify(query)];
  if (staticHit) return { candidate: staticHit };

  const hit = resolveCandidateRecord(query);
  if (!hit) return { candidate: ANDA_CRUISE };

  const rec = hit.rec;
  const cls = sec(rec, "classification");
  const mgr = sec(rec, "manager");
  const strat = sec(rec, "strategy");
  const terms = sec(rec, "terms_redemption");

  // exposure is an array of per-fund entries in data.json — take the subject's.
  const expo = Array.isArray(rec.exposure) ? (rec.exposure[0] as Record<string, unknown> | undefined) ?? {} : sec(rec, "exposure");
  const netNow = firstNum([expo.net_exposure_current_pct, expo.net_exposure_avg_pct]);

  // AUM: subject-fund entry of current_aum_usd_mn when present.
  const aumEntries = Array.isArray(cls.current_aum_usd_mn) ? (cls.current_aum_usd_mn as { value?: unknown }[]) : [];
  const aumMn = firstNum(aumEntries.map((a) => a?.value));

  const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
  const tags: { label: string; primary: boolean }[] = [];
  const pushTag = (v: unknown, primary: boolean) => {
    const s = str(v);
    if (s && !tags.some((t) => t.label === s)) tags.push({ label: s.replace(/_/g, " "), primary });
  };
  pushTag(strat.sub_strategy, true);
  pushTag(cls.sub_style_tilt, true);
  pushTag(strat.market_cap_focus, false);
  (Array.isArray(cls.geographic_focus) ? (cls.geographic_focus as unknown[]) : []).forEach((g) => pushTag(g, false));

  return {
    candidate: {
      id: slugify(hit.name),
      name: hit.name,
      manager: str(mgr.pm_name) ?? "—",
      location: str(cls.manager_location) ?? "—",
      teamSize: num(mgr.team_size) ?? 0,
      aum: aumMn != null ? `$${aumMn}M` : "—",
      strategyFamily: str(cls.strategy_family) ?? "—",
      netExposure: netNow != null ? `${netNow}%` : str(expo.net_exposure_target) ?? "—",
      benchmark: str(cls.stated_benchmark)?.split("(")[0]?.trim() ?? "—",
      currency: str(cls.base_currency) ?? "—",
      inception: str(cls.inception_date) ?? "—",
      vehicle: str(terms.fund_structure) ?? "—",
      blurb: str(strat.description)?.slice(0, 300) ?? "",
      styleTags: tags.slice(0, 6),
    },
  };
}

/**
 * Dynamic opportunity map from `data.json` + the runtime pipeline:
 *  - scatter points = every candidate with both CAGR and max drawdown,
 *  - funnel (scored → shortlisted → interview) from the pipeline store,
 *  - pool = candidate count + total funds (each subject fund + its siblings).
 */
export function buildOpportunityMap(): OpportunityMapPayload {
  const entries = Object.entries(loadDataset().candidates);
  const ids = entries.map(([name]) => slugify(name));

  const points = entries
    .map(([name, c]) => {
      const rs = sec(c, "return_skill");
      const dd = sec(c, "downside_distribution");
      const cagr = num(rs.cagr_pct) ?? num(rs.annualized_return_pct);
      const drawdown = num(dd.max_drawdown_pct);
      return cagr != null && drawdown != null
        ? { name, cagr, dd: drawdown, stage: getStage(slugify(name)) }
        : null;
    })
    .filter((p): p is OppPoint => p !== null);

  if (!points.length) throw new Error("No candidates with plottable CAGR + max drawdown to map.");

  let funds = 0;
  for (const [, c] of entries) {
    const sf = c.subject_fund as { sibling_funds?: unknown[] } | undefined;
    funds += 1 + (Array.isArray(sf?.sibling_funds) ? sf!.sibling_funds!.length : 0);
  }

  return {
    title: "Candidate pool — opportunity map",
    funnel: funnelCounts(ids),
    pool: { candidates: entries.length, funds },
    points,
  };
}

/** Candidate list ranked by CAGR. Top-N (default 10), or the full list when `all`. */
export function buildCandidatePool(n = 10, all = false): CandidatePoolPayload {
  const limit = Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 10;
  const ds = loadDataset();
  const rows: MatrixRow[] = Object.entries(ds.candidates).map(([name, c]) => {
    const rs = sec(c, "return_skill");
    const dd = sec(c, "downside_distribution");
    return {
      name,
      cagr: num(rs.cagr_pct) ?? num(rs.annualized_return_pct),
      sharpe: num(rs.sharpe_ratio),
      alpha: num(rs.alpha_annualized_pct) ?? num(rs.active_return_pct) ?? num(rs.excess_return_pct),
      dd: num(dd.max_drawdown_pct),
      you: name.toLowerCase() === "anda",
    };
  });
  // Rank by CAGR (nulls last); full list when `all`, else the top N.
  rows.sort((a, b) => (b.cagr ?? -Infinity) - (a.cagr ?? -Infinity));
  const top = all ? rows : rows.slice(0, limit);
  const title = all
    ? `All ${top.length} candidates · CAGR · Sharpe · Alpha · Max DD`
    : `Top ${top.length} · CAGR · Sharpe · Alpha · Max DD`;
  return { title, rows: top };
}

/** One comparison metric: a label + a per-candidate display-string getter. */
interface CompareMetric {
  label: string;
  get: (c: Record<string, unknown>) => string;
}
/** A labelled group of comparison metrics (PROFILE, PERFORMANCE, …). */
interface CompareSection {
  title: string;
  metrics: CompareMetric[];
}

/**
 * Read an analysis section. Newer datasets wrap each section in an array of
 * scoped records ({scope, fund_ref, share_class, …metrics}); older ones store a
 * plain object. Return the primary record: the subject fund's, else the first
 * fund-scope, else the first entry — so both shapes work.
 */
export const sec = (c: Record<string, unknown>, k: string): Record<string, unknown> => {
  const v = c[k];
  if (Array.isArray(v)) {
    const arr = v as Record<string, unknown>[];
    return (
      arr.find((e) => e && e.fund_ref === "subject" && e.scope === "fund") ??
      arr.find((e) => e && e.fund_ref === "subject") ??
      arr.find((e) => e && e.scope === "fund") ??
      arr[0] ??
      {}
    );
  }
  return (v ?? {}) as Record<string, unknown>;
};
const signedPct = (v: number) => (v > 0 ? "+" : "") + v.toFixed(1) + "%";
const plainPct = (v: number) => v.toFixed(1) + "%";
/** Short, legend-friendly benchmark name — drops parenthetical / trailing notes. */
const benchLabel = (v: unknown): string => {
  if (typeof v !== "string" || !v.trim()) return "Benchmark";
  const short = v.split(/[(;]/)[0].trim();
  return short.length > 26 ? short.slice(0, 25) + "…" : short;
};

const dash = "—";
const ratio = (v: number) => v.toFixed(2);

/** Wrap a numeric getter into a display-string getter (dash when unreported). */
const metric =
  (get: (c: Record<string, unknown>) => number | null, fmt: (v: number) => string) =>
  (c: Record<string, unknown>): string => {
    const v = get(c);
    return v == null ? dash : fmt(v);
  };

const titleize = (s: string) => s.replace(/_/g, " ").replace(/\b\w/, (m) => m.toUpperCase());

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2012-07-01" → "Jul 2012"; passthrough for anything non-ISO. */
function fmtInception(v: unknown): string {
  if (typeof v !== "string" || !v.trim()) return dash;
  const m = v.match(/^(\d{4})-(\d{2})/);
  if (!m) return v.trim();
  return `${MONTHS[Number(m[2]) - 1] ?? ""} ${m[1]}`.trim();
}

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", JPY: "¥", CHF: "CHF ", KRW: "₩",
  NOK: "NOK ", SEK: "SEK ", DKK: "DKK ", HKD: "HK$", SGD: "S$", CAD: "C$", AUD: "A$",
};
const symbolFor = (code: unknown): string =>
  typeof code === "string" && code ? CURRENCY_SYMBOL[code.toUpperCase()] ?? code + " " : "$";
/** 1_000_000 → "1m", 500_000_000 → "500m", 25_000 → "25k". */
const compactAmount = (v: number): string =>
  v >= 1e9 ? `${(v / 1e9).toFixed(v % 1e9 === 0 ? 0 : 1)}bn`
  : v >= 1e6 ? `${(v / 1e6).toFixed(v % 1e6 === 0 ? 0 : 1)}m`
  : v >= 1e3 ? `${Math.round(v / 1e3)}k`
  : String(v);

const STRATEGY_LABELS: Record<string, string> = {
  long_short_equity: "Long/short equity",
  market_neutral_equity: "Market neutral",
  multi_strategy: "Multi-strategy",
  managed_futures: "Managed futures / CTA",
  statistical_arbitrage: "Statistical arbitrage",
  fixed_income_relative_value: "Fixed income RV",
  relative_value: "Relative value",
  event_driven: "Event-driven",
  credit: "Credit",
  quantitative: "Quantitative",
  volatility_arbitrage: "Volatility arbitrage",
};
function strategyLabel(c: Record<string, unknown>): string {
  const fam = sec(c, "classification").strategy_family;
  if (typeof fam === "string" && fam) return STRATEGY_LABELS[fam] ?? titleize(fam);
  const t = sec(c, "strategy").type;
  return typeof t === "string" && t ? STRATEGY_LABELS[t] ?? titleize(t) : dash;
}

/** Geographic focus → short label ("Global" when the fund spans everything). */
function regionLabel(c: Record<string, unknown>): string {
  const g = sec(c, "classification").geographic_focus;
  const arr = Array.isArray(g)
    ? (g.filter((x) => typeof x === "string") as string[])
    : typeof g === "string" && g ? [g] : [];
  if (!arr.length) return dash;
  if (arr.some((x) => x.toLowerCase() === "global")) return "Global";
  return arr.slice(0, 2).join(", ");
}

function trackRecordLabel(c: Record<string, unknown>): string {
  const audited = sec(c, "classification").is_track_record_audited;
  if (audited === true) return "Live · audited";
  if (audited === false) return "Live · unaudited";
  return dash;
}

/** AUM (USD mn) is a scoped array — prefer the subject fund's figure. */
function pickAumMn(c: Record<string, unknown>): number | null {
  const raw = sec(c, "classification").current_aum_usd_mn;
  if (!Array.isArray(raw)) return num(raw);
  const rows = raw as Array<{ scope?: string; fund_ref?: string; value?: unknown }>;
  const pick =
    rows.find((r) => r.scope === "fund" && r.fund_ref === "subject" && num(r.value) != null) ??
    rows.find((r) => r.scope === "fund" && num(r.value) != null) ??
    rows.find((r) => num(r.value) != null);
  return pick ? num(pick.value) : null;
}

function minInvestment(c: Record<string, unknown>): string {
  const v = sec(c, "terms_redemption").minimum_investment;
  if (typeof v === "number" && Number.isFinite(v)) return symbolFor(sec(c, "classification").base_currency) + compactAmount(v);
  if (typeof v === "string" && v.trim()) {
    const first = v.split(/[;(]/)[0].trim();
    return first.length > 22 ? first.slice(0, 21) + "…" : first;
  }
  return dash;
}

/** Free-text redemption frequency → first clause, capitalised ("Monthly"). */
function redemptionLabel(c: Record<string, unknown>): string {
  const v = sec(c, "terms_redemption").redemption_frequency;
  if (typeof v !== "string" || !v.trim()) return dash;
  const first = v.split(/[;(]/)[0].trim();
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : dash;
}

const int = (v: unknown) => (num(v) == null ? dash : String(Math.round(num(v)!)));

/**
 * The comparison matrix layout — sections of metric rows. Each metric's `get`
 * returns the per-candidate display string (dash when the fund doesn't report
 * it), so both a 2-fund and an N-fund comparison render from one definition.
 */
const COMPARE_SECTIONS: CompareSection[] = [
  {
    title: "Profile",
    metrics: [
      { label: "Strategy", get: strategyLabel },
      { label: "Region", get: regionLabel },
      { label: "Portfolio Manager", get: (c) => (typeof sec(c, "manager").pm_name === "string" ? (sec(c, "manager").pm_name as string) : dash) },
      { label: "Inception", get: (c) => fmtInception(sec(c, "classification").inception_date) },
      { label: "Base currency", get: (c) => (typeof sec(c, "classification").base_currency === "string" ? (sec(c, "classification").base_currency as string) : dash) },
      { label: "Track record", get: trackRecordLabel },
    ],
  },
  {
    title: "Performance",
    metrics: [
      { label: "Annualised return", get: metric((c) => num(sec(c, "return_skill").annualized_return_pct) ?? num(sec(c, "return_skill").cagr_pct), signedPct) },
      { label: "Sharpe ratio", get: metric((c) => num(sec(c, "return_skill").sharpe_ratio), ratio) },
      { label: "Sortino ratio", get: metric((c) => num(sec(c, "return_skill").sortino_ratio), ratio) },
      { label: "Alpha (annualised)", get: metric((c) => num(sec(c, "return_skill").alpha_annualized_pct) ?? num(sec(c, "return_skill").active_return_pct) ?? num(sec(c, "return_skill").excess_return_pct), signedPct) },
      { label: "Beta to market", get: metric((c) => num(sec(c, "benchmark_activeness").beta), ratio) },
    ],
  },
  {
    title: "Risk",
    metrics: [
      { label: "Volatility", get: metric((c) => num(sec(c, "downside_distribution").volatility_pct), plainPct) },
      { label: "Max drawdown", get: metric((c) => num(sec(c, "downside_distribution").max_drawdown_pct), plainPct) },
      { label: "Best month", get: metric((c) => num(sec(c, "downside_distribution").best_month_pct), signedPct) },
      { label: "Worst month", get: metric((c) => num(sec(c, "downside_distribution").worst_month_pct), signedPct) },
      { label: "Positive months", get: metric((c) => num(sec(c, "downside_distribution").positive_months_pct), plainPct) },
    ],
  },
  {
    title: "Exposure",
    metrics: [
      { label: "Gross exposure", get: metric((c) => num(sec(c, "exposure").gross_exposure_current_pct), plainPct) },
      { label: "Net exposure", get: metric((c) => num(sec(c, "exposure").net_exposure_current_pct), plainPct) },
    ],
  },
  {
    title: "Terms & size",
    metrics: [
      { label: "AUM (US$m)", get: metric(pickAumMn, (v) => `$${Math.round(v).toLocaleString("en-US")}m`) },
      { label: "Management fee", get: metric((c) => num(sec(c, "fees").management_fee_pct), plainPct) },
      { label: "Performance fee", get: metric((c) => num(sec(c, "fees").incentive_fee_pct), plainPct) },
      { label: "Redemption", get: redemptionLabel },
      { label: "Notice period (days)", get: (c) => int(sec(c, "terms_redemption").redemption_notice_days) },
      { label: "Min. investment", get: minInvestment },
      { label: "Team size", get: (c) => int(sec(c, "manager").team_size) },
    ],
  },
];

/**
 * Dynamic multi-candidate comparison matrix, pulled from `data.json`. `queries`
 * are free-text names/ids; each must resolve and at least two are required — the
 * caller (agent) is expected to ask the user for names when unclear. Columns
 * follow the requested order; duplicates are collapsed.
 */
export function buildComparison(queries: string[]): ComparisonPayload {
  const seen = new Set<string>();
  const cands = (Array.isArray(queries) ? queries : [])
    .map((q) => resolveCandidateRecord(q))
    .filter((r): r is { name: string; rec: Record<string, unknown> } => r !== null)
    .filter((r) => (seen.has(r.name) ? false : (seen.add(r.name), true)));

  if (cands.length < 2) {
    const got = cands.map((c) => c.name).join(", ") || "none";
    throw new Error(`Comparison needs at least two known candidates — resolved: ${got}. Available: ${candidateNames().join(", ")}.`);
  }

  const columns = cands.map((c) => c.name);
  const sections: ComparisonSection[] = COMPARE_SECTIONS.map((s) => ({
    title: s.title,
    rows: s.metrics.map((m) => ({ label: m.label, values: cands.map((c) => m.get(c.rec)) })),
  }));
  const title = columns.length === 2 ? `${columns[0]} vs ${columns[1]}` : `Comparison · ${columns.length} candidates`;
  return { title, columns, sections };
}

/**
 * Dynamic trailing-returns view for one candidate, pulled from `data.json`.
 * `query` is a free-text name/id and must resolve — the agent asks the user for
 * a candidate when none is clear. Growth-of-100 is derived from the real annual
 * returns; the benchmark line is reconstructed from real up/down capture ratios
 * (omitted when those aren't available).
 */
export function buildReturns(query?: string, years = 5): ReturnsPayload {
  const c = query ? resolveCandidateRecord(query) : null;
  if (!c) {
    throw new Error(`Returns needs a known candidate — couldn't resolve: ${query ?? "(none)"}. Available: ${candidateNames().join(", ")}.`);
  }
  const window = Number.isFinite(years) && years > 0 ? Math.floor(years) : 5;
  const rs = sec(c.rec, "return_skill");
  const dd = sec(c.rec, "downside_distribution");
  const ba = sec(c.rec, "benchmark_activeness");

  const raw = (Array.isArray(rs.annual_returns) ? rs.annual_returns : []) as Array<{ year?: number; return_pct?: number | null }>;
  const annual = raw
    .filter((r) => typeof r.year === "number" && num(r.return_pct) != null)
    .map((r) => ({ year: r.year as number, ret: r.return_pct as number }))
    .sort((x, y) => x.year - y.year)
    .slice(-window);

  // Growth of 100, plus an optional benchmark reconstructed from capture ratios
  // (capture = fund / benchmark ⇒ benchmark = fund / capture).
  const upCap = num(ba.up_capture_pct);
  const downCap = num(ba.down_capture_pct);
  const hasBench = upCap != null && downCap != null && upCap !== 0 && downCap !== 0;
  const fundGrowth = [100];
  const benchGrowth = [100];
  for (const { ret } of annual) {
    fundGrowth.push(fundGrowth[fundGrowth.length - 1] * (1 + ret / 100));
    if (hasBench) {
      const cap = ret >= 0 ? upCap! : downCap!;
      benchGrowth.push(benchGrowth[benchGrowth.length - 1] * (1 + ret / (cap / 100) / 100));
    }
  }
  const all = hasBench ? [...fundGrowth, ...benchGrowth] : fundGrowth;
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const norm = (v: number) => (hi === lo ? 0.5 : (v - lo) / (hi - lo));

  const rets = annual.map((a) => a.ret);
  const n = annual.length;
  // CAGR over the selected window (annualized from the growth), falling back to
  // the record's reported figure when there's no annual series.
  const windowCagr = n > 0 ? (Math.pow(fundGrowth[fundGrowth.length - 1] / 100, 1 / n) - 1) * 100 : null;
  const cagr = windowCagr ?? num(rs.cagr_pct) ?? num(rs.annualized_return_pct);
  const cumulative = n ? (fundGrowth[fundGrowth.length - 1] / 100 - 1) * 100 : null;
  const positive = num(dd.positive_months_pct);

  return {
    title: `${c.name} · trailing returns`,
    years: n || window,
    cagr: cagr == null ? "—" : signedPct(cagr),
    cumulative: cumulative == null ? "—" : signedPct(cumulative),
    bestYear: rets.length ? signedPct(Math.max(...rets)) : "—",
    worstYear: rets.length ? signedPct(Math.min(...rets)) : "—",
    positiveMonths: positive == null ? "—" : `${positive.toFixed(0)}%`,
    benchmarkLabel: benchLabel(sec(c.rec, "classification").stated_benchmark),
    fundCurve: annual.length ? fundGrowth.map(norm) : [],
    benchmarkCurve: hasBench && annual.length ? benchGrowth.map(norm) : [],
    calendar: annual.map((a) => ({ year: String(a.year), value: a.ret })),
  };
}


/**
 * Peer-correlation panel (renderer D1-8) from `data.json`. The dataset has no
 * pairwise fund-to-fund correlations, so this reports each fund's correlation to
 * its OWN stated benchmark (benchmark_activeness) — real data, not a fabricated
 * matrix. `query` optionally highlights one candidate.
 */
export function buildPeerCorrelation(query?: string) {
  const target = query ? resolveCandidateRecord(query)?.name : undefined;
  const funds = Object.entries(loadDataset().candidates)
    .map(([name, c]) => {
      const ba = sec(c, "benchmark_activeness");
      return {
        name,
        benchmark: benchLabel(sec(c, "classification").stated_benchmark),
        marketCorrelation: num(ba.market_correlation),
        rSquared: num(ba.r_squared),
        beta: num(ba.beta),
        highlight: target != null && name === target,
      };
    })
    .filter((f) => f.marketCorrelation != null || f.rSquared != null || f.beta != null)
    .sort((a, b) => (b.marketCorrelation ?? -Infinity) - (a.marketCorrelation ?? -Infinity));

  return {
    title: "Correlation to benchmark",
    note: "Per-fund correlation to each fund's stated benchmark — data.json has no pairwise peer correlations.",
    funds,
  };
}

/** Peer correlation matrix artifact (the render_benchmark_correlation view). */
export function buildCorrelation(): CorrelationPayload {
  return {
    title: "Peer correlation matrix",
    funds: CORR_FUNDS,
    matrix: buildCorrelationMatrix(),
  };
}

/**
 * Which candidate-record section(s) back each renderer label. The panel data is
 * the real section(s) from the requested fund's record in data.json. D1-8 is
 * special (pool-wide correlation) and handled in buildRendererData.
 */
export const RENDERER_SECTIONS: Record<string, string[]> = {
  "D1-1": ["factors"], // Factor regression table
  "D1-2": ["return_skill"], // Performance card
  "D1-3": ["downside_distribution"], // Risk metrics card
  "D1-4": ["classification", "benchmark_activeness"], // Fund fit — per-pool
  "D1-4b": ["classification"], // Fund fit — summary
  "D1-5": ["subject_fund", "classification", "return_skill"], // Snapshot hero + rank
  "D1-6": ["return_skill", "benchmark_activeness"], // Peer comparison table
  "D1-6b": ["return_skill", "downside_distribution"], // Peer KPI strip
  "D1-7": ["benchmark_activeness"], // Correlations quadrants
  "D1-9": ["exposure", "return_skill"], // What-if simulator
  "D1-10": ["exposure"], // Exposure decomposition
  "D1-11": ["holdings"], // Position summary cards
  "D1-12": ["factors", "volatility_greeks"], // Risk / style factor decomposition
  "D1-13": ["exposure"], // Net / Long / Short
  "D1-14": ["holdings"], // Concentration
  "D1-15": ["downside_distribution", "risk_framework"], // Portfolio risk hero
  "D1-16": ["risk_framework"], // Stress scenarios
  "D1-17": ["liquidity"], // Liquidity ladder
  "D1-18": ["exposure", "holdings"], // Top 5 market (region)
};

/**
 * Populate a renderer's response data from data.json. Per-fund renderers need a
 * `candidate` and return that fund's real section(s); D1-8 is pool-wide.
 * Returns null for labels we don't back yet.
 */
export function buildRendererData(label: string, candidateQuery?: string): unknown {
  if (label === "D1-8") return buildPeerCorrelation(candidateQuery);

  const sections = RENDERER_SECTIONS[label];
  if (!sections) return null;

  const c = candidateQuery ? resolveCandidateRecord(candidateQuery) : null;
  if (!c) {
    return { requiresCandidate: true, sections, note: "Pass ?candidate=<name|id> to populate this renderer from data.json." };
  }
  const data: Record<string, unknown> = { fund: c.name };
  for (const s of sections) data[s] = sec(c.rec, s);
  return data;
}

// Severity is not stored in data.json (flags are plain strings), so it's
// inferred from keywords — heuristic, not authoritative.
const HIGH_RE = /\b(not (independently )?audited|unaudited|key[- ]?person|capacity|soft[- ]?close|fraud|litigation|regulat|sanction|restat|redemption gate|side[- ]?pocket|conflict of interest|SEC|misrepresent|liquidity mismatch|fine[sd]?|breach)\b/i;
const MED_RE = /\b(style drift|drawdown|concentrat|turnover|leverage|valuation|model risk|backtest|proforma|proxy|short (track|history)|track record|benchmark|correlation|counterparty|operational|succession|team (turnover|departure)|fee)\b/i;

function flagSeverity(s: string): "high" | "medium" | "low" {
  return HIGH_RE.test(s) ? "high" : MED_RE.test(s) ? "medium" : "low";
}
/** First sentence (or a trimmed clause) as a short title, minus trailing punctuation. */
function flagTitle(s: string): string {
  const first = (s.split(/(?<=[.;])\s/)[0] ?? s).trim();
  const clean = (t: string) => t.replace(/[\s;,.]+$/, "");
  return first.length <= 90 ? clean(first) : clean(s.slice(0, 87)) + "…";
}

/** Dynamic analyst flags for one candidate from data.json (plain strings). */
export function buildAnalystFlags(query?: string): AnalystFlagsPayload {
  const c = query ? resolveCandidateRecord(query) : null;
  if (!c) {
    throw new Error(`Analyst flags need a known candidate — couldn't resolve: ${query ?? "(none)"}. Available: ${candidateNames().join(", ")}.`);
  }
  const raw = (Array.isArray(c.rec.analyst_flags) ? c.rec.analyst_flags : []) as string[];
  const flags = raw
    .map((s) => String(s))
    .map((s) => ({ title: flagTitle(s), detail: s, severity: flagSeverity(s) }));
  const order = { high: 0, medium: 1, low: 2 } as const;
  flags.sort((a, b) => order[a.severity] - order[b.severity]);
  const counts = {
    high: flags.filter((f) => f.severity === "high").length,
    medium: flags.filter((f) => f.severity === "medium").length,
    low: flags.filter((f) => f.severity === "low").length,
  };
  // Send every flag; the renderer shows the top few and expands on demand.
  return { title: `${c.name} · analyst flags`, counts, flags, total: flags.length };
}

/* ── Scorecard scoring model ────────────────────────────────────────────────
 * Committee scores (1–5) are DERIVED from real data.json fields via transparent
 * heuristics — the same "server owns the numbers" contract as the other views.
 * Each criterion blends the signals a fund actually reports and falls back to a
 * neutral 3.0 when it reports none, so every candidate scores without inventing
 * data. This is an indicative screen, not an authoritative committee vote. */

/** Data is a ~2026 snapshot; track-record length is derived against this year. */
const SCORE_REFERENCE_YEAR = 2026;

/** Linear map v∈[lo,hi] → [0,5], clamped. Higher input → higher score. */
const scaleUp = (v: number, lo: number, hi: number) => Math.max(0, Math.min(5, ((v - lo) / (hi - lo)) * 5));
/** Linear map where LOWER input is better: lo→5, hi→0. */
const scaleDown = (v: number, lo: number, hi: number) => Math.max(0, Math.min(5, ((hi - v) / (hi - lo)) * 5));
/** Average of the reported signals; neutral 3.0 when none are reported. */
const blend = (...signals: (number | null)[]): number => {
  const xs = signals.filter((x): x is number => x != null);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 3.0;
};
const clampScore = (v: number) => Math.max(1, Math.min(5, Math.round(v * 10) / 10));
/** A field "counts as present" when it carries real content. */
const has = (v: unknown): boolean => {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "boolean") return v;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return true;
};

/** Track-record length in years — explicit field, else derived from inception. */
function trackYears(c: Record<string, unknown>): number | null {
  const cl = sec(c, "classification");
  const explicit = num(cl.track_record_length_years);
  if (explicit != null) return explicit;
  const d = cl.track_record_start_date ?? cl.inception_date;
  if (typeof d === "string") {
    const m = d.match(/^(\d{4})/);
    if (m) return Math.max(0, SCORE_REFERENCE_YEAR - Number(m[1]));
  }
  return null;
}

const SCORE_CRITERIA: { label: string; score: (c: Record<string, unknown>) => number }[] = [
  {
    label: "Track record",
    score: (c) => {
      const cl = sec(c, "classification"), rs = sec(c, "return_skill");
      const yrs = trackYears(c);
      const audited = cl.is_track_record_audited;
      return blend(
        yrs == null ? null : scaleUp(yrs, 1, 10),
        audited === true ? 5 : audited === false ? 2.5 : null,
        num(rs.sharpe_ratio) == null ? null : scaleUp(num(rs.sharpe_ratio)!, 0, 2),
      );
    },
  },
  {
    label: "Investment team",
    score: (c) => {
      const m = sec(c, "manager");
      let s = blend(
        num(m.team_size) == null ? null : scaleUp(num(m.team_size)!, 2, 25),
        num(m.experience_years) == null ? null : scaleUp(num(m.experience_years)!, 5, 25),
        num(m.team_avg_experience_years) == null ? null : scaleUp(num(m.team_avg_experience_years)!, 3, 15),
      );
      if (m.has_pm_turnover === true) s -= 0.7;
      if (m.is_solo_pm === true) s -= 0.5;
      if (has(m.key_person_risk_note)) s -= 0.3;
      return s;
    },
  },
  {
    label: "Process & repeatability",
    score: (c) => {
      const rs = sec(c, "return_skill"), dd = sec(c, "downside_distribution");
      return blend(
        num(rs.sortino_ratio) == null ? null : scaleUp(num(rs.sortino_ratio)!, 0, 3),
        num(rs.information_ratio) == null ? null : scaleUp(num(rs.information_ratio)!, 0, 1.5),
        num(rs.sharpe_ratio) == null ? null : scaleUp(num(rs.sharpe_ratio)!, 0, 2),
        num(dd.positive_months_pct) == null ? null : scaleUp(num(dd.positive_months_pct)!, 40, 75),
      );
    },
  },
  {
    label: "Risk management",
    score: (c) => {
      const dd = sec(c, "downside_distribution"), rf = sec(c, "risk_framework");
      const maxdd = num(dd.max_drawdown_pct);
      const framework = [rf.risk_framework_description, rf.stop_loss_policy, rf.risk_model_used, rf.position_limits].filter(has).length;
      return blend(
        maxdd == null ? null : scaleDown(Math.abs(maxdd), 3, 35),
        num(dd.volatility_pct) == null ? null : scaleDown(num(dd.volatility_pct)!, 3, 22),
        scaleUp(framework, 0, 3),
      );
    },
  },
  {
    label: "Operations & infra",
    score: (c) => {
      const op = sec(c, "operations_compliance");
      // Named service providers drive the base; DR/insurance are a small bonus
      // when disclosed (their absence isn't a failure). Breaches are penalised.
      const providers = [op.auditor, op.administrator, op.prime_broker, op.custodian, op.compliance_framework].filter(has).length;
      let s = providers === 0 ? 3.0 : scaleUp(providers, 1, 5);
      s += [op.disaster_recovery, op.insurance].filter(has).length * 0.25;
      if (op.has_mandate_breaches === true) s -= 1;
      if (op.has_risk_limit_breaches === true) s -= 1;
      if (op.has_sanctions_exposure === true) s -= 1.5;
      return s;
    },
  },
  {
    label: "Mandate fit",
    score: (c) => {
      const rs = sec(c, "return_skill"), ba = sec(c, "benchmark_activeness");
      const alpha = num(rs.alpha_annualized_pct) ?? num(rs.active_return_pct) ?? num(rs.excess_return_pct);
      const corr = num(ba.market_correlation);
      let s = blend(
        alpha == null ? null : scaleUp(alpha, 0, 15),
        num(ba.active_share_pct) == null ? null : scaleUp(num(ba.active_share_pct)!, 30, 90),
        corr == null ? null : scaleDown(Math.abs(corr), 0.1, 0.9),
      );
      const highFlags = (Array.isArray(c.analyst_flags) ? (c.analyst_flags as unknown[]) : [])
        .filter((f) => flagSeverity(String(f)) === "high").length;
      s -= Math.min(1.2, highFlags * 0.4);
      return s;
    },
  },
];

const scoreTone = (score: number): ScorecardCriterion["tone"] => (score >= 4.2 ? "green" : score >= 3.5 ? "violet" : "amber");

/** Dynamic committee scorecard for one candidate, derived from data.json. */
export function buildScorecard(query?: string): ScorecardPayload {
  const c = query ? resolveCandidateRecord(query) : null;
  if (!c) {
    throw new Error(`Scorecard needs a known candidate — couldn't resolve: ${query ?? "(none)"}. Available: ${candidateNames().join(", ")}.`);
  }

  const criteria: ScorecardCriterion[] = SCORE_CRITERIA.map((cr) => {
    const score = clampScore(cr.score(c.rec));
    return { label: cr.label, score, tone: scoreTone(score) };
  });
  const overall = clampScore(criteria.reduce((a, cr) => a + cr.score, 0) / criteria.length);

  const ranked = [...criteria].sort((a, b) => b.score - a.score);
  const best = ranked[0], worst = ranked[ranked.length - 1];
  const { recommendation, recommendationDetail } =
    overall >= 4.2
      ? { recommendation: "Advance to interview", recommendationDetail: `Strong on ${best.label.toLowerCase()}; confirm ${worst.label.toLowerCase()} at IC.` }
      : overall >= 3.4
        ? { recommendation: "Advance to deep-dive", recommendationDetail: `Promising on ${best.label.toLowerCase()}, but ${worst.label.toLowerCase()} needs diligence before interview.` }
        : { recommendation: "Monitor — not yet ready", recommendationDetail: `${worst.label} is the binding constraint; revisit once it improves.` };

  return { title: `${c.name} — interview readiness`, overall, criteria, recommendation, recommendationDetail };
}
