import { allSection, firstSection, pct, str } from "../../api/sections";
import type { CandidateRecord } from "../../api/types";

interface Props {
  rec: CandidateRecord;
}

/** Exposure — one card per raw as-reported snapshot in `exposure` (real
 *  data — same as-reported-snapshot-array shape as `return_skill`, matching
 *  the reference's multi-card layout: a target/policy card plus one
 *  point-in-time card per fund/period). */
export function ExposureSection({ rec }: Props) {
  const snapshots = allSection(rec, "exposure");
  const subjectFund = firstSection(rec, "subject_fund");
  const siblingNames = (Array.isArray(subjectFund.sibling_funds) ? subjectFund.sibling_funds : [])
    .map((s) => str((s as { fund_name?: string }).fund_name).toLowerCase())
    .filter((n) => n !== "—");

  return (
    <section id="exposure" className="sec">
      <div className="sec-head">
        <span className="sec-ic">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
        </span>
        <h2>Exposure</h2>
      </div>
      <div className="sec-body">
        {snapshots.length === 0 && <p className="note">No exposure data on record for this candidate.</p>}
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
                <div className="k">Gross Exposure Target</div>
                <div className="v">{str(entry.gross_exposure_target)}</div>
                <div className="k">Gross Exposure (current)</div>
                <div className="v">{pct(entry.gross_exposure_current_pct)}</div>
                <div className="k">Gross Exposure (min / avg / max)</div>
                <div className="v">
                  {pct(entry.gross_exposure_min_pct)} / {pct(entry.gross_exposure_avg_pct)} / {pct(entry.gross_exposure_max_pct)}
                </div>
                <div className="k">Net Exposure Target</div>
                <div className="v">{str(entry.net_exposure_target)}</div>
                <div className="k">Net Exposure (current)</div>
                <div className="v">{pct(entry.net_exposure_current_pct)}</div>
                <div className="k">Net Exposure (min / avg / max)</div>
                <div className="v">
                  {pct(entry.net_exposure_min_pct)} / {pct(entry.net_exposure_avg_pct)} / {pct(entry.net_exposure_max_pct)}
                </div>
                <div className="k">Beta-adjusted Net Exposure</div>
                <div className="v">{pct(entry.beta_adjusted_net_exposure_pct)}</div>
                <div className="k">Residual Beta</div>
                <div className="v">{str(entry.residual_beta)}</div>
                <div className="k">Beta Benchmark</div>
                <div className="v">{str(entry.beta_benchmark)}</div>
                <div className="k">Long / Short Ratio</div>
                <div className="v">{str(entry.long_short_ratio)}</div>
                <div className="k">Long Alpha</div>
                <div className="v">{pct(entry.long_alpha_pct)}</div>
                <div className="k">Short Alpha</div>
                <div className="v">{pct(entry.short_alpha_pct)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
