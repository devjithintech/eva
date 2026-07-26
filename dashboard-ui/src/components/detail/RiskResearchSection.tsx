import { useState } from "react";

/** Risk research — the design reference shows a full third-party risk-model
 *  decomposition (predicted vol/beta, style/sector/country risk splits,
 *  stress-scenario replays, position summary, provenance) with no equivalent
 *  field anywhere in this dataset. Intentionally static/illustrative, same
 *  rationale as PortfolioAnalysisSection — shows the intended shape rather
 *  than fabricating specific numbers per real candidate. */

const DECOMP: { label: string; pct: number }[] = [
  { label: "Residual", pct: 84.57 },
  { label: "Style", pct: 8.7 },
  { label: "Market", pct: 0.6 },
  { label: "Country", pct: 1.08 },
  { label: "Currency", pct: 0.15 },
  { label: "Industry", pct: 4.9 },
];
const decompBar = (pct: number) => `${Math.max(6, Math.round(pct * 1.64))}px`;

const STYLE_FACTORS: { name: string; vol: number; net: number; risk: number }[] = [
  { name: "Size", vol: 3.56, net: 20.56, risk: 4.82 },
  { name: "Value", vol: 1.38, net: -23.55, risk: 2.45 },
  { name: "Market sensitivity", vol: 4.19, net: 10.35, risk: -1.5 },
  { name: "Volatility", vol: 3.79, net: -7.58, risk: 0.94 },
  { name: "Leverage", vol: 0.89, net: -21.28, risk: 0.69 },
  { name: "Profitability", vol: 1.04, net: 17.21, risk: 0.5 },
  { name: "Dividend yield", vol: 0.91, net: -7.82, risk: 0.36 },
  { name: "Growth", vol: 0.69, net: 6.7, risk: 0.18 },
  { name: "Exchange rate sensitivity", vol: 0.83, net: 8.31, risk: 0.09 },
  { name: "Earnings yield", vol: 1.38, net: 4.83, risk: 0.07 },
  { name: "Liquidity", vol: 1.67, net: -1.25, risk: 0.06 },
  { name: "Medium-term momentum", vol: 2.59, net: 1.28, risk: 0.05 },
  { name: "Short-term momentum", vol: 2.3, net: 0.04, risk: 0.0 },
];
const styleBar = (risk: number) => `${Math.max(6, Math.round(Math.abs(risk) * 31))}px`;

type SectorRow = { name: string; gross: number; net: number; risk: number };
const SECTORS: SectorRow[] = [
  { name: "Total", gross: 100.0, net: -2.65, risk: 4.9 },
  { name: "Industrials", gross: 33.53, net: -2.65, risk: 1.59 },
  { name: "Health care", gross: 18.14, net: 0.49, risk: 1.41 },
  { name: "Financials", gross: 12.5, net: 0.74, risk: 0.83 },
  { name: "Consumer discretionary", gross: 4.9, net: -1.96, risk: 0.58 },
  { name: "Consumer staples", gross: 10.69, net: 2.84, risk: 0.36 },
  { name: "Information technology", gross: 9.71, net: -0.39, risk: 0.19 },
  { name: "Materials", gross: 6.62, net: 2.21, risk: -0.16 },
  { name: "Real estate", gross: 3.92, net: -3.92, risk: 0.1 },
];
const TOP_INDUSTRY: SectorRow[] = [
  { name: "Total (top 5)", gross: 13.73, net: -2.94, risk: 3.46 },
  { name: "Health care equipment & supplies", gross: 6.13, net: 4.66, risk: 1.89 },
  { name: "Banks", gross: 2.7, net: -2.7, risk: 1.13 },
  { name: "Health care technology", gross: 1.47, net: -1.47, risk: -0.54 },
  { name: "Auto components", gross: 1.96, net: -1.96, risk: 0.53 },
  { name: "Trading companies & distributors", gross: 1.47, net: -1.47, risk: 0.45 },
];
const TOP_COUNTRY: SectorRow[] = [
  { name: "Total", gross: 100.0, net: -2.65, risk: 1.08 },
  { name: "Denmark", gross: 2.94, net: 2.94, risk: 0.65 },
  { name: "Switzerland", gross: 97.06, net: -5.59, risk: 0.43 },
];
const TOP_MARKET: SectorRow[] = [
  { name: "Total", gross: 100.0, net: -2.65, risk: 0.6 },
  { name: "Western Europe ex UK", gross: 100.0, net: -2.65, risk: 0.6 },
];

