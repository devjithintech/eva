import type { CandidateRecord } from "../../api/types";
import { firstSection, list, str } from "../../api/sections";

interface Props {
  rec: CandidateRecord;
}

/** Classification — strategy detail now lives in its own dedicated
 *  `StrategySection`, so this stays focused on fund/vehicle classification
 *  fields only. */
export function ClassificationSection({ rec }: Props) {
  const classification = firstSection(rec, "classification");

  return (
    <section id="classification" className="sec">
      <div className="sec-head">
        <span className="sec-ic">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        </span>
        <h2>Classification</h2>
      </div>
      <div className="sec-body">
        <div className="grid">
          <div className="k">Strategy Family</div>
          <div className="v">{str(classification.strategy_family)}</div>
          <div className="k">Asset Class</div>
          <div className="v">{str(classification.asset_class)}</div>
          <div className="k">Geographic Focus</div>
          <div className="v">{list(classification.geographic_focus)}</div>
          <div className="k">Domicile</div>
          <div className="v">{str(classification.domicile)}</div>
          <div className="k">Vehicle Type</div>
          <div className="v">{str(classification.vehicle_type)}</div>
          <div className="k">Inception Date</div>
          <div className="v">{str(classification.inception_date)}</div>
          <div className="k">Track Record Audited</div>
          <div className="v">{str(classification.is_track_record_audited)}</div>
          <div className="k">Stated Benchmark</div>
          <div className="v">{str(classification.stated_benchmark)}</div>
        </div>
      </div>
    </section>
  );
}
