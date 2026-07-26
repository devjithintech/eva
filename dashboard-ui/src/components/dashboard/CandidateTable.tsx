import { useMemo, useState } from "react";
import type { MatrixRow, Stage } from "../../api/types";
import { RowActionsMenu } from "./RowActionsMenu";
import { SelectInterviewDialog } from "./SelectInterviewDialog";
import { ShareProfileDialog } from "./ShareProfileDialog";
import { AddNoteDialog } from "./AddNoteDialog";
import { RejectCandidateDialog } from "./RejectCandidateDialog";

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

type ActionType = "select" | "share" | "note" | "reject";

export function CandidateTable({ rows, scores, compareMode, selected, onToggleSelect, onAdvance, onReject }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("alpha");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [action, setAction] = useState<{ type: ActionType; id: string; name: string } | null>(null);

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
          {sorted.map((r, i) => (
            <tr
              key={r.id}
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
                <RowActionsMenu
                  showInterview={r.stage !== "interview"}
                  onSelectInterview={() => setAction({ type: "select", id: r.id, name: r.name })}
                  onShare={() => setAction({ type: "share", id: r.id, name: r.name })}
                  onAddNote={() => setAction({ type: "note", id: r.id, name: r.name })}
                  onReject={() => setAction({ type: "reject", id: r.id, name: r.name })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <SelectInterviewDialog
        open={action?.type === "select"}
        onClose={() => setAction(null)}
        candidateName={action?.name ?? ""}
        onConfirm={() => {
          if (action) onAdvance(action.id);
        }}
      />
      <ShareProfileDialog open={action?.type === "share"} onClose={() => setAction(null)} candidateName={action?.name ?? ""} />
      <AddNoteDialog open={action?.type === "note"} onClose={() => setAction(null)} />
      <RejectCandidateDialog
        open={action?.type === "reject"}
        onClose={() => setAction(null)}
        candidateName={action?.name ?? ""}
        onConfirm={() => {
          if (action) onReject(action.id);
        }}
      />
    </div>
  );
}
