/** Portfolio analysis — factor regression + performance/risk/fund-fit cards.
 *  Backed by real precomputed renderer output (`GET /renderers/D1-1|D1-2|D1-3|D1-4b`)
 *  for candidates that have a completed analytics run (see
 *  `server/data/candidate_panels/`). Most candidates don't have one yet —
 *  this shows an explicit empty state rather than fabricating numbers. */
import { useRenderer } from "../../api/hooks";
import { LoadingState } from "../common/LoadingState";
import { ErrorState } from "../common/ErrorState";
import { fmtValue } from "../../lib/metricFormat";

interface FactorRow {
  factor: string;
  beta_63d: number | null;
  beta_252d: number | null;
  tstat: number | null;
  significance: string;
}

interface MetricRow {
  metric: string;
  label: string;
  value: number | null;
  unit: string;
  description: string;
  format: string;
  rag?: string;
}

interface FundFitRow {
  field: string;
  value: number | string | boolean;
}

interface Props {
  id: string;
}

function sigClass(sig: string): "y" | "m" | "n" {
  if (/^significant/i.test(sig)) return "y";
  if (/^marginal/i.test(sig)) return "m";
  return "n";
}

/** Metrics where sign maps to good/bad; everything else renders neutral. */
const GOOD_BAD_KEYS = new Set(["annualised_alpha", "information_ratio", "hit_rate_monthly"]);
const ALWAYS_RISK_KEYS = new Set(["max_drawdown", "var"]);

function toneClass(metric: string, value: number | null): string {
  if (value == null) return "";
  if (ALWAYS_RISK_KEYS.has(metric)) return "negv";
  if (GOOD_BAD_KEYS.has(metric)) return value >= 0 ? "pos" : "negv";
  return "";
}

const FUND_FIT_LABELS: Record<string, string> = {
  gap_fill_score: "Gap fill score",
  max_fund_correlation: "Max fund correlation",
  penalty_triggered: "Penalty triggered?",
  ens_impact: "ENS impact",
  fund_fit_rating: "Fund fit rating",
};

function fundFitDisplay(field: string, value: number | string | boolean): { text: string; tone: string } {
  if (field === "gap_fill_score" && typeof value === "number") return { text: `${value.toFixed(2)} / 1.0`, tone: value >= 0.5 ? "pos" : "negv" };
  if (field === "max_fund_correlation" && typeof value === "number") return { text: value.toFixed(2), tone: Math.abs(value) >= 0.6 ? "negv" : "" };
  if (field === "penalty_triggered") return { text: value ? "Yes (≥ 0.60)" : "No (< 0.60)", tone: value ? "negv" : "pos" };
  if (field === "ens_impact" && typeof value === "number") return { text: `${value >= 0 ? "+" : ""}${value.toFixed(2)}`, tone: value >= 0 ? "pos" : "negv" };
  if (field === "fund_fit_rating" && typeof value === "string") return { text: value, tone: /strong/i.test(value) ? "pos" : /weak|avoid/i.test(value) ? "negv" : "" };
  return { text: String(value), tone: "" };
}

const barPx = (v: number, maxAbs: number) => `${maxAbs > 0 ? Math.round((Math.abs(v) / maxAbs) * 190) : 0}px`;

