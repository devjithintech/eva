import type { CandidateRecord } from "../../api/types";
import { firstSection, pct, str } from "../../api/sections";

interface Props {
  rec: CandidateRecord;
}

interface Bucket {
  bucket?: string;
  weight_pct?: number;
  note?: string;
}

/** Liquidity — real data, but the sparsest section in the dataset (~9%
 *  field fill on average): most candidates only have the free-text
 *  `days_to_liquidate_note`, so that's the primary fallback before "Not
 *  disclosed". */
export function LiquiditySection({ rec }: Props) {
  const liquidity = firstSection(rec, "liquidity");
  const buckets = (Array.isArray(liquidity.liquidity_buckets) ? liquidity.liquidity_buckets : []) as Bucket[];
  const note = str(liquidity.days_to_liquidate_note);

  return (
    <section id="liquidity" className="sec">
      <div className="sec-head">
        <span className="sec-ic">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          </svg>
        </span>
        <h2>Liquidity</h2>
      </div>
      <div className="sec-body">
        {buckets.length > 0 && (
          <table className="data">
            <thead>
              <tr>
                <th>Bucket</th>
                <th className="r">Weight</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b, i) => (
                <tr key={i}>
                  <td>{str(b.bucket)}</td>
                  <td className="num">{pct(b.weight_pct)}</td>
                  <td>{str(b.note)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {str(liquidity.weighted_days_to_liquidate) !== "—" && (
          <div className="grid" style={{ marginTop: buckets.length ? 14 : 0 }}>
            <div className="k">Weighted Days To Liquidate</div>
            <div className="v">{str(liquidity.weighted_days_to_liquidate)}</div>
          </div>
        )}
        {note !== "—" ? (
          <p className="prose" style={{ marginTop: 14 }}>{note}</p>
        ) : (
          buckets.length === 0 && <p className="note">Not disclosed for this candidate.</p>
        )}
      </div>
    </section>
  );
}
