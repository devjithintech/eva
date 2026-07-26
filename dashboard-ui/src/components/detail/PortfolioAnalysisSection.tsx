/** Portfolio analysis — the design reference shows a factor-regression
 *  breakdown (OLS betas, t-stats, alpha/IR/tracking-error) that has no
 *  equivalent field anywhere in this dataset (no per-candidate factor model
 *  output exists). Rather than fabricate specific numbers per real
 *  candidate, this section is intentionally static/illustrative — it shows
 *  the shape the analysis would take once a real factor-regression pipeline
 *  is wired up. */

const FACTORS: { name: string; b63: number; b252: number; tstat: number; sig: "y" | "m" | "n" }[] = [
  { name: "Market (Mkt–RF)", b63: 0.41, b252: 0.38, tstat: 4.2, sig: "y" },
  { name: "Size (SMB)", b63: 0.12, b252: 0.09, tstat: 1.1, sig: "m" },
  { name: "Value (HML)", b63: 0.28, b252: 0.31, tstat: 3.1, sig: "y" },
  { name: "Momentum (MOM)", b63: 0.19, b252: 0.22, tstat: 2.0, sig: "y" },
  { name: "Profitability (RMW)", b63: 0.44, b252: 0.41, tstat: 4.8, sig: "y" },
  { name: "Investment (CMA)", b63: 0.07, b252: 0.1, tstat: 0.8, sig: "n" },
  { name: "Low Volatility (BAB)", b63: -0.14, b252: -0.11, tstat: -1.4, sig: "m" },
];
const SIG_LABEL: Record<string, string> = { y: "Significant", m: "Marginal", n: "Not sig." };
const barPx = (v: number) => `${Math.round(Math.abs(v) * 190)}px`;

export function PortfolioAnalysisSection() {
  return (
    <section id="portfolio" className="sec">
      <div className="sec-head">
        <span className="sec-ic">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <circle cx="9" cy="14" r="1.7" />
            <circle cx="13.5" cy="9.5" r="1.7" />
            <circle cx="18" cy="6" r="1.7" />
          </svg>
        </span>
        <h2>Portfolio analysis</h2>
      </div>
      <div className="sec-body">
        <h3>Factor regression — submitted portfolio</h3>
        <p className="note">Illustrative · OLS · 7 factors · W=63d and W=252d — no factor-regression pipeline is wired up for individual candidates yet.</p>
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
            {FACTORS.map((f) => (
              <tr key={f.name}>
                <td>{f.name}</td>
                <td>
                  <span className="bpair">
                    <i className="b63" style={{ width: barPx(f.b63) }} />
                    <i className="b252" style={{ width: barPx(f.b252) }} />
                  </span>
                </td>
                <td className="num">{f.b63.toFixed(2)}</td>
                <td className="num">{f.b252.toFixed(2)}</td>
                <td className="num">{f.tstat.toFixed(1)}</td>
                <td>
                  <span className={`sig ${f.sig}`}>{SIG_LABEL[f.sig]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pa-cards">
          <div className="card pa-card">
            <div className="card-head">Performance</div>
            <div className="pa-row">
              <span className="pa-k">Ann. alpha</span>
              <span className="pa-v pos">+18.4%</span>
            </div>
            <div className="pa-row">
              <span className="pa-k">Information ratio</span>
              <span className="pa-v pos">1.42</span>
            </div>
            <div className="pa-row">
              <span className="pa-k">Tracking error</span>
              <span className="pa-v">13.0%</span>
            </div>
            <div className="pa-row">
              <span className="pa-k">Hit rate (monthly)</span>
              <span className="pa-v pos">63%</span>
            </div>
            <div className="pa-row">
              <span className="pa-k">R²</span>
              <span className="pa-v">0.71</span>
            </div>
          </div>
          <div className="card pa-card">
            <div className="card-head">Risk metrics</div>
            <div className="pa-row">
              <span className="pa-k">Gross exposure</span>
              <span className="pa-v">124%</span>
            </div>
            <div className="pa-row">
              <span className="pa-k">Net exposure</span>
              <span className="pa-v">38%</span>
            </div>
            <div className="pa-row">
              <span className="pa-k">Largest position</span>
              <span className="pa-v">6.2% NAV</span>
            </div>
            <div className="pa-row">
              <span className="pa-k">Implied VaR (95%)</span>
              <span className="pa-v negv">-2.1%/day</span>
            </div>
            <div className="pa-row">
              <span className="pa-k">Max drawdown</span>
              <span className="pa-v negv">-14.3%</span>
            </div>
          </div>
          <div className="card pa-card">
            <div className="card-head">Fund fit</div>
            <div className="pa-row">
              <span className="pa-k">Gap fill score</span>
              <span className="pa-v pos">0.78 / 1.0</span>
            </div>
            <div className="pa-row">
              <span className="pa-k">Max PM correlation</span>
              <span className="pa-v">0.53</span>
            </div>
            <div className="pa-row">
              <span className="pa-k">Penalty triggered?</span>
              <span className="pa-v pos">No (&lt; 0.60)</span>
            </div>
            <div className="pa-row">
              <span className="pa-k">ENS impact</span>
              <span className="pa-v pos">+0.8</span>
            </div>
            <div className="pa-row">
              <span className="pa-k">Fund fit rating</span>
              <span className="pa-v pos">Strong</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