export function PortfolioAnalysisSection({ id }: Props) {
  const factors = useRenderer<FactorRow>("D1-1", id);
  const performance = useRenderer<MetricRow>("D1-2", id);
  const risk = useRenderer<MetricRow>("D1-3", id);
  const fundFit = useRenderer<FundFitRow>("D1-4b", id);

  if (factors.loading || performance.loading || risk.loading || fundFit.loading) {
    return (
      <div id="portfolio" className="sec-body pa-view">
        <LoadingState label="Loading portfolio analysis…" />
      </div>
    );
  }
  if (factors.error || performance.error || risk.error || fundFit.error) {
    return (
      <div id="portfolio" className="sec-body pa-view">
        <ErrorState message={factors.error ?? performance.error ?? risk.error ?? fundFit.error ?? "Portfolio analysis unavailable"} />
      </div>
    );
  }

  const factorRows = factors.data?.rows;
  const hasRun = Array.isArray(factorRows);

  if (!hasRun) {
    return (
      <div id="portfolio" className="sec-body pa-view">
        <h3>Factor Regression — Submitted Portfolio</h3>
        <p className="note">
          No completed factor-regression / portfolio-analysis run on file for this candidate yet. Analytics runs are
          currently available for 2E Capital, Academy Investment Management, and Adelio Partners.
        </p>
      </div>
    );
  }

  const totalFactors = factorRows!.length;
  const sigCount = factorRows!.filter((f) => sigClass(f.significance) !== "n").length;
  const topFactors = [...factorRows!].sort((a, b) => Math.abs(b.beta_252d ?? 0) - Math.abs(a.beta_252d ?? 0)).slice(0, 12);
  const maxAbsBeta = Math.max(...topFactors.flatMap((f) => [Math.abs(f.beta_63d ?? 0), Math.abs(f.beta_252d ?? 0)]), 1e-9);

  const perfRows = performance.data?.rows ?? [];
  const riskRows = risk.data?.rows ?? [];
  const fitRows = fundFit.data?.rows ?? [];

  return (
    <div id="portfolio" className="sec-body pa-view">
      <h3>Factor Regression — Submitted Portfolio</h3>
      <p className="note">
        Run via completed analytics pipeline · top {topFactors.length} of {totalFactors} factors by |β 252d| ·{" "}
        {sigCount} statistically significant
      </p>
      <table className="data">
        <thead>
          <tr>
            <th>Factor</th>
            <th>B 63d vs 252d</th>
            <th className="r">B 63d</th>
            <th className="r">B 252d</th>
            <th className="r">T-stat</th>
            <th>Significance</th>
          </tr>
        </thead>
        <tbody>
          {topFactors.map((f) => (
            <tr key={f.factor}>
              <td>{f.factor}</td>
              <td>
                <span className="bpair">
                  <i className="b63" style={{ width: barPx(f.beta_63d ?? 0, maxAbsBeta) }} />
                  <i className="b252" style={{ width: barPx(f.beta_252d ?? 0, maxAbsBeta) }} />
                </span>
              </td>
              <td className="num">{f.beta_63d != null ? f.beta_63d.toFixed(3) : "—"}</td>
              <td className="num">{f.beta_252d != null ? f.beta_252d.toFixed(3) : "—"}</td>
              <td className="num">{f.tstat != null ? f.tstat.toFixed(1) : "—"}</td>
              <td>
                <span className={`sig ${sigClass(f.significance)}`}>{f.significance}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pa-cards">
        <div className="card pa-card">
          <div className="card-head">Performance</div>
          {perfRows.map((r) => (
            <div className="pa-row" key={r.metric}>
              <span className="pa-k">{r.label}</span>
              <span className={`pa-v ${toneClass(r.metric, r.value)}`}>{fmtValue(r.value, r.format)}</span>
            </div>
          ))}
        </div>
        <div className="card pa-card">
          <div className="card-head">Risk metrics</div>
          {riskRows.map((r) => (
            <div className="pa-row" key={r.metric}>
              <span className="pa-k">{r.label}</span>
              <span className={`pa-v ${toneClass(r.metric, r.value)}`}>{fmtValue(r.value, r.format)}</span>
            </div>
          ))}
        </div>
        <div className="card pa-card">
          <div className="card-head">Fund fit</div>
          {fitRows.map((r) => {
            const { text, tone } = fundFitDisplay(r.field, r.value);
            return (
              <div className="pa-row" key={r.field}>
                <span className="pa-k">{FUND_FIT_LABELS[r.field] ?? r.field}</span>
                <span className={`pa-v ${tone}`}>{text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
