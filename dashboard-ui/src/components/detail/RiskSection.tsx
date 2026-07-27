import { useState } from "react";
import { allSection, firstSection, pct, str } from "../../api/sections";
import type { CandidateRecord } from "../../api/types";

interface Props {
  rec: CandidateRecord;
}

/** Risk & downside — one card per raw as-reported snapshot in
 *  `downside_distribution` (real data, same as-reported-snapshot-array shape
 *  as `return_skill`/`exposure`), with a Table/Card toggle mirroring the
 *  reference's own script that consolidates this section's cards into one
 *  scrollable table (default view) alongside the per-snapshot cards. */
export function RiskSection({ rec }: Props) {
  const snapshots = allSection(rec, "downside_distribution");
  const subjectFund = firstSection(rec, "subject_fund");
  const siblingNames = (
    Array.isArray(subjectFund.sibling_funds) ? subjectFund.sibling_funds : []
  )
    .map((s) => str((s as { fund_name?: string }).fund_name).toLowerCase())
    .filter((n) => n !== "—");
  const [view, setView] = useState<"table" | "card">("table");

  const baseRows = snapshots.map((entry) => {
    const fundRef = str(entry.fund_ref);
    const isSubject = fundRef === "subject";
    const isSibling =
      !isSubject && siblingNames.some((n) => fundRef.toLowerCase().includes(n));
    return {
      entry,
      fundRef,
      isSubject,
      isSibling,
      basis: str(entry.basis).toLowerCase(),
      shareClass: str(entry.share_class),
      periodEnd: str(entry.period_end),
    };
  });

  // Latest-per-entity: the subject fund is one bucket, each sibling/other
  // fund_ref is its own — mirrors the reference's own maxPE-by-badge-text
  // grouping. period_end sorts correctly as a plain string (ISO dates).
  const entityKey = (r: { isSubject: boolean; fundRef: string }) =>
    r.isSubject ? "__subject__" : r.fundRef.toLowerCase();
  const maxPeriodEnd = new Map<string, string>();
  for (const r of baseRows) {
    if (r.periodEnd === "—") continue;
    const key = entityKey(r);
    const cur = maxPeriodEnd.get(key);
    if (!cur || r.periodEnd > cur) maxPeriodEnd.set(key, r.periodEnd);
  }
  const rows = baseRows.map((r) => ({
    ...r,
    isLatest: r.periodEnd !== "—" && r.periodEnd === maxPeriodEnd.get(entityKey(r)),
  }));

  return (
    <section id="risk" className="sec">
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
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </span>
        <h2>Risk &amp; downside</h2>
        {rows.length > 0 && (
          <span className="seg">
            <button
              type="button"
              className={view === "table" ? "on" : ""}
              onClick={() => setView("table")}
            >
              Table
            </button>
            <button
              type="button"
              className={view === "card" ? "on" : ""}
              onClick={() => setView("card")}
            >
              Card
            </button>
          </span>
        )}
      </div>
      <div className="sec-body">
        {rows.length === 0 && (
          <p className="note">
            No downside/risk data on record for this candidate.
          </p>
        )}

        {rows.length > 0 && view === "table" && (
          <div className="risk-table">
            <table className="data risk-tbl">
              <thead>
                <tr>
                  <th>Entity</th>
                  <th>Basis</th>
                  <th>Period</th>
                  <th className="r">Vol %</th>
                  <th className="r">Max DD</th>
                  <th className="r">Best mo</th>
                  <th className="r">Worst mo</th>
                  <th className="r">Positive mo</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={r.isLatest ? "latest" : undefined}>
                    <td>
                      <div className="ent-name">
                        {r.isSubject ? "Subject fund" : r.isSibling ? `Sibling · ${r.fundRef}` : r.fundRef}
                      </div>
                      {(r.shareClass !== "—" || r.isLatest) && (
                        <div className="ent-sub">
                          {r.shareClass !== "—" && r.shareClass}
                          {r.isLatest && <span className="chip-latest">LATEST</span>}
                        </div>
                      )}
                    </td>
                    <td>
                      {r.basis !== "—" ? (
                        <span className={`bpill ${r.basis}`}>{r.basis}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="per" title={`${str(r.entry.period_start)} → ${str(r.entry.period_end)}`}>
                      {str(r.entry.period_start)} → {str(r.entry.period_end)}
                    </td>
                    <td className="num">{pct(r.entry.volatility_pct)}</td>
                    <td className="num dd">
                      {r.isLatest ? <b>{pct(r.entry.max_drawdown_pct)}</b> : pct(r.entry.max_drawdown_pct)}
                    </td>
                    <td className="num">{pct(r.entry.best_month_pct)}</td>
                    <td className="num dd">{pct(r.entry.worst_month_pct)}</td>
                    <td className="num">{pct(r.entry.positive_months_pct)}</td>
                    <td className="src" title={str(r.entry.note)}>
                      {str(r.entry.note)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {rows.length > 0 && view === "card" && (
          <div className="risk-cards">
            {rows.map((r, i) => (
              <div className="card" key={i}>
                <div className="card-head">
                  {r.isSubject ? (
                    <span className="badge subject">SUBJECT FUND</span>
                  ) : r.isSibling ? (
                    <span className="badge sibling">SIBLING · {r.fundRef}</span>
                  ) : (
                    <span className="badge other">{r.fundRef}</span>
                  )}
                  {str(r.entry.period) !== "—" && (
                    <span className="meta">{str(r.entry.period)}</span>
                  )}
                </div>
                {str(r.entry.note) !== "—" && (
                  <p className="note">{str(r.entry.note)}</p>
                )}
                <div className="grid">
                  <div className="k">Volatility</div>
                  <div className="v">{pct(r.entry.volatility_pct)}</div>
                  <div className="k">Max Drawdown</div>
                  <div className="v" style={{ color: "var(--neg)" }}>
                    {pct(r.entry.max_drawdown_pct)}
                  </div>
                  <div className="k">Best Month</div>
                  <div className="v" style={{ color: "var(--pos)" }}>
                    {pct(r.entry.best_month_pct)}
                  </div>
                  <div className="k">Worst Month</div>
                  <div className="v" style={{ color: "var(--neg)" }}>
                    {pct(r.entry.worst_month_pct)}
                  </div>
                  <div className="k">Positive Months</div>
                  <div className="v">{pct(r.entry.positive_months_pct)}</div>
                  <div className="k">Downside Deviation</div>
                  <div className="v">{pct(r.entry.downside_deviation_pct)}</div>
                  <div className="k">VaR (95%, historical)</div>
                  <div className="v">{pct(r.entry.historical_var_95_pct)}</div>
                  <div className="k">CVaR (95%)</div>
                  <div className="v">{pct(r.entry.cvar_95_pct)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
