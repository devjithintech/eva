import { allSection, firstSection, pct, str } from "../../api/sections";
import type { CandidateRecord } from "../../api/types";

/** Benchmark / activeness — one card per raw as-reported snapshot in
 *  `benchmark_activeness` (real data, same as-reported-snapshot-array shape
 *  as `return_skill`/`exposure`/`downside_distribution`). */
interface Props {
  rec: CandidateRecord;
}

export function BenchmarkActivenessSection({ rec }: Props) {
  const snapshots = allSection(rec, "benchmark_activeness");
  const subjectFund = firstSection(rec, "subject_fund");
  const siblingNames = (Array.isArray(subjectFund.sibling_funds) ? subjectFund.sibling_funds : [])
    .map((s) => str((s as { fund_name?: string }).fund_name).toLowerCase())
    .filter((n) => n !== "—");

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
        {snapshots.length === 0 && <p className="note">No benchmark activeness data on record for this candidate.</p>}
        {snapshots.map((entry, i) => {
          const fundRef = str(entry.fund_ref);
          const isSubject = fundRef === "subject";
          const isSibling = !isSubject && siblingNames.some((n) => fundRef.toLowerCase().includes(n));
          const period = str(entry.period);

          return (
            <div className="card" key={i}>
              <div className="card-head">
                {isSubject ? (
                  <span className="badge subject">SUBJECT FUND</span>
                ) : isSibling ? (
                  <span className="badge sibling">SIBLING · {fundRef}</span>
                ) : (
                  <span className="badge other">{fundRef}</span>
                )}
                {period !== "—" && <span className="meta">{period}</span>}
              </div>
              {str(entry.note) !== "—" && <p className="note">{str(entry.note)}</p>}
              <div className="grid">
                <div className="k">Beta</div>
                <div className="v">{str(entry.beta)}</div>
                <div className="k">Market Correlation</div>
                <div className="v">{str(entry.market_correlation)}</div>
                <div className="k">R²</div>
                <div className="v">{str(entry.r_squared)}</div>
                <div className="k">Tracking Error</div>
                <div className="v">{pct(entry.tracking_error_pct)}</div>
                <div className="k">Up Capture</div>
                <div className="v">{pct(entry.up_capture_pct)}</div>
                <div className="k">Down Capture</div>
                <div className="v">{pct(entry.down_capture_pct)}</div>
                <div className="k">Active Share</div>
                <div className="v">{pct(entry.active_share_pct)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
