import { Fragment, useMemo, useState } from "react";
import type { MatrixRow, Stage } from "../../api/types";
import { CandidateRowDetail } from "./CandidateRowDetail";

export interface TableRow extends MatrixRow {
  id: string;
  stage: Stage;
  flagCount: number;
}

type SortKey = "alpha" | "cagr" | "sharpe" | "dd";

interface Props {
  rows: TableRow[];
  scores: Map<string, number>;
  compareMode: boolean;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onAdvance: (id: string) => void;
  onReject: (id: string) => void;
}

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "alpha", label: "Alpha" },
  { key: "cagr", label: "5-yr CAGR" },
  { key: "sharpe", label: "Sharpe" },
  { key: "dd", label: "Max DD" },
];

const fmtPct = (v: number | null) => (v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`);
const fmtNum = (v: number | null) => (v == null ? "—" : v.toFixed(2));

export function CandidateTable({ rows, scores, compareMode, selected, onToggleSelect, onAdvance, onReject }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("alpha");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => ((a[sortKey] ?? -Infinity) - (b[sortKey] ?? -Infinity)) * sortDir);
    return copy;
  }, [rows, sortKey, sortDir]);

  const sortClick = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === -1 ? 1 : -1) as 1 | -1);
    else {
      setSortKey(key);
      setSortDir(-1);
    }
  };

  if (!rows.length) {
    return <div className="az-empty">No candidates in this view.</div>;
  }

  return (
    <div className="cl-tblwrap">
      <table className="cl-tbl">
        <thead>
          <tr>
            {compareMode && <th style={{ width: 34 }}></th>}
            <th className="cl-exp"></th>
            <th className="r" style={{ width: 30 }}>#</th>
            <th>Candidate</th>
            <th style={{ width: 60 }}>Score</th>
            {COLUMNS.map((c) => (
              <th key={c.key} className="r sortable" onClick={() => sortClick(c.key)}>
                {c.label}
                <span className="sar">{sortKey === c.key ? (sortDir === -1 ? "▼" : "▲") : ""}</span>
              </th>
            ))}
            <th className="cl-more"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => {
            const open = expandedId === r.id;
            return (
              <Fragment key={r.id}>
                <tr
                  className="cl-row"
                  onClick={() => {
                    window.location.hash = `#/candidates/${r.id}`;
                  }}
                >
                  {compareMode && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => onToggleSelect(r.id)}
                      />
                    </td>
                  )}
                  <td
                    className="cl-exp"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedId(open ? null : r.id);
                    }}
                  >
                    <button type="button" className={`cl-expbtn${open ? " open" : ""}`} aria-label="Show profile">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </td>
                  <td className="cl-rank">{i + 1}</td>
                  <td className="cl-cand">
                    <div className="nm">{r.name}</div>
                    {r.flagCount > 0 && <div className="fn">⚑ {r.flagCount} analyst flag{r.flagCount === 1 ? "" : "s"}</div>}
                  </td>
                  <td className="r">
                    <span className="cl-ais">{scores.get(r.name) ?? "—"}</span>
                  </td>
                  <td className={`r ${r.alpha != null ? (r.alpha >= 0 ? "pos" : "neg") : ""}`}>{fmtPct(r.alpha)}</td>
                  <td className={`r ${r.cagr != null ? (r.cagr >= 0 ? "pos" : "neg") : ""}`}>{fmtPct(r.cagr)}</td>
                  <td className="r">{fmtNum(r.sharpe)}</td>
                  <td className="r neg">{fmtPct(r.dd)}</td>
                  <td className="cl-more" onClick={(e) => e.stopPropagation()}>
                    {r.stage !== "interview" && (
                      <button
                        type="button"
                        className="btn"
                        style={{ marginRight: 6 }}
                        onClick={() => onAdvance(r.id)}
                        title="Select for interview"
                      >
                        → Interview
                      </button>
                    )}
                    <button type="button" className="btn danger" onClick={() => onReject(r.id)} title="Reject candidate">
                      Reject
                    </button>
                  </td>
                </tr>
                {open && (
                  <tr>
                    <td colSpan={compareMode ? 9 : 8} style={{ padding: 0, border: "none" }}>
                      <CandidateRowDetail id={r.id} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
