/** Portfolio analysis — the design reference shows a factor-regression
 *  breakdown (OLS betas, t-stats, alpha/IR/tracking-error) that has no
 *  equivalent field anywhere in this dataset (no per-candidate factor model
 *  output exists). Rather than fabricate specific numbers per real
 *  candidate, this section is intentionally static/illustrative — it shows
 *  the shape the analysis would take once a real factor-regression pipeline
 *  is wired up. */

const FACTORS: { name: string; beta: number; tstat: number; sig: "y" | "m" | "n" }[] = [
  { name: "Market (Mkt–RF)", beta: 0.41, tstat: 4.2, sig: "y" },
  { name: "Size (SMB)", beta: 0.12, tstat: 1.1, sig: "m" },
  { name: "Value (HML)", beta: 0.28, tstat: 3.1, sig: "y" },
  { name: "Momentum (MOM)", beta: 0.19, tstat: 2.0, sig: "y" },
  { name: "Profitability (RMW)", beta: 0.44, tstat: 4.8, sig: "y" },
  { name: "Investment (CMA)", beta: 0.07, tstat: 0.8, sig: "n" },
  { name: "Low Volatility (BAB)", beta: -0.14, tstat: -1.4, sig: "m" },
];
const SIG_LABEL: Record<string, string> = { y: "Significant", m: "Marginal", n: "Not sig." };

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
        <p className="note">Illustrative — no factor-regression pipeline is wired up for individual candidates yet; this shows the intended format.</p>
        <h3>Factor regression — submitted portfolio</h3>
        <table className="data">
          <thead>
            <tr>
              <th>Factor</th>
              <th className="r">Beta</th>
              <th className="r">T-stat</th>
              <th>Significance</th>
            </tr>
          </thead>
          <tbody>
            {FACTORS.map((f) => (
              <tr key={f.name}>
                <td>{f.name}</td>
                <td className="num">{f.beta.toFixed(2)}</td>
                <td className="num">{f.tstat.toFixed(1)}</td>
                <td>{SIG_LABEL[f.sig]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginTop: 16 }}>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Performance</h3>
            <div className="grid">
              <div className="k">Ann. alpha</div>
              <div className="v">+18.4%</div>
              <div className="k">Information ratio</div>
              <div className="v">1.42</div>
              <div className="k">Tracking error</div>
              <div className="v">13.0%</div>
              <div className="k">Hit rate (monthly)</div>
              <div className="v">63%</div>
            </div>
          </div>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Risk metrics</h3>
            <div className="grid">
              <div className="k">Gross exposure</div>
              <div className="v">124%</div>
              <div className="k">Net exposure</div>
              <div className="v">38%</div>
              <div className="k">Largest position</div>
              <div className="v">6.2% NAV</div>
              <div className="k">Implied VaR (95%)</div>
              <div className="v">-2.1%/day</div>
            </div>
          </div>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Fund fit</h3>
            <div className="grid">
              <div className="k">Gap fill score</div>
              <div className="v">0.78 / 1.0</div>
              <div className="k">Max PM correlation</div>
              <div className="v">0.53</div>
              <div className="k">Penalty triggered?</div>
              <div className="v">No (&lt; 0.60)</div>
              <div className="k">Fund fit rating</div>
              <div className="v">Strong</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
