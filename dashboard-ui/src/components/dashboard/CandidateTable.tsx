import { useMemo, useState } from "react";
import type { MatrixRow, Stage } from "../../api/types";
import { RowActionsMenu } from "./RowActionsMenu";
import { SelectInterviewDialog } from "./SelectInterviewDialog";
import { ShareProfileDialog } from "./ShareProfileDialog";
import { AddNoteDialog } from "./AddNoteDialog";
import { RejectCandidateDialog } from "./RejectCandidateDialog";
import { ExecutiveSummaryModal } from "./ExecutiveSummaryModal";

const ZAP_ICON = (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15.914 4a1.5 1.5 0 0 0-2.474-1.561l-9 9A1.5 1.5 0 0 0 5.5 14h4.002a.5.5 0 0 1 .471.666L8.086 20a1.5 1.5 0 0 0 2.475 1.56l9-9A1.5 1.5 0 0 0 18.5 10h-3.997a.5.5 0 0 1-.472-.667z" />
  </svg>
);

export interface TableRow extends MatrixRow {
  id: string;
  stage: Stage;
  flagCount: number;
  fundName: string | null;
}

type SortKey = "alpha" | "cagr" | "sharpe" | "dd";

interface Props {
  rows: TableRow[];
  compareMode: boolean;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onShortlist: (id: string) => void;
  onAdvance: (id: string) => void;
  onReject: (id: string) => void;
}

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "alpha", label: "Jensen's α" },
  { key: "cagr", label: "5-yr CAGR" },
  { key: "sharpe", label: "Sharpe" },
  { key: "dd", label: "Max DD" },
];

const fmtPct = (v: number | null) =>
  v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
const fmtNum = (v: number | null) => (v == null ? "—" : v.toFixed(2));

type ActionType = "select" | "share" | "note" | "reject";

export function CandidateTable({
  rows,
  compareMode,
  selected,
  onToggleSelect,
  onShortlist,
  onAdvance,
  onReject,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("alpha");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [action, setAction] = useState<{
    type: ActionType;
    id: string;
    name: string;
  } | null>(null);
  const [zapId, setZapId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort(
      (a, b) =>
        ((a[sortKey] ?? -Infinity) - (b[sortKey] ?? -Infinity)) * sortDir,
    );
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
            <th className="r" style={{ width: 30 }}>
              #
            </th>
            <th>Candidate</th>
            {COLUMNS.map((c) => (
              <th
                key={c.key}
                className="r sortable"
                onClick={() => sortClick(c.key)}
              >
                {c.label}
                <span className="sar">
                  {sortKey === c.key ? (sortDir === -1 ? "▼" : "▲") : ""}
                </span>
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
                <div className="nm">
                  {r.name}
                  <button
                    type="button"
                    className="nm-zap"
                    aria-label={`Executive summary for ${r.name}`}
                    title="Executive summary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setZapId(r.id);
                    }}
                  >
                    {ZAP_ICON}
                  </button>
                </div>
                {r.fundName && <div className="fn">{r.fundName}</div>}
              </td>
              <td
                className={`r ${r.alpha != null ? (r.alpha >= 0 ? "pos" : "neg") : ""}`}
              >
                {fmtPct(r.alpha)}
              </td>
              <td
                className={`r ${r.cagr != null ? (r.cagr >= 0 ? "pos" : "neg") : ""}`}
              >
                {fmtPct(r.cagr)}
              </td>
              <td className="r">{fmtNum(r.sharpe)}</td>
              <td className="r neg">{fmtPct(r.dd)}</td>
              <td className="cl-more" onClick={(e) => e.stopPropagation()}>
                <RowActionsMenu
                  showShortlist={
                    r.stage !== "shortlisted" && r.stage !== "interview"
                  }
                  showInterview={r.stage !== "interview"}
                  onShortlist={() => onShortlist(r.id)}
                  onSelectInterview={() =>
                    setAction({ type: "select", id: r.id, name: r.name })
                  }
                  onShare={() =>
                    setAction({ type: "share", id: r.id, name: r.name })
                  }
                  onAddNote={() =>
                    setAction({ type: "note", id: r.id, name: r.name })
                  }
                  onReject={() =>
                    setAction({ type: "reject", id: r.id, name: r.name })
                  }
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
      <ShareProfileDialog
        open={action?.type === "share"}
        onClose={() => setAction(null)}
        candidateName={action?.name ?? ""}
      />
      <AddNoteDialog
        open={action?.type === "note"}
        onClose={() => setAction(null)}
      />
      <RejectCandidateDialog
        open={action?.type === "reject"}
        onClose={() => setAction(null)}
        candidateName={action?.name ?? ""}
        onConfirm={() => {
          if (action) onReject(action.id);
        }}
      />
      <ExecutiveSummaryModal id={zapId} onClose={() => setZapId(null)} />
    </div>
  );
}
