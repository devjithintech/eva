/** Risk research — the design reference shows a full third-party risk-model
 *  decomposition (predicted vol/beta, style/sector/country risk splits,
 *  stress-scenario replays) with no equivalent field anywhere in this
 *  dataset. Intentionally static/illustrative, same rationale as
 *  PortfolioAnalysisSection — shows the intended shape rather than
 *  fabricating specific numbers per real candidate. */

const STRESS: { name: string; delta: number }[] = [
  { name: "COVID snap (Mar '20)", delta: 1.85 },
  { name: "Hedge fund sell-off (Jan '16)", delta: 0.92 },
  { name: "Mkt sell-off (Fall '18)", delta: 0.6 },
  { name: "Volpocalypse (Feb '18)", delta: 0.5 },
  { name: "UpStress", delta: -0.85 },
];

export function RiskResearchSection() {
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
        <p className="note">Illustrative — no third-party risk-model feed (e.g. Axioma) is wired up for individual candidates yet; this shows the intended format.</p>

        <h3>Portfolio risk</h3>
        <div className="grid">
          <div className="k">Predicted vol</div>
          <div className="v">3.13%</div>
          <div className="k">Predicted market beta</div>
          <div className="v">0.00</div>
          <div className="k">Historical beta</div>
          <div className="v">0.07</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginTop: 16 }}>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Exposure</h3>
            <div className="grid">
              <div className="k">Net</div>
              <div className="v">-2.65%</div>
              <div className="k">Long</div>
              <div className="v">48.68%</div>
              <div className="k">Short</div>
              <div className="v">-51.32%</div>
            </div>
          </div>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Concentration</h3>
            <div className="grid">
              <div className="k">Top 5</div>
              <div className="v">15.69%</div>
              <div className="k">Top 10</div>
              <div className="v">28.43%</div>
            </div>
          </div>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Liquidity ladder</h3>
            <div className="grid">
              <div className="k">&lt; 1 day</div>
              <div className="v">59%</div>
              <div className="k">1–3 days</div>
              <div className="v">24%</div>
              <div className="k">3–10 days</div>
              <div className="v">11%</div>
            </div>
          </div>
        </div>

        <h3>Stress scenarios</h3>
        <table className="data">
          <thead>
            <tr>
              <th>Scenario</th>
              <th className="r">Δ (% of gross)</th>
            </tr>
          </thead>
          <tbody>
            {STRESS.map((s) => (
              <tr key={s.name}>
                <td>{s.name}</td>
                <td className={`num ${s.delta < 0 ? "neg" : "pos"}`}>
                  {s.delta > 0 ? "+" : ""}
                  {s.delta.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
