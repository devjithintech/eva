import type { ArtifactKind, ArtifactPayload } from "../../agui/artifacts";

/**
 * "How to read this" explainers, one per artifact kind. Rendered at the top of
 * every result card by <ViewSummary/> so each view carries a short, consistent
 * guide to what it shows and how to read it. Static (not data-dependent) — the
 * per-answer numbers live in the view itself.
 */
export interface ViewSummary {
  /** One-line lead describing what the view plots. */
  intro: string;
  /** Bolded label + explanation, rendered as a bullet list. */
  points: { label: string; text: string }[];
  /** Optional closing "how to use it" note. */
  note?: string;
}

const pct1 = (v: number) => (v > 0 ? "+" : "") + v.toFixed(1) + "%";

/**
 * A data-aware intro line derived from the actual payload — this is what makes
 * each summary "dynamic": it states the real counts / leaders / scores the view
 * is showing, replacing the static intro. Falls back to the static intro when a
 * kind has nothing data-specific to say.
 */
export function dynamicIntro(p: ArtifactPayload): string | undefined {
  switch (p.kind) {
    case "opportunity_map":
      return `Plotting ${p.pool.candidates} candidates (${p.pool.funds} funds). Funnel: ${p.funnel.scored} scored → ${p.funnel.shortlisted} shortlisted → ${p.funnel.interview} in interview.`;
    case "candidate_pool": {
      const top = p.rows[0];
      const lead = top ? `${top.name}${top.cagr != null ? ` at ${pct1(top.cagr)}` : ""}` : "";
      return `${p.rows.length} funds ranked by CAGR${lead ? ` — ${lead} leads` : ""}.`;
    }
    case "comparison": {
      const metrics = p.sections.reduce((n, s) => n + s.rows.length, 0);
      return `Comparing ${p.columns.length} funds across ${metrics} metrics in ${p.sections.length} sections.`;
    }
    case "returns":
      return `${p.title.split(" · ")[0]} — ${p.years}-year track: CAGR ${p.cagr}, cumulative ${p.cumulative}, ${p.positiveMonths} positive months.`;
    case "benchmark_correlation":
      return `Correlation matrix across ${p.funds.length} peer funds.`;
    case "characteristics": {
      const c = p.candidate;
      return `${c.name} — ${c.strategyFamily.replace(/_/g, " ")}, AUM ${c.aum}, ${c.netExposure} net exposure.`;
    }
    case "analyst_flags":
      return `${p.total} analyst flag${p.total === 1 ? "" : "s"} — ${p.counts.high} high, ${p.counts.medium} medium, ${p.counts.low} low severity.`;
    case "scorecard": {
      const sorted = [...p.criteria].sort((a, b) => b.score - a.score);
      const best = sorted[0]?.label.toLowerCase();
      const worst = sorted[sorted.length - 1]?.label.toLowerCase();
      return `Overall ${p.overall}/5${best ? ` — strongest on ${best}, weakest on ${worst}` : ""}. ${p.recommendation}.`;
    }
    case "analysis":
      return p.summary; // already computed server-side from the data
    default:
      return undefined;
  }
}

export const VIEW_SUMMARIES: Record<ArtifactKind, ViewSummary> = {
  opportunity_map: {
    intro: "Plots investment candidates by performance and risk.",
    points: [
      { label: "Axes", text: "Horizontal tracks growth (CAGR); vertical tracks risk (drawdown) — higher up means lower risk." },
      { label: "Shortlist zone", text: "The shaded top-right box marks the best profile: high growth, low risk." },
      { label: "Data paths", text: "Each tail is a candidate's 3-year path; the arrow is where it sits now." },
      { label: "Colour", text: "Blue = shortlisted, green = strong but unshortlisted, grey = the general scored pool." },
    ],
    note: "Look for names trending toward the top-right — a convex profile that pairs higher growth with smaller historical losses.",
  },
  candidate_pool: {
    intro: "Ranks the candidate pool across the four headline metrics.",
    points: [
      { label: "Columns", text: "CAGR, Sharpe, alpha and max drawdown, side by side." },
      { label: "Order", text: "Sorted by CAGR, best first; funds that don't report a figure sink to the bottom." },
      { label: "Reading", text: "Greener is better and red is worse, so strong names stand out at a glance." },
    ],
    note: "Use it to spot the leaders before drilling into a single fund.",
  },
  comparison: {
    intro: "Compares funds head-to-head across every key dimension.",
    points: [
      { label: "Columns", text: "One fund per column — scroll right when several are compared." },
      { label: "Sections", text: "Metrics grouped into Profile, Performance, Risk, Exposure and Terms." },
      { label: "Gaps", text: "A dash (—) means that fund doesn't report the figure." },
    ],
    note: "Scan across any row to see which fund leads on that single metric.",
  },
  returns: {
    intro: "Shows a fund's trailing performance over the chosen window.",
    points: [
      { label: "Curve", text: "Growth of 100 for the fund versus its benchmark." },
      { label: "Calendar", text: "Year-by-year returns beneath the curve." },
      { label: "Stats", text: "CAGR, cumulative return, best/worst year and positive-month rate." },
    ],
    note: "Compare the fund line against the benchmark to judge how much value it added.",
  },
  benchmark_correlation: {
    intro: "Shows how the fund co-moves with a set of peers.",
    points: [
      { label: "Matrix", text: "Each cell is the correlation between two funds; the diagonal is blank." },
      { label: "Scale", text: "Higher (warmer) means they move together; lower means they diversify each other." },
    ],
    note: "Lower correlations to the book are what add diversification.",
  },
  characteristics: {
    intro: "A fund's profile at a glance.",
    points: [
      { label: "Facts", text: "AUM, strategy family, manager, currency, inception and vehicle." },
      { label: "Style DNA", text: "Tags describe how the fund invests; the primary ones are emphasised." },
    ],
    note: "Use it for a quick orientation before looking at performance or risk.",
  },
  analyst_flags: {
    intro: "The diligence watch-list for a fund, grouped by severity.",
    points: [
      { label: "Counts", text: "Tiles show how many high, medium and low flags were raised." },
      { label: "Order", text: "Flags are sorted severity-first; the top items are the ones to raise at IC." },
      { label: "Expand", text: "“Show all” reveals every flag beyond the top few." },
    ],
    note: "Severity is inferred from the flag text — treat it as a triage aid, not a verdict.",
  },
  scorecard: {
    intro: "Committee interview-readiness score across six criteria.",
    points: [
      { label: "Overall", text: "A single 1–5 score, averaged from the criteria below." },
      { label: "Criteria", text: "Track record, team, process, risk, operations and mandate fit, each toned green / violet / amber." },
      { label: "Call", text: "A recommendation with the strongest and weakest area called out." },
    ],
    note: "Scores are derived from reported data — an indicative screen, not a formal committee vote.",
  },
  analysis: {
    intro: "A dynamic, multi-metric analysis built for open-ended questions.",
    points: [
      { label: "Verdict", text: "When funds are compared, the winner and why are called out up top." },
      { label: "Score", text: "Each fund gets a 0–100 composite across the metrics you asked about." },
      { label: "Detail", text: "The table and bars show every fund and metric behind the score." },
    ],
    note: "Metrics are scored server-side from real data, so the numbers stay trustworthy.",
  },
  // The document view is self-contained (its own answer above the component), so
  // this explainer isn't rendered — it's here only to satisfy the registry.
  document: {
    intro: "A written answer when no specific chart or table fits the question.",
    points: [{ label: "Sections", text: "Key points, an optional callout, and collapsible detail." }],
  },
};
