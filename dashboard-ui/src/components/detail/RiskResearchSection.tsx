/** Risk research — portfolio risk, exposure, concentration, liquidity, risk
 *  decomposition, style-factor decomposition, sector/industry/country/region
 *  breakdowns, position summary, and stress scenarios. Backed by real
 *  precomputed renderer output (`GET /renderers/D1-10|11|12|13|14|15|16|17|18`)
 *  for candidates that have a completed analytics run (see
 *  `server/data/candidate_panels/`). Most candidates don't have one yet —
 *  this shows an explicit empty state rather than fabricating numbers. */
import { useState } from "react";
import { useRenderer } from "../../api/hooks";
import { LoadingState } from "../common/LoadingState";
import { ErrorState } from "../common/ErrorState";
import { fmtValue, pctFmt } from "../../lib/metricFormat";

interface MetricRow {
  metric: string;
  label: string;
  value: number | null;
  unit: string;
  description: string;
  format: string | null;
}

interface ExposureRow {
  direction: string;
  count: number;
  gross_pct: number;
}

interface ConcentrationRow {
  metric: string;
  gross_pct: number;
}

interface LiquidityRow {
  bucket: string;
  gross_pct: number;
  count: number;
}

interface ClassRow {
  class: string;
  variance: number;
  pct_of_total: number;
}

interface FactorDecompRow {
  factor: string;
  vol_pct: number;
  net_pct: number;
  risk_pct: number;
  portfolio_beta: number;
  variance: number;
  pct_of_total: number;
}

interface CategoryRow {
  category: string;
  gross_pct: number;
  net_pct: number;
  risk_pct: number;
  count: number;
}

/** D1-11's row shape depends on `kind`: notional/liquidity kinds carry
 *  market_value/abs_weight, risk kinds carry weight/total_risk_pct instead. */
interface PositionRow {
  instrument: string;
  market_value?: number;
  abs_weight?: number;
  weight?: number;
  total_risk_pct?: number;
  sector?: string | null;
  days_to_liquidate?: number | null;
}

interface StressRow {
  scenario: string;
  pnl_pct: number;
}

interface Props {
  id: string;
}

/** Sum a set of fractions into a synthetic "Total" row for a category table. */
function withTotal(rows: CategoryRow[], totalLabel = "Total"): CategoryRow[] {
  if (!rows.length) return rows;
  const total = rows.reduce(
    (acc, r) => ({
      category: totalLabel,
      gross_pct: acc.gross_pct + r.gross_pct,
      net_pct: acc.net_pct + r.net_pct,
      risk_pct: acc.risk_pct + r.risk_pct,
      count: acc.count + r.count,
    }),
    { category: totalLabel, gross_pct: 0, net_pct: 0, risk_pct: 0, count: 0 },
  );
  return [total, ...rows];
}

function pctCell(v: number) {
  const neg = v < 0;
  return <td className={`num${neg ? " neg" : ""}`}>{neg ? `(${Math.abs(v * 100).toFixed(2)}%)` : `${(v * 100).toFixed(2)}%`}</td>;
}

