import type { CandidateRecord } from "../../api/types";
import { firstSection, pct, str } from "../../api/sections";

interface Props {
  rec: CandidateRecord;
}

/** Fees — split out of the old combined "Fees & terms" section. Real data,
 *  but sparse (~42% field fill), so an explicit "Not disclosed" note replaces
 *  a grid of all-dashes. */
export function FeesSection({ rec }: Props) {
  const fees = firstSection(rec, "fees");
  const empty = str(fees.management_fee_pct) === "—" && str(fees.incentive_fee_pct) === "—" && str(fees.has_high_water_mark) === "—";

  return (
    <section id="fees" className="sec">
      <div className="sec-head">
        <span className="sec-ic">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="5" x2="5" y2="19" />
            <circle cx="6.5" cy="6.5" r="2.5" />
            <circle cx="17.5" cy="17.5" r="2.5" />
          </svg>
        </span>
        <h2>Fees</h2>
      </div>
      <div className="sec-body">
        {empty ? (
          <p className="note">Fee terms not disclosed for this candidate.</p>
        ) : (
          <div className="grid">
            <div className="k">Management Fee</div>
            <div className="v">{pct(fees.management_fee_pct)}</div>
            <div className="k">Incentive Fee</div>
            <div className="v">{pct(fees.incentive_fee_pct)}</div>
            <div className="k">High-Water Mark</div>
            <div className="v">{str(fees.has_high_water_mark)}</div>
            <div className="k">Hurdle Rate</div>
            <div className="v">{str(fees.hurdle_rate)}</div>
          </div>
        )}
      </div>
    </section>
  );
}