const LARGEST_RISK: { name: string; risk: number; weight: number }[] = [
  { name: "BQE Cant Vaudoise", risk: -2.7, weight: 5.34 },
  { name: "Lonza Group AG", risk: 3.43, weight: 4.16 },
  { name: "Docmorris AG", risk: -0.74, weight: 3.88 },
  { name: "Belimo Holding AG", risk: 2.94, weight: 3.34 },
  { name: "DSV A/S", risk: 2.94, weight: 3.26 },
];
const SMALLEST_RISK: { name: string; weight: number; risk: number }[] = [
  { name: "Baloise Holding AG", weight: 0.98, risk: -0.51 },
  { name: "Vontobel Hldg AG", weight: 0.98, risk: -0.25 },
  { name: "Bystronic AG", weight: 0.98, risk: -0.23 },
  { name: "Interroll Hldg AG", weight: 0.49, risk: -0.09 },
  { name: "Holcim Ltd", weight: 2.45, risk: -0.08 },
];
const LARGEST_HOLDINGS: { name: string; weight: number; risk: number }[] = [
  { name: "Lonza Group AG", weight: 3.43, risk: 4.16 },
  { name: "VZ Holding AG", weight: 3.19, risk: 2.76 },
  { name: "DSV A/S", weight: 2.94, risk: 3.26 },
  { name: "Belimo Holding AG", weight: 2.94, risk: 3.34 },
  { name: "Holcim Ltd", weight: 2.45, risk: -0.08 },
];
const SMALLEST_HOLDINGS: { name: string; weight: number; risk: number }[] = [
  { name: "BQE Cant Vaudoise", weight: -2.7, risk: 5.34 },
  { name: "Swiss Prime Site", weight: -2.45, risk: 2.38 },
  { name: "SFS Group AG", weight: -1.96, risk: 2.09 },
  { name: "Tecan Group AG", weight: -1.96, risk: 2.68 },
  { name: "Siegfried Hldg AG", weight: -1.96, risk: 2.87 },
];
const LEAST_LIQUID: { name: string; weight: number; days: number }[] = [
  { name: "Hochdorf Holding", weight: 0.49, days: 102 },
  { name: "Starrag Group", weight: 0.49, days: 33 },
  { name: "Kudelski SA", weight: 0.74, days: 26 },
  { name: "Orell Fuessli AG", weight: 0.49, days: 20 },
  { name: "Molecular Partners", weight: 0.74, days: 18 },
];

const STRESS: { name: string; delta: number }[] = [
  { name: "COVID snap (Mar '20)", delta: 1.85 },
  { name: "Hedge fund sell-off (Jan '16)", delta: 0.92 },
  { name: "HF sell-off (Oct–Nov '18)", delta: 0.45 },
  { name: "LH unwind (Jan–Feb '16)", delta: 0.3 },
  { name: "Market hedge fund selloff", delta: 0.85 },
  { name: "Market selloff", delta: 0.2 },
  { name: "Mkt sell-off (Fall '18)", delta: 0.6 },
  { name: "MOpocalypse (Sept '19)", delta: 0.4 },
  { name: "MOversal (Nov '17)", delta: 0.15 },
  { name: "Santa slump ('18)", delta: 0.55 },
  { name: "Shocktober ('18)", delta: 0.35 },
  { name: "STONKS! Wednesday", delta: 0.25 },
  { name: "UpStress", delta: -0.85 },
  { name: "Volpocalypse (Feb '18)", delta: 0.5 },
];
const stressMag = (delta: number) => `${Math.round(Math.abs(delta) * 152)}px`;

