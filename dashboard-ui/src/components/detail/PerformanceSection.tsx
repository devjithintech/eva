import { useState } from "react";
import { allSection, firstSection, pct, str } from "../../api/sections";
import type { CandidateRecord } from "../../api/types";
import { AnnualBarGraph } from "./AnnualBarGraph";

interface Props {
  rec: CandidateRecord;
}

interface AnnualReturn {
  year?: number;
  return_pct?: number;
  is_net?: boolean;
}

function splitPeriod(period: string): { start: string; end: string } {
  const m = /^(.+?)\s+to\s+(.+)$/i.exec(period);
  return m ? { start: m[1], end: m[2] } : { start: period, end: "—" };
}

function basisOf(shareClass: string, fallback: unknown): { display: string; basis: string } {
  const m = /\((net|gross)\)\s*$/i.exec(shareClass);
  return {
    display: m ? shareClass.slice(0, m.index).trim() : shareClass,
    basis: m ? m[1].toLowerCase() : str(fallback),
  };
}

function AnnualTable({ rows }: { rows: AnnualReturn[] }) {
  return (
    <table className="data annual">
      <thead>
        <tr>
          <th>Year</th>
          <th className="r">Return</th>
          <th>Basis</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((a, j) => (
          <tr key={j}>
            <td>{a.year ?? "—"}</td>
            <td className={`num ${(a.return_pct ?? 0) >= 0 ? "pos" : "neg"}`}>
              {typeof a.return_pct === "number" ? `${a.return_pct >= 0 ? "+" : ""}${a.return_pct.toFixed(2)}%` : "—"}
            </td>
            <td className="basis">{a.is_net === true ? "Net" : a.is_net === false ? "Gross" : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** One as-reported snapshot card. Only subject-fund cards with a plottable
 *  annual-returns series get the Graph/Table toggle (default: graph) —
 *  matches the reference's own conversion script, which only touches
 *  `.badge.subject` cards. Sibling/other cards always show a plain table. */
function PerformanceCard({
  entry,
  isSubject,
  isSibling,
  fundRef,
}: {
  entry: Record<string, unknown>;
  isSubject: boolean;
  isSibling: boolean;
  fundRef: string;
}) {
  const [view, setView] = useState<"graph" | "table">("graph");
  const { display: shareClassDisplay, basis } = basisOf(str(entry.share_class), entry.basis);
  const { start, end } = splitPeriod(str(entry.period));
  const statsPeriod = str(entry.statistics_period).replace(/_/g, " ");
  const annualReturns = (Array.isArray(entry.annual_returns) ? entry.annual_returns : []) as AnnualReturn[];
  const plottable = annualReturns.filter(
    (a): a is { year: number; return_pct: number; is_net?: boolean } => typeof a.year === "number" && typeof a.return_pct === "number",
  );
  const canGraph = isSubject && plottable.length > 0;

  return (
    <div className="card">
      <div className="card-head">
        {isSubject ? (
          <span className="badge subject">SUBJECT FUND</span>
        ) : isSibling ? (
          <span className="badge sibling">SIBLING · {fundRef}</span>
        ) : (
          <span className="badge other">{fundRef}</span>
        )}
        <span className="meta">
          {shareClassDisplay !== "—" ? shareClassDisplay : "—"} · {statsPeriod !== "—" ? statsPeriod : "—"}
        </span>
        {canGraph && (
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
      {str(entry.note) !== "—" && <p className="note">{str(entry.note)}</p>}
      <div className="grid">
        <div className="k">Basis</div>
        <div className="v">{basis}</div>
        <div className="k">Period Start</div>
        <div className="v">{start}</div>
        <div className="k">Period End</div>
        <div className="v">{end}</div>
        <div className="k">Annualized Return</div>
        <div className="v">{pct(entry.annualized_return_pct)}</div>
        <div className="k">Sharpe Ratio</div>
        <div className="v">{typeof entry.sharpe_ratio === "number" ? entry.sharpe_ratio.toFixed(2) : "—"}</div>
        <div className="k">Statistics Period</div>
        <div className="v">{statsPeriod}</div>
        <div className="k">Statistics Period Detail</div>
        <div className="v">{str(entry.statistics_period_detail)}</div>
      </div>
      {annualReturns.length > 0 &&
        (canGraph && view === "graph" ? (
          <AnnualBarGraph rows={plottable.map((p) => ({ label: String(p.year), value: p.return_pct }))} />
        ) : (
          <AnnualTable rows={annualReturns} />
        ))}
    </div>
  );
}

/** Performance — one card per raw as-reported snapshot in `return_skill`
 *  (real data: each entry is a distinct basis/period/source combination
 *  pulled from a specific factsheet or presentation, exactly as the design
 *  reference models it — not a single computed canonical series). Badge
 *  classifies each snapshot's fund_ref against subject_fund.sibling_funds;
 *  an unmatched fund_ref (a share-class variant or unlisted related vehicle)
 *  gets a neutral "other" tag rather than a guessed classification. */
export function PerformanceSection({ rec }: Props) {
  const snapshots = allSection(rec, "return_skill");
  const subjectFund = firstSection(rec, "subject_fund");
  const siblingNames = (Array.isArray(subjectFund.sibling_funds) ? subjectFund.sibling_funds : [])
    .map((s) => str((s as { fund_name?: string }).fund_name).toLowerCase())
    .filter((n) => n !== "—");

  return (
    <section id="performance" className="sec">
      <div className="sec-head">
        <span className="sec-ic">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          </svg>
        </span>
        <h2>Performance</h2>
      </div>
      <div className="sec-body">
        {snapshots.length === 0 && <p className="note">No as-reported performance snapshots on record for this candidate.</p>}
        {snapshots.map((entry, i) => {
          const fundRef = str(entry.fund_ref);
          const isSubject = fundRef === "subject";
          const isSibling = !isSubject && siblingNames.some((n) => fundRef.toLowerCase().includes(n));
          return <PerformanceCard key={i} entry={entry} isSubject={isSubject} isSibling={isSibling} fundRef={fundRef} />;
        })}
      </div>
    </section>
  );
}
