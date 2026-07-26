import type { CandidateRecord } from "../../api/types";
import { firstSection, str } from "../../api/sections";

interface Props {
  rec: CandidateRecord;
}

interface AumEntry {
  scope?: string;
  fund_ref?: string;
  value?: number | string;
  as_of_date?: string;
  date?: string;
  aum_usd_mn?: number;
  note?: string;
}

/** AUM — real data from `classification.current_aum_usd_mn` (current, one
 *  row per scope) and `classification.aum_history` (a scoped time series).
 *  Scope renders as the same `.badge` chip used elsewhere (SUBJECT FUND /
 *  SIBLING · name / FIRM · PM-LEVEL), matching the reference — plain text
 *  scope codes like "pm_level" never appear directly. */
export function AumSection({ rec }: Props) {
  const classification = firstSection(rec, "classification");
  const subjectFund = firstSection(rec, "subject_fund");
  const siblingNames = (Array.isArray(subjectFund.sibling_funds) ? subjectFund.sibling_funds : [])
    .map((s) => str((s as { fund_name?: string }).fund_name).toLowerCase())
    .filter((n) => n !== "—");
  const current = (Array.isArray(classification.current_aum_usd_mn) ? classification.current_aum_usd_mn : []) as AumEntry[];
  const history = (Array.isArray(classification.aum_history) ? classification.aum_history : []) as AumEntry[];

  const ScopeBadge = ({ e }: { e: AumEntry }) => {
    const scope = str(e.scope);
    const fundRef = str(e.fund_ref);
    if (scope === "pm_level" || scope === "firm" || (scope === "—" && fundRef === "—")) {
      return <span className="badge pm">FIRM / PM-LEVEL</span>;
    }
    if (fundRef === "subject") {
      return <span className="badge subject">SUBJECT FUND</span>;
    }
    if (fundRef !== "—" && siblingNames.some((n) => fundRef.toLowerCase().includes(n))) {
      return <span className="badge sibling">SIBLING · {fundRef}</span>;
    }
    return <span className="badge other">{fundRef !== "—" ? fundRef : scope}</span>;
  };

  return (
    <section id="aum" className="sec">
      <div className="sec-head">
        <span className="sec-ic">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="20" x2="12" y2="10" />
            <line x1="18" y1="20" x2="18" y2="4" />
            <line x1="6" y1="20" x2="6" y2="16" />
          </svg>
        </span>
        <h2>AUM</h2>
      </div>
      <div className="sec-body">
        <h3>Current</h3>
        {current.length === 0 ? (
          <p className="note">AUM not disclosed for this candidate.</p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Scope</th>
                <th className="r">USD mn</th>
                <th>As of</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {current.map((e, i) => (
                <tr key={i}>
                  <td>
                    <ScopeBadge e={e} />
                  </td>
                  <td className="num">{str(e.value)}</td>
                  <td>{str(e.as_of_date)}</td>
                  <td>{str(e.note)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {history.length > 0 && (
          <>
            <h3>History</h3>
            <table className="data">
              <thead>
                <tr>
                  <th>Scope</th>
                  <th>Date</th>
                  <th className="r">USD mn</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {history.map((e, i) => (
                  <tr key={i}>
                    <td>
                      <ScopeBadge e={e} />
                    </td>
                    <td>{str(e.date)}</td>
                    <td className="num">{str(e.aum_usd_mn)}</td>
                    <td>{str(e.note)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </section>
  );
}
