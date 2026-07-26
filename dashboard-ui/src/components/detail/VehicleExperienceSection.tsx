import type { CandidateRecord } from "../../api/types";
import { firstSection, str } from "../../api/sections";

interface Props {
  rec: CandidateRecord;
}

/** Vehicle experience — real data, sparse (SMA-related fields are almost
 *  always null); the own-fund/hedge-fund-experience fields and the drift
 *  note are the reliably-populated ones. */
export function VehicleExperienceSection({ rec }: Props) {
  const vehexp = firstSection(rec, "vehicle_experience");

  return (
    <section id="vehexp" className="sec">
      <div className="sec-head">
        <span className="sec-ic">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
        </span>
        <h2>Vehicle experience</h2>
      </div>
      <div className="sec-body">
        <div className="grid">
          <div className="k">Has Hedge Fund Experience</div>
          <div className="v">{str(vehexp.has_hedge_fund_experience)}</div>
          <div className="k">Own Fund Vs PM</div>
          <div className="v">{str(vehexp.own_fund_vs_pm)}</div>
          <div className="k">AUM Drift Note</div>
          <div className="v">{str(vehexp.aum_drift_note)}</div>
        </div>
      </div>
    </section>
  );
}
