import type { CandidateRecord } from "../../api/types";
import { firstSection, signedPct, str } from "../../api/sections";

interface Props {
  rec: CandidateRecord;
}

export function RiskSection({ rec }: Props) {
  const dd = firstSection(rec, "downside_distribution");

  return (
    <section id="risk" className="sec">
      <div className="sec-head">
        <span className="sec-ic">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </span>
        <h2>Risk &amp; downside</h2>
      </div>
      <div className="sec-body">
        <div className="ret-stats">
          <div className="ret-stat">
            <div className="l">Max drawdown</div>
            <div className="v" style={{ color: "var(--neg)" }}>
              {signedPct(dd.max_drawdown_pct)}
            </div>
          </div>
          <div className="ret-stat">
            <div className="l">Volatility</div>
            <div className="v">{str(dd.volatility_pct) === "—" ? "—" : `${dd.volatility_pct}%`}</div>
          </div>
          <div className="ret-stat">
            <div className="l">Best month</div>
            <div className="v" style={{ color: "var(--pos)" }}>
              {signedPct(dd.best_month_pct)}
            </div>
          </div>
          <div className="ret-stat">
            <div className="l">Worst month</div>
            <div className="v" style={{ color: "var(--neg)" }}>
              {signedPct(dd.worst_month_pct)}
            </div>
          </div>
          <div className="ret-stat">
            <div className="l">Positive months</div>
            <div className="v">{str(dd.positive_months_pct) === "—" ? "—" : `${dd.positive_months_pct}%`}</div>
          </div>
        </div>
        {str(dd.note) !== "—" && <p className="note">{str(dd.note)}</p>}
      </div>
    </section>
  );
}
