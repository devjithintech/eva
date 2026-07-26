import type { CandidateRecord } from "../../api/types";
import { firstSection, list, str } from "../../api/sections";

interface Props {
  rec: CandidateRecord;
}

/** Strategy — real data from the `strategy` raw section (present, at least
 *  partially, on every candidate). Reference renders every field as one flat
 *  grid, including the long-form narrative fields — matched here rather than
 *  splitting them into separate prose/h3 blocks. */
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
          <div className="k">Description</div>
          <div className="v">{str(strategy.description)}</div>
          <div className="k">Investment Thesis Core</div>
          <div className="v">{str(strategy.investment_thesis_core)}</div>
          <div className="k">Idea Generation</div>
          <div className="v">{str(strategy.idea_generation)}</div>
          <div className="k">Instruments</div>
          <div className="v">{list(strategy.instruments)}</div>
          <div className="k">Market Cap Focus</div>
          <div className="v">{str(strategy.market_cap_focus)}</div>
          <div className="k">Neutrality Approach</div>
          <div className="v">{str(strategy.neutrality_approach)}</div>
          <div className="k">Decision Style</div>
          <div className="v">{str(strategy.decision_style)}</div>
          <div className="k">Family Defining Note</div>
          <div className="v">{str(strategy.family_defining_note)}</div>
        </div>
      </div>
    </section>
  );
}
