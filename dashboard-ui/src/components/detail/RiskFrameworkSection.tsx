import type { CandidateRecord } from "../../api/types";
import { firstSection, str } from "../../api/sections";

interface Props {
  rec: CandidateRecord;
}

/** Risk framework — real data from `risk_framework`. */
export function RiskFrameworkSection({ rec }: Props) {
  const rf = firstSection(rec, "risk_framework");
  const empty =
    str(rf.risk_framework_description) === "—" &&
    str(rf.drawdown_response_protocol) === "—" &&
    str(rf.position_limits) === "—" &&
    str(rf.stop_loss_policy) === "—";

  return (
    <section id="riskfw" className="sec">
      <div className="sec-head">
        <span className="sec-ic">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </span>
        <h2>Risk framework</h2>
      </div>
      <div className="sec-body">
        {empty ? (
          <p className="note">No risk framework documented for this candidate.</p>
        ) : (
          <div className="grid">
            <div className="k">Risk Framework Description</div>
            <div className="v">{str(rf.risk_framework_description)}</div>
            <div className="k">Drawdown Response Protocol</div>
            <div className="v">{str(rf.drawdown_response_protocol)}</div>
            <div className="k">Position Limits</div>
            <div className="v">{str(rf.position_limits)}</div>
            <div className="k">Stop Loss Policy</div>
            <div className="v">{str(rf.stop_loss_policy)}</div>
            <div className="k">Risk Model Used</div>
            <div className="v">{str(rf.risk_model_used)}</div>
          </div>
        )}
      </div>
    </section>
  );
}