function pctCell(v: number) {
  const neg = v < 0;
  return (
    <td className={`num${neg ? " neg" : ""}`}>
      {neg ? `(${Math.abs(v).toFixed(2)}%)` : `${v.toFixed(2)}%`}
    </td>
  );
}

function SectorTable({ rows, nameLabel }: { rows: SectorRow[]; nameLabel: string }) {
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
          <tr key={r.name} className={r.name.startsWith("Total") ? "tot" : ""}>
            <td>{r.name}</td>
            {pctCell(r.gross)}
            {pctCell(r.net)}
            {pctCell(r.risk)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StressGraph({ rows }: { rows: { name: string; delta: number }[] }) {
  const sorted = [...rows].sort((a, b) => b.delta - a.delta);
  const W = 900;
  const rowH = 28;
  const T = 16;
  const chartLeft = 300;
  const chartRight = 860;
  const barMinX = chartLeft + 90; // gutter for the negative-bar value label
  const barMaxX = chartRight - 60; // gutter for the positive-bar value label
  const maxPos = Math.max(0.01, ...sorted.map((r) => Math.max(r.delta, 0)));
  const maxNeg = Math.max(0.01, ...sorted.map((r) => Math.max(-r.delta, 0)));
  const total = maxPos + maxNeg;
  const zeroX = barMinX + (maxNeg / total) * (barMaxX - barMinX);
  const pxPerUnit = (barMaxX - barMinX) / total;
  const chartBottom = T + sorted.length * rowH;
  const H = chartBottom + 42;

  const step = 0.5;
  const tickMin = Math.ceil(-maxNeg / step) * step;
  const tickMax = Math.floor(maxPos / step) * step;
  const ticks: number[] = [];
  for (let t = tickMin; t <= tickMax + 1e-9; t += step) ticks.push(Math.round(t * 100) / 100);

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
                {Math.abs(r.delta).toFixed(2)}%
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
                {t.toFixed(1)}%
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

export function RiskResearchSection() {
  const [stressView, setStressView] = useState<"graph" | "list">("graph");

  return (
    <section id="riskresearch" className="sec">
      <div className="sec-head">
        <span className="sec-ic">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 14l3.5-3.5" />
            <path d="M20.5 15.5a8.5 8.5 0 1 0-17 0" />
          </svg>
        </span>
        <h2>Risk research</h2>
      </div>
      <div className="sec-body">
        <div className="rr-fchips">
          <span className="rr-fchip">
            <b>Gross</b>51,000,000
          </span>
          <span className="rr-fchip">
            <b>Date</b>5/19/2023
          </span>
          <span className="rr-fchip">
            <b>Model</b>WW4AxiomaSH
          </span>
        </div>

        <h3>Portfolio risk</h3>
        <p className="note">Illustrative · Axioma Worldwide 4 — short-horizon factor risk model — no third-party risk feed is wired up for individual candidates yet.</p>
        <div className="rr-stats">
          <div className="rr-stat">
            <div className="val">3.13%</div>
            <div className="lbl">Predicted vol</div>
          </div>
          <div className="rr-stat">
            <div className="val neg">(0.01)</div>
            <div className="lbl">Predicted MXWO beta</div>
          </div>
          <div className="rr-stat">
            <div className="val">0.07</div>
            <div className="lbl">Historical beta</div>
          </div>
          <div className="rr-stat">
            <div className="val">0.00</div>
            <div className="lbl">Predicted beta</div>
          </div>
        </div>

        <div className="rr-cards3">
          <div className="card">
            <div className="card-head">Exposure</div>
            <div className="pa-row">
              <span className="pa-k">Net (73 positions)</span>
              <span className="pa-v negv">(2.65%)</span>
            </div>
            <div className="pa-row">
              <span className="pa-k">Long (28)</span>
              <span className="pa-v pos">48.68%</span>
            </div>
            <div className="pa-row">
              <span className="pa-k">Short (45)</span>
              <span className="pa-v negv">(51.32%)</span>
            </div>
          </div>
          <div className="card">
            <div className="card-head">Concentration</div>
            <div className="pa-row">
              <span className="pa-k">Top 5</span>
              <span className="pa-v">15.69%</span>
            </div>
            <div className="pa-row">
              <span className="pa-k">Top 10</span>
              <span className="pa-v">28.43%</span>
            </div>
            <div className="pa-row">
              <span className="pa-k">Hedge / Other</span>
              <span className="pa-v">0.00%</span>
            </div>
          </div>
          <div className="card">
            <div className="card-head">Liquidity ladder</div>
            <div className="pa-row">
              <span className="pa-k">&lt; 1 day</span>
              <span className="pa-v">59%</span>
            </div>
            <div className="pa-row">
              <span className="pa-k">1–3 days</span>
              <span className="pa-v">24%</span>
            </div>
            <div className="pa-row">
              <span className="pa-k">3–5 days</span>
              <span className="pa-v">5%</span>
            </div>
            <div className="pa-row">
              <span className="pa-k">5–10 days</span>
              <span className="pa-v">6%</span>
            </div>
            <div className="pa-row">
              <span className="pa-k">10–20 days</span>
              <span className="pa-v">3%</span>
            </div>
            <div className="pa-row">
              <span className="pa-k">20–30 days</span>
              <span className="pa-v">1%</span>
            </div>
            <div className="pa-row">
              <span className="pa-k">30–60 / 90–180 days</span>
              <span className="pa-v">0%</span>
            </div>
          </div>
        </div>

        <h3>Risk decomposition</h3>
        <p className="note">% of total portfolio variance</p>
        <div className="rr-decomp">
          {DECOMP.map((d) => (
            <div className="rr-cell" key={d.label}>
              <div className="lbl">{d.label}</div>
              <div className="val2">{d.pct.toFixed(2)}%</div>
              <span className="rbar" style={{ width: decompBar(d.pct) }} />
            </div>
          ))}
        </div>

        <h3>Style factor decomposition</h3>
        <p className="note">Total style risk 8.70% · ordered by % of total risk</p>
        <table className="data">
          <thead>
            <tr>
              <th>Style factor</th>
              <th className="r">Vol</th>
              <th className="r">% Net</th>
              <th className="r">% Risk</th>
              <th>Visual</th>
            </tr>
          </thead>
          <tbody>
            {STYLE_FACTORS.map((f) => (
              <tr key={f.name}>
                <td>{f.name}</td>
                <td className="num">{f.vol.toFixed(2)}%</td>
                {pctCell(f.net)}
                {pctCell(f.risk)}
                <td>
                  <span className="rbar il" style={{ width: styleBar(f.risk) }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>Sector decomposition</h3>
        <p className="note">% risk · ordered by contribution</p>
        <div className="rr-cols">
          <div>
            <h4>Sector decomposition</h4>
            <SectorTable rows={SECTORS} nameLabel="Sector" />
          </div>
          <div>
            <h4>Top 5 industry</h4>
            <SectorTable rows={TOP_INDUSTRY} nameLabel="Industry" />
            <h4>Top 5 country</h4>
            <SectorTable rows={TOP_COUNTRY} nameLabel="Country" />
            <h4>Top 5 market</h4>
            <SectorTable rows={TOP_MARKET} nameLabel="Market" />
          </div>
        </div>

        <h3>Position summary</h3>
        <p className="note">Largest / smallest by risk and weight · least liquid</p>
        <div className="rr-cards3">
          <div className="card">
            <div className="card-head">Largest risk contributors</div>
            {LARGEST_RISK.map((p) => (
              <div className="pa-row" key={p.name}>
                <span className="pa-k">{p.name}</span>
                <span className="pa-v">
                  <span className={p.risk < 0 ? "negv" : "pos"}>{p.risk < 0 ? `(${Math.abs(p.risk).toFixed(2)}%)` : `${p.risk.toFixed(2)}%`}</span> · {p.weight.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-head">Smallest risk contributors</div>
            {SMALLEST_RISK.map((p) => (
              <div className="pa-row" key={p.name}>
                <span className="pa-k">{p.name}</span>
                <span className="pa-v">
                  {p.weight.toFixed(2)}% · <span className={p.risk < 0 ? "negv" : "pos"}>{p.risk < 0 ? `(${Math.abs(p.risk).toFixed(2)}%)` : `${p.risk.toFixed(2)}%`}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-head">Hedge / Other</div>
            <p className="note" style={{ fontStyle: "italic", margin: 0 }}>
              No hedge or overlay positions in this portfolio.
            </p>
          </div>
          <div className="card">
            <div className="card-head">Largest holdings (by % gross)</div>
            {LARGEST_HOLDINGS.map((p) => (
              <div className="pa-row" key={p.name}>
                <span className="pa-k">{p.name}</span>
                <span className="pa-v">
                  {p.weight.toFixed(2)}% · <span className={p.risk < 0 ? "negv" : "pos"}>{p.risk < 0 ? `(${Math.abs(p.risk).toFixed(2)}%)` : `${p.risk.toFixed(2)}%`}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-head">Smallest holdings (most short)</div>
            {SMALLEST_HOLDINGS.map((p) => (
              <div className="pa-row" key={p.name}>
                <span className="pa-k">{p.name}</span>
                <span className="pa-v">
                  <span className="negv">({Math.abs(p.weight).toFixed(2)}%)</span> · {p.risk.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-head">Top 5 least liquid</div>
            {LEAST_LIQUID.map((p) => (
              <div className="pa-row" key={p.name}>
                <span className="pa-k">{p.name}</span>
                <span className="pa-v">{p.weight.toFixed(2)}% · {p.days}d</span>
              </div>
            ))}
          </div>
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
        <p className="note">Hypothetical P&amp;L under 14 historical regime episodes · % of gross</p>
        {stressView === "graph" ? (
          <StressGraph rows={STRESS} />
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
              {STRESS.map((s) => (
                <tr key={s.name}>
                  <td>{s.name}</td>
                  <td className={`num ${s.delta < 0 ? "neg" : "pos"}`}>
                    {s.delta < 0 ? `(${Math.abs(s.delta).toFixed(2)}%)` : `+${s.delta.toFixed(2)}%`}
                  </td>
                  <td>
                    <span className={`mag ${s.delta < 0 ? "negm" : "pos"}`} style={{ width: stressMag(s.delta) }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="note rr-foot">
          Worst-case scenario is the UpStress regime — a portfolio dollar-short on net exposure would underperform if equity markets rally sharply on
          a broad style reversal. All other regimes shown are positive, consistent with a defensive book.
        </p>

        <h3>Provenance</h3>
        <p className="note">Risk model + source files</p>
        <div className="card">
          <div className="prov">
            <span className="prov-mark">AX</span>
            <div>
              <div className="prov-title">Axioma Worldwide 4 (Short Horizon) — WW4AxiomaSH</div>
              <span className="prov-link">qontigo.com/axioma-risk-model-machine</span>
              <div className="meta2">
                As-of 5 May 2023 · 73 positions priced · single-day predicted vol horizon · style + sector + country + currency + industry factor
                decomposition
              </div>
              <div className="rr-fchips">
                <span className="rr-fchip">predicted-vol</span>
                <span className="rr-fchip">factor-decomp</span>
                <span className="rr-fchip">stress-replay</span>
                <span className="rr-fchip">liquidity-ladder</span>
                <span className="rr-fchip">axioma-ww4-sh</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
