import type { CandidateRecord } from "../../api/types";
import { firstSection, str } from "../../api/sections";

interface Props {
  rec: CandidateRecord;
}

interface SiblingFund {
  fund_name?: string;
  strategy?: string;
  inception_date?: string;
  note?: string;
}

/** Overview — a prose description of the subject fund plus its sibling
 *  funds (real: `subject_fund.sibling_funds`), which 60% of candidates have
 *  none of, so an explicit empty state replaces the table in that case. */
export function OverviewSection({ rec }: Props) {
  const subjectFund = firstSection(rec, "subject_fund");
  const description = str(subjectFund.subject_rationale);
  const siblings = (
    Array.isArray(subjectFund.sibling_funds) ? subjectFund.sibling_funds : []
  ) as SiblingFund[];

  return (
    <section id="overview" className="sec">
      <div className="sec-head">
        <span className="sec-ic">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <line x1="8" y1="13" x2="16" y2="13" />
            <line x1="8" y1="17" x2="14" y2="17" />
          </svg>
        </span>
        <h2>Overview</h2>
      </div>
      <div className="sec-body">
        <p className="prose">
          {description !== "—"
            ? description
            : "No fund overview on record for this candidate."}
        </p>

        <h3>Sibling funds</h3>
        {siblings.length === 0 ? (
          <p className="note">
            No sibling funds on record — this manager runs a single vehicle in
            this dataset.
          </p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Fund Name</th>
                <th>Strategy</th>
                <th>Inception Date</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {siblings.map((s, i) => (
                <tr key={i}>
                  <td>{str(s.fund_name)}</td>
                  <td>{str(s.strategy)}</td>
                  <td>{str(s.inception_date)}</td>
                  <td>{str(s.note)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
