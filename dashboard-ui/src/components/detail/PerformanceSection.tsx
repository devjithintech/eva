import { Fragment, useState } from "react";
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

/** Ordered per the `return_skill` schema — annualized-return family first,
 *  then risk-adjusted ratios — and only rendered when the source value is
 *  reported, matching the design reference (a snapshot omits a row rather
 *  than showing a blank "—" for a metric it doesn't report). */
const NUMERIC_ROWS: { key: string; label: string; ratio?: boolean }[] = [
  { key: "arithmetic_mean_monthly_pct", label: "Arithmetic Mean Monthly Pct" },
  { key: "arithmetic_mean_annualized_pct", label: "Arithmetic Mean Annualized Pct" },
  { key: "geometric_mean_monthly_pct", label: "Geometric Mean Monthly Pct" },
  { key: "cagr_pct", label: "CAGR Pct" },
  { key: "annualized_return_pct", label: "Annualized Return Pct" },
  { key: "excess_return_pct", label: "Excess Return Pct" },
  { key: "active_return_pct", label: "Active Return Pct" },
  { key: "real_return_pct", label: "Real Return Pct" },
  { key: "alpha_annualized_pct", label: "Alpha Annualized Pct" },
  { key: "sharpe_ratio", label: "Sharpe Ratio", ratio: true },
  { key: "sortino_ratio", label: "Sortino Ratio", ratio: true },
  { key: "treynor_ratio", label: "Treynor Ratio", ratio: true },
  { key: "information_ratio", label: "Information Ratio", ratio: true },
  { key: "calmar_ratio", label: "Calmar Ratio", ratio: true },
  { key: "sterling_ratio", label: "Sterling Ratio", ratio: true },
  { key: "mar_ratio", label: "MAR Ratio", ratio: true },
  { key: "omega_ratio", label: "Omega Ratio", ratio: true },
  { key: "appraisal_ratio", label: "Appraisal Ratio", ratio: true },
];

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
  const basis = str(entry.basis);
  const period = str(entry.period);
  const shareClass = str(entry.share_class);
  const metaText = [shareClass !== "—" ? shareClass : null, period !== "—" ? period : null].filter(Boolean).join(" · ");
  const statsPeriod = str(entry.statistics_period);
  const statsPeriodDetail = str(entry.statistics_period_detail);
  const annualReturns = (Array.isArray(entry.annual_returns) ? entry.annual_returns : []) as AnnualReturn[];
  const plottable = annualReturns.filter(
    (a): a is { year: number; return_pct: number; is_net?: boolean } => typeof a.year === "number" && typeof a.return_pct === "number",
  );
  const canGraph = isSubject && plottable.length > 0;
  const numericRows = NUMERIC_ROWS.filter((r) => typeof entry[r.key] === "number");

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
        {metaText && <span className="meta">{metaText}</span>}
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
        <div className="v">{str(entry.period_start)}</div>
        <div className="k">Period End</div>
        <div className="v">{str(entry.period_end)}</div>
        {numericRows.map((r) => (
          <Fragment key={r.key}>
            <div className="k">{r.label}</div>
            <div className="v">{r.ratio ? (entry[r.key] as number).toFixed(2) : pct(entry[r.key], 2)}</div>
          </Fragment>
        ))}
        {statsPeriod !== "—" && (
          <>
            <div className="k">Statistics Period</div>
            <div className="v">{statsPeriod}</div>
          </>
        )}
        {statsPeriodDetail !== "—" && (
          <>
            <div className="k">Statistics Period Detail</div>
            <div className="v">{statsPeriodDetail}</div>
          </>
        )}
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