function CategoryTable({ rows, nameLabel }: { rows: CategoryRow[]; nameLabel: string }) {
  return (
    <table className="data">
      <thead>
        <tr>
          <th>{nameLabel}</th>
          <th className="r">% Gross</th>
          <th className="r">% Net</th>
          <th className="r">% Risk</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.category} className={r.category.startsWith("Total") ? "tot" : ""}>
            <td>{r.category}</td>
            {pctCell(r.gross_pct)}
            {pctCell(r.net_pct)}
            {pctCell(r.risk_pct)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const decompBar = (pct: number) => `${Math.max(6, Math.round(pct * 164))}px`;
const styleBar = (risk: number, maxAbs: number) => `${Math.max(6, Math.round((maxAbs > 0 ? Math.abs(risk) / maxAbs : 0) * 190))}px`;
const stressMag = (pct: number, maxAbs: number) => `${Math.max(1, Math.round((maxAbs > 0 ? Math.abs(pct) / maxAbs : 0) * 152))}px`;

function StressGraph({ rows }: { rows: { name: string; delta: number }[] }) {
  const sorted = [...rows].sort((a, b) => b.delta - a.delta);
  const W = 900;
  const rowH = 28;
  const T = 16;
  const chartLeft = 300;
  const chartRight = 860;
  const barMinX = chartLeft + 90;
  const barMaxX = chartRight - 60;
  const maxPos = Math.max(0.01, ...sorted.map((r) => Math.max(r.delta, 0)));
  const maxNeg = Math.max(0.01, ...sorted.map((r) => Math.max(-r.delta, 0)));
  const total = maxPos + maxNeg;
  const zeroX = barMinX + (maxNeg / total) * (barMaxX - barMinX);
  const pxPerUnit = (barMaxX - barMinX) / total;
  const chartBottom = T + sorted.length * rowH;
  const H = chartBottom + 42;

  const step = Math.max(0.01, Math.round(((maxPos + maxNeg) / 8) * 100) / 100);
  const tickMin = Math.ceil(-maxNeg / step) * step;
  const tickMax = Math.floor(maxPos / step) * step;
  const ticks: number[] = [];
  for (let t = tickMin; t <= tickMax + 1e-9; t += step) ticks.push(Math.round(t * 1000) / 1000);

  return (
    <div className="stress-graph">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Stress scenarios diverging bar chart">
        <line x1={zeroX} y1={T} x2={zeroX} y2={chartBottom} className="sv-zero" />
        {sorted.map((r, i) => {
          const y = T + i * rowH + rowH / 2;
          const barW = Math.max(1, Math.abs(r.delta) * pxPerUnit);
          const pos = r.delta >= 0;
          const barX = pos ? zeroX : zeroX - barW;
          return (
            <g key={r.name}>
              <text x={chartLeft - 12} y={y + 4} textAnchor="end" className="sv-lbl">
                {r.name}
              </text>
              <rect x={barX} y={y - 5} width={barW} height={10} className={`sv-bar ${pos ? "pos" : "neg"}`} />
              <text x={pos ? barX + barW + 8 : barX - 8} y={y + 4} textAnchor={pos ? "start" : "end"} className={`sv-val ${pos ? "pos" : "neg"}`}>
                {pos ? "+" : "−"}
                {Math.abs(r.delta).toFixed(3)}%
              </text>
            </g>
          );
        })}
        <line x1={chartLeft - 10} y1={chartBottom + 8} x2={chartRight} y2={chartBottom + 8} className="sv-axis" />
        {ticks.map((t) => {
          const x = zeroX + t * pxPerUnit;
          return (
            <g key={t}>
              <line x1={x} y1={chartBottom + 8} x2={x} y2={chartBottom + 2} className="sv-axis" />
              <text x={x} y={chartBottom + 24} textAnchor="middle" className="sv-tick">
                {t > 0 ? "+" : ""}
                {t.toFixed(3)}%
              </text>
            </g>
          );
        })}
        <text x={zeroX} y={H - 4} textAnchor="middle" className="sv-ax">
          Δ (% gross)
        </text>
      </svg>
    </div>
  );
}

export function RiskResearchSection({ id }: Props) {
  const [stressView, setStressView] = useState<"graph" | "list">("graph");

  // D1-15 doubles as the probe for whether this candidate has a completed
  // analytics run at all — most don't. The other 15 panels skip their fetch
  // (null fund id) until it confirms a run, so the common no-run case costs
  // one request instead of sixteen.
  const portfolioRisk = useRenderer<MetricRow>("D1-15", id);
  const hasRun = Array.isArray(portfolioRisk.data?.rows) && portfolioRisk.data.rows.length > 0;
  const runId = hasRun ? id : null;

  const exposure = useRenderer<ExposureRow>("D1-13", runId);
  const concentration = useRenderer<ConcentrationRow>("D1-14", runId);
  const liquidity = useRenderer<LiquidityRow>("D1-17", runId);
  const byClass = useRenderer<ClassRow>("D1-12", runId, undefined, { axis: "by_class" });
  const byFactor = useRenderer<FactorDecompRow>("D1-12", runId, undefined, { axis: "by_factor" });
  const sector = useRenderer<CategoryRow>("D1-10", runId, undefined, { axis: "sector" });
  const industry = useRenderer<CategoryRow>("D1-10", runId, undefined, { axis: "industry" });
  const country = useRenderer<CategoryRow>("D1-10", runId, undefined, { axis: "country" });
  const market = useRenderer<CategoryRow>("D1-18", runId);
  const largestRisk = useRenderer<PositionRow>("D1-11", runId, undefined, { kind: "largest_by_risk" });
  const smallestRisk = useRenderer<PositionRow>("D1-11", runId, undefined, { kind: "smallest_by_risk" });
  const largestNotional = useRenderer<PositionRow>("D1-11", runId, undefined, { kind: "largest_by_notional" });
  const smallestNotional = useRenderer<PositionRow>("D1-11", runId, undefined, { kind: "smallest_by_notional" });
  const leastLiquid = useRenderer<PositionRow>("D1-11", runId, undefined, { kind: "least_liquid" });
  const stress = useRenderer<StressRow>("D1-16", runId);

  const resources = [
    portfolioRisk, exposure, concentration, liquidity, byClass, byFactor,
    sector, industry, country, market, largestRisk, smallestRisk,
    largestNotional, smallestNotional, leastLiquid, stress,
  ];

  if (resources.some((r) => r.loading)) {
    return (
      <div id="risk" className="sec-body">
        <LoadingState label="Loading risk research…" />
      </div>
    );
  }
  const firstError = resources.find((r) => r.error)?.error;
  if (firstError) {
    return (
      <div id="risk" className="sec-body">
        <ErrorState message={firstError} />
      </div>
    );
  }

  if (!hasRun) {
    return (
      <div id="risk" className="sec-body">
        <h3>Portfolio risk</h3>
        <p className="note">
          No completed risk-research run on file for this candidate yet. Analytics runs are currently available for
          2E Capital, Academy Investment Management, and Adelio Partners.
        </p>
      </div>
    );
  }

  const exposureAttrs = exposure.data?.attrs ?? {};
  const gross = typeof exposureAttrs.gross === "number" ? exposureAttrs.gross : null;
  const exposureRows = exposure.data?.rows ?? [];
  const concentrationRows = concentration.data?.rows ?? [];
  const liquidityRows = liquidity.data?.rows ?? [];
  const weightedDaysToLiquidate = liquidity.data?.attrs?.weighted_days_to_liquidate as number | null | undefined;
  const classRows = byClass.data?.rows ?? [];
  const totalVariance = classRows.reduce((a, r) => a + r.pct_of_total, 0) || 1;
  const factorRows = byFactor.data?.rows ?? [];
  const topFactors = [...factorRows].sort((a, b) => Math.abs(b.risk_pct) - Math.abs(a.risk_pct)).slice(0, 12);
  const maxAbsFactorRisk = Math.max(...topFactors.map((f) => Math.abs(f.risk_pct)), 1e-9);
  const stressRows = (stress.data?.rows ?? []).map((r) => ({ name: r.scenario, delta: r.pnl_pct * 100 }));
  const maxAbsStress = Math.max(...stressRows.map((r) => Math.abs(r.delta)), 1e-9);
  const worstScenario = stress.data?.attrs?.worst as string | undefined;
  const worstPnl = stress.data?.attrs?.worst_pnl_pct as number | undefined;

  const positionCard = (title: string, rows: PositionRow[], metric: "weight" | "risk" | "notional" | "liquidity") => (
    <div className="card">
      <div className="card-head">{title}</div>
      {rows.length === 0 && (
        <p className="note" style={{ fontStyle: "italic", margin: 0 }}>
          No positions reported.
        </p>
      )}
      {rows.map((p) => {
        const w = p.abs_weight ?? p.weight ?? 0;
        const short = (p.market_value ?? 0) < 0;
        return (
          <div className="pa-row" key={p.instrument}>
            <span className="pa-k">{p.instrument}</span>
            <span className="pa-v">
              {metric === "risk" && p.total_risk_pct != null && (
                <span className={p.total_risk_pct < 0 ? "negv" : "pos"}>{pctFmt(p.total_risk_pct)}</span>
              )}
              {metric === "risk" && ` · ${pctFmt(w)}`}
              {metric === "notional" && (short ? <span className="negv">({pctFmt(w)})</span> : pctFmt(w))}
              {metric === "liquidity" && `${pctFmt(w)} · ${p.days_to_liquidate ?? "—"}d`}
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div id="risk" className="sec-body">
      <div className="rr-fchips">
        <span className="rr-fchip">
          <b>Gross</b>
          {gross != null ? `$${Math.round(gross).toLocaleString("en-US")}` : "—"}
        </span>
        <span className="rr-fchip">
          <b>Positions</b>
          {(exposureRows.find((r) => r.direction === "Net") ?? exposureRows[0])?.count ?? "—"}
        </span>
        <span className="rr-fchip">
          <b>Model</b>Internal factor risk engine
        </span>
      </div>

      <h3>Portfolio risk</h3>
      <p className="note">From this candidate's completed analytics run · factor + specific risk decomposition</p>
      <div className="rr-stats">
        {(portfolioRisk.data?.rows ?? []).map((r) => (
          <div className="rr-stat" key={r.metric}>
            <div className={`val${(r.value ?? 0) < 0 ? " neg" : ""}`}>{fmtValue(r.value, r.format ?? ".2f")}</div>
            <div className="lbl">{r.label}</div>
          </div>
        ))}
      </div>

      <div className="rr-cards3">
        <div className="card">
          <div className="card-head">Exposure</div>
          {exposureRows.map((r) => (
            <div className="pa-row" key={r.direction}>
              <span className="pa-k">
                {r.direction} ({r.count})
              </span>
              <span className={`pa-v ${r.gross_pct < 0 ? "negv" : r.direction === "Long" ? "pos" : ""}`}>
                {r.gross_pct < 0 ? `(${pctFmt(Math.abs(r.gross_pct))})` : pctFmt(r.gross_pct)}
              </span>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-head">Concentration</div>
          {concentrationRows.map((r) => (
            <div className="pa-row" key={r.metric}>
              <span className="pa-k">{r.metric}</span>
              <span className="pa-v">{pctFmt(r.gross_pct)}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-head">Liquidity ladder</div>
          {liquidityRows.map((r) => (
            <div className="pa-row" key={r.bucket}>
              <span className="pa-k">{r.bucket.replace("D", " days").replace("<1 days", "< 1 day")}</span>
              <span className="pa-v">{pctFmt(r.gross_pct, 0)}</span>
            </div>
          ))}
          {weightedDaysToLiquidate != null && (
            <div className="pa-row">
              <span className="pa-k">Weighted days to liquidate</span>
              <span className="pa-v">{weightedDaysToLiquidate.toFixed(1)}d</span>
            </div>
          )}
        </div>
      </div>

      {classRows.length > 0 && (
        <>
          <h3>Risk decomposition</h3>
          <p className="note">% of total predicted variance</p>
          <div className="rr-decomp">
            {classRows.map((c) => (
              <div className="rr-cell" key={c.class}>
                <div className="lbl">{c.class}</div>
                <div className="val2">{pctFmt(c.pct_of_total / totalVariance)}</div>
                <span className="rbar" style={{ width: decompBar(c.pct_of_total / totalVariance) }} />
              </div>
            ))}
          </div>
        </>
      )}

      {topFactors.length > 0 && (
        <>
          <h3>Style factor decomposition</h3>
          <p className="note">
            Top {topFactors.length} of {factorRows.length} factors by |% of total risk|
          </p>
          <table className="data">
            <thead>
              <tr>
                <th>Factor</th>
                <th className="r">Vol</th>
                <th className="r">% Net</th>
                <th className="r">% Risk</th>
                <th>Visual</th>
              </tr>
            </thead>
            <tbody>
              {topFactors.map((f) => (
                <tr key={f.factor}>
                  <td>{f.factor}</td>
                  <td className="num">{f.vol_pct.toFixed(2)}%</td>
                  {pctCell(f.net_pct)}
                  {pctCell(f.risk_pct)}
                  <td>
                    <span className="rbar il" style={{ width: styleBar(f.risk_pct, maxAbsFactorRisk) }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h3>Sector decomposition</h3>
      <p className="note">% risk · ordered by contribution</p>
      <div className="rr-cols">
        <div>
          <h4>Sector decomposition</h4>
          <CategoryTable rows={withTotal(sector.data?.rows ?? [])} nameLabel="Sector" />
        </div>
        <div>
          <h4>Top 5 industry</h4>
          <CategoryTable rows={withTotal([...(industry.data?.rows ?? [])].sort((a, b) => b.gross_pct - a.gross_pct).slice(0, 5), "Total (top 5)")} nameLabel="Industry" />
          <h4>Top 5 country</h4>
          <CategoryTable rows={withTotal([...(country.data?.rows ?? [])].sort((a, b) => b.gross_pct - a.gross_pct).slice(0, 5), "Total (top 5)")} nameLabel="Country" />
          <h4>Top 5 market</h4>
          <CategoryTable rows={withTotal([...(market.data?.rows ?? [])].sort((a, b) => b.gross_pct - a.gross_pct).slice(0, 5), "Total (top 5)")} nameLabel="Market" />
        </div>
      </div>

      <h3>Position summary</h3>
      <p className="note">Largest / smallest by risk and weight · least liquid</p>
      <div className="rr-cards3">
        {positionCard("Largest risk contributors", largestRisk.data?.rows ?? [], "risk")}
        {positionCard("Smallest risk contributors", smallestRisk.data?.rows ?? [], "risk")}
        {positionCard("Largest holdings (by % gross)", largestNotional.data?.rows ?? [], "notional")}
        {positionCard("Smallest holdings (most short)", smallestNotional.data?.rows ?? [], "notional")}
        {positionCard("Top 5 least liquid", leastLiquid.data?.rows ?? [], "liquidity")}
      </div>

      <h3>
        Stress scenarios
        <span className="seg">
          <button type="button" className={stressView === "graph" ? "on" : ""} onClick={() => setStressView("graph")}>
            Graph
          </button>
          <button type="button" className={stressView === "list" ? "on" : ""} onClick={() => setStressView("list")}>
            List
          </button>
        </span>
      </h3>
      <p className="note">Hypothetical P&amp;L under {stressRows.length} historical regime episodes · % of gross</p>
      {stressView === "graph" ? (
        <StressGraph rows={stressRows} />
      ) : (
        <table className="data">
          <thead>
            <tr>
              <th>Scenario</th>
              <th className="r">Δ (% gross)</th>
              <th>Magnitude</th>
            </tr>
          </thead>
          <tbody>
            {[...stressRows].sort((a, b) => b.delta - a.delta).map((s) => (
              <tr key={s.name}>
                <td>{s.name}</td>
                <td className={`num ${s.delta < 0 ? "neg" : "pos"}`}>{s.delta < 0 ? `(${Math.abs(s.delta).toFixed(3)}%)` : `+${s.delta.toFixed(3)}%`}</td>
                <td>
                  <span className={`mag ${s.delta < 0 ? "negm" : "pos"}`} style={{ width: stressMag(s.delta, maxAbsStress) }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {worstScenario && (
        <p className="note rr-foot">
          Worst-case scenario on file is {worstScenario} ({((worstPnl ?? 0) * 100).toFixed(3)}% of gross).
        </p>
      )}
    </div>
  );
}
