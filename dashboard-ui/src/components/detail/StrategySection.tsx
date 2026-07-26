import type { CandidateRecord } from "../../api/types";
import { firstSection, list, str } from "../../api/sections";

interface Props {
  rec: CandidateRecord;
}

/** Strategy — real data from the `strategy` raw section (present, at least
 *  partially, on every candidate). */
export function StrategySection({ rec }: Props) {
  const strategy = firstSection(rec, "strategy");

  return (
    <section id="strategy" className="sec">
      <div className="sec-head">
        <span className="sec-ic">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        </span>
        <h2>Strategy</h2>
      </div>
      <div className="sec-body">
        <div className="grid">
          <div className="k">Type</div>
          <div className="v">{str(strategy.type)}</div>
          <div className="k">Sub Strategy</div>
          <div className="v">{str(strategy.sub_strategy)}</div>
          <div className="k">Instruments</div>
          <div className="v">{list(strategy.instruments)}</div>
          <div className="k">Market Cap Focus</div>
          <div className="v">{str(strategy.market_cap_focus)}</div>
          <div className="k">Decision Process</div>
          <div className="v">{str(strategy.decision_making_process)}</div>
        </div>
        {str(strategy.description) !== "—" && <p className="prose">{str(strategy.description)}</p>}
        {str(strategy.investment_thesis_core) !== "—" && (
          <>
            <h3>Investment thesis</h3>
            <p className="prose">{str(strategy.investment_thesis_core)}</p>
          </>
        )}
        {str(strategy.idea_generation) !== "—" && (
          <>
            <h3>Idea generation</h3>
            <p className="prose">{str(strategy.idea_generation)}</p>
          </>
        )}
      </div>
    </section>
  );
}
