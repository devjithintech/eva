import { useState } from "react";
import { useReturns } from "../../api/hooks";
import { firstSection, str } from "../../api/sections";
import type { CandidateRecord } from "../../api/types";
import { LoadingState } from "../common/LoadingState";
import { ErrorState } from "../common/ErrorState";
import { GrowthCurveGraph } from "./GrowthCurveGraph";

interface Props {
  id: string;
  rec: CandidateRecord;
}

/** Compound a year-by-year return series into a growth-of-100 cumulative
 *  curve, expressed as cumulative % gain from the start (same math as the
 *  reference's own `buildGraph()`, just annual instead of monthly steps). */
function growthOf100(calendar: { year: string; value: number }[]): { label: string; value: number }[] {
  let cum = 100;
  return calendar.map((c) => {
    cum *= 1 + c.value / 100;
    return { label: c.year, value: cum - 100 };
  });
}

/** Returns by fund — reuses the same GET /api/candidates/:id/returns data
 *  PerformanceSection charts, rendered as a Graph/Table toggle (default:
 *  graph) for the subject fund's real annual return series — same
 *  AnnualBarGraph component and toggle convention as Performance. Sibling
 *  funds (real, from subject_fund.sibling_funds) are listed by name only —
 *  this dataset has no per-sibling annual-returns series. */
export function ReturnsByFundSection({ id, rec }: Props) {
  const { data, loading, error } = useReturns(id);
  const [view, setView] = useState<"graph" | "table">("graph");
  const subjectFund = firstSection(rec, "subject_fund");
  const fundName = str(subjectFund.fund_name) !== "—" ? str(subjectFund.fund_name) : rec.name;
  const siblings = (Array.isArray(subjectFund.sibling_funds) ? subjectFund.sibling_funds : []) as { fund_name?: string }[];

  return (
    <section id="returns" className="sec">
      <div className="sec-head">
        <span className="sec-ic">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="9" x2="9" y2="21" />
            <line x1="15" y1="9" x2="15" y2="21" />
          </svg>
        </span>
        <h2>Returns by fund</h2>
      </div>
      <div className="sec-body">
        {loading && <LoadingState label="Loading returns…" />}
        {!loading && (error || !data) && <ErrorState message={error ?? "No returns available"} />}
        {!loading && data && (
          <div className="card">
            <div className="card-head">
              <span style={{ fontWeight: 650, fontSize: 15 }}>{fundName}</span>
              {data.calendar.length > 0 && (
                <span className="seg">
                  <button type="button" className={view === "graph" ? "on" : ""} onClick={() => setView("graph")}>
                    Graph
                  </button>
                  <button type="button" className={view === "table" ? "on" : ""} onClick={() => setView("table")}>
                    Table
                  </button>
                </span>
              )}
            </div>
            {data.calendar.length === 0 ? (
              <p className="note">No annual return series on record for this fund.</p>
            ) : view === "graph" ? (
              <GrowthCurveGraph points={growthOf100(data.calendar)} />
            ) : (
              <table className="data" style={{ maxWidth: 360 }}>
                <thead>
                  <tr>
                    <th>Year</th>
                    <th className="r">Return</th>
                  </tr>
                </thead>
                <tbody>
                  {data.calendar.map((c) => (
                    <tr key={c.year}>
                      <td>{c.year}</td>
                      <td className={`num ${c.value >= 0 ? "pos" : "neg"}`}>
                        {c.value >= 0 ? "+" : ""}
                        {c.value.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {siblings.length > 0 && (
          <>
            <h3>Sibling funds</h3>
            <p className="note">Detailed returns aren't tracked for sibling vehicles in this dataset.</p>
            <ul>
              {siblings.map((s, i) => (
                <li key={i}>{str(s.fund_name)}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
