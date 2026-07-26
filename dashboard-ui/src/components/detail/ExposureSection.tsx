import type { CandidateRecord } from "../../api/types";
import { firstSection, pct, str } from "../../api/sections";

interface Props {
  rec: CandidateRecord;
}

/** Exposure — real data from the `exposure` scoped section (always at least
 *  one entry per candidate). */
export function ExposureSection({ rec }: Props) {
  const exposure = firstSection(rec, "exposure");

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
        <div className="grid">
          <div className="k">Gross Exposure (current)</div>
          <div className="v">{pct(exposure.gross_exposure_current_pct)}</div>
          <div className="k">Net Exposure (current)</div>
          <div className="v">{pct(exposure.net_exposure_current_pct)}</div>
          <div className="k">Beta Benchmark</div>
          <div className="v">{str(exposure.beta_benchmark)}</div>
        </div>
      </div>
    </section>
  );
}
