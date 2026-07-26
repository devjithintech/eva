import type { CandidateRecord } from "../../api/types";
import { firstSection, list, pct, str } from "../../api/sections";

interface Props {
  rec: CandidateRecord;
}

interface TopPosition {
  name?: string;
  weight_pct?: number;
  side?: string;
  sector?: string;
}
interface RegionWeight {
  region?: string;
  weight_pct?: number;
}

/** Holdings — real data from the `holdings` section. 46% of candidates have
 *  no position-level detail at all, so the top-positions table gets an
 *  explicit empty state rather than rendering blank. */
export function HoldingsSection({ rec }: Props) {
  const holdings = firstSection(rec, "holdings");
  const positions = (Array.isArray(holdings.top_positions) ? holdings.top_positions : []) as TopPosition[];
  const regions = (Array.isArray(holdings.region_allocation) ? holdings.region_allocation : []) as RegionWeight[];

  return (
    <section id="holdings" className="sec">
      <div className="sec-head">
        <span className="sec-ic">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
            <path d="M22 12A10 10 0 0 0 12 2v10z" />
          </svg>
        </span>
        <h2>Holdings</h2>
      </div>
      <div className="sec-body">
        <h3>Top positions</h3>
        {positions.length === 0 ? (
          <p className="note">No position-level holdings on record for this candidate.</p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th className="r">Weight</th>
                <th>Side</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p, i) => (
                <tr key={i}>
                  <td>{str(p.name)}</td>
                  <td className="num">{pct(p.weight_pct)}</td>
                  <td>{str(p.side)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {regions.length > 0 && (
          <>
            <h3>Region</h3>
            <table className="data">
              <thead>
                <tr>
                  <th>Region</th>
                  <th className="r">Weight</th>
                </tr>
              </thead>
              <tbody>
                {regions.map((r, i) => (
                  <tr key={i}>
                    <td>{str(r.region)}</td>
                    <td className="num">{pct(r.weight_pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div className="grid" style={{ marginTop: 14 }}>
          <div className="k">Num Positions Total</div>
          <div className="v">{str(holdings.num_positions_total)}</div>
          <div className="k">Largest Position</div>
          <div className="v">{pct(holdings.largest_position_pct)}</div>
          <div className="k">Holding Types</div>
          <div className="v">{list(holdings.holding_types)}</div>
          <div className="k">Uses Index Instruments</div>
          <div className="v">{str(holdings.uses_index_instruments)}</div>
        </div>
      </div>
    </section>
  );
}
