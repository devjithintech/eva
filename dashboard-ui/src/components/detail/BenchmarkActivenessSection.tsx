import type { CandidateRecord } from "../../api/types";
import { firstSection, pct, str } from "../../api/sections";

interface Props {
  rec: CandidateRecord;
}

/** Benchmark / activeness — real data from `benchmark_activeness` (beta,
 *  correlation, R², tracking error). ~10% of candidates have no scoped
 *  entries at all, so an explicit empty state replaces the grid then. */
export function BenchmarkActivenessSection({ rec }: Props) {
  const b = firstSection(rec, "benchmark_activeness");
  const empty = str(b.beta) === "—" && str(b.market_correlation) === "—";

  return (
    <section id="benchmark" className="sec">
      <div className="sec-head">
        <span className="sec-ic">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </span>
        <h2>Benchmark / activeness</h2>
      </div>
      <div className="sec-body">
        {empty ? (
          <p className="note">No benchmark activeness data on record for this candidate.</p>
        ) : (
          <div className="grid">
            <div className="k">Beta</div>
            <div className="v">{str(b.beta)}</div>
            <div className="k">Market Correlation</div>
            <div className="v">{str(b.market_correlation)}</div>
            <div className="k">R²</div>
            <div className="v">{str(b.r_squared)}</div>
            <div className="k">Tracking Error</div>
            <div className="v">{pct(b.tracking_error_pct)}</div>
          </div>
        )}
      </div>
    </section>
  );
}
