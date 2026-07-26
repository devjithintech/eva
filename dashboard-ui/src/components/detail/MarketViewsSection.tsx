import type { CandidateRecord } from "../../api/types";
import { firstSection, str } from "../../api/sections";

interface Props {
  rec: CandidateRecord;
}

function Bullets({ title, items }: { title: string; items: unknown }) {
  const arr = (Array.isArray(items) ? items : []).filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  if (!arr.length) return null;
  return (
    <>
      <h3>{title}</h3>
      <ul>
        {arr.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </>
  );
}

/** Market views — real data from `market_views`, the richest section in the
 *  dataset (84% average field fill). */
export function MarketViewsSection({ rec }: Props) {
  const mv = firstSection(rec, "market_views");
  const hasAny = str(mv.macro_thesis) !== "—" || str(mv.forward_outlook) !== "—" || Array.isArray(mv.sector_views) || Array.isArray(mv.geographic_views) || Array.isArray(mv.key_risks_identified);

  return (
    <section id="views" className="sec">
      <div className="sec-head">
        <span className="sec-ic">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </span>
        <h2>Market views</h2>
      </div>
      <div className="sec-body">
        {!hasAny && <p className="note">No market views on record for this candidate.</p>}
        {str(mv.macro_thesis) !== "—" && <p className="prose">{str(mv.macro_thesis)}</p>}
        <Bullets title="Sector views" items={mv.sector_views} />
        <Bullets title="Geographic views" items={mv.geographic_views} />
        <Bullets title="Key risks" items={mv.key_risks_identified} />
        {str(mv.forward_outlook) !== "—" && (
          <>
            <h3>Forward outlook</h3>
            <p className="prose">{str(mv.forward_outlook)}</p>
          </>
        )}
      </div>
    </section>
  );
}
