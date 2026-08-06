import { useFundNames, useRenderer } from "../../api/hooks";
import type { RunParams } from "../../api/types";
import { LoadingState } from "../common/LoadingState";
import { ErrorState } from "../common/ErrorState";
import { heatClass } from "./heat";

interface Props {
  id: string;
  candidateName: string;
  params: RunParams;
  onOpenCandidates: () => void;
}

/** Legend swatches, green (diversifying, −1) → red (concentrated, +1) — the
 *  same ramp `heatClass` assigns to cells (hc-g5 … hc-n0 … hc-r5). */
const LEGEND_RAMP = [
  "#95cfb1", "#b1dcc4", "#c9e7d6", "#def0e6", "#eef7f2",
  "#f2f3f5",
  "#fdf2f1", "#fbe8e6", "#f9dcd9", "#f5cbc6", "#f0b6b0",
];

export function MatrixView({ id, candidateName, params, onOpenCandidates }: Props) {
  const matrix = useRenderer<Record<string, unknown>>("D1-8", id, params);
  const fundNames = useFundNames();

  if (matrix.loading) return <LoadingState label="Loading matrix…" />;
  if (matrix.error || !matrix.data) return <ErrorState message={matrix.error ?? "Matrix unavailable"} />;

  const names = matrix.data.schema.slice(1).map((c) => c.name);
  const rows = matrix.data.rows;
  const sourceByName = (matrix.data.attrs?.source_by_name as Record<string, string>) ?? {};
  const obs = matrix.data.attrs?.obs as number | undefined;

  const cellClass = (rowName: string, colName: string) => {
    if (sourceByName[rowName] === "Candidate peer" || sourceByName[colName] === "Candidate peer") return "cand-peer-cell";
    return "";
  };

  // D1-8 labels peers by bare numeric fund id — resolve those to fund names
  // via the fund-hierarchy lookup. Raw ids stay the keys for row/cell data.
  const displayName = (name: string) => fundNames.nameById.get(name) ?? name;

  /** Hover tooltip — "hover cell for source data" in the header caption. */
  const cellTitle = (rowName: string, colName: string, value: number) => {
    const src = (n: string) => sourceByName[n] ?? "Peer group";
    return `${displayName(rowName)} (${src(rowName)}) × ${displayName(colName)} (${src(colName)}) · ρ = ${value.toFixed(2)}${obs ? ` · ${obs} monthly obs` : ""}`;
  };

  // A fund the hierarchy can't name either (once it has loaded) is flagged
  // instead of silently showing a bare number.
  const isUnresolved = (name: string) => /^\d+$/.test(name) && !fundNames.loading && !fundNames.nameById.has(name);
  const headerLabel = (name: string) => {
    const label = name === candidateName ? `${displayName(name)} — SUBJECT` : displayName(name);
    return isUnresolved(name) ? (
      <>
        {label}
        <span className="no-name-flag" title={`No display name available for fund id ${name}`}>
          ⚠
        </span>
      </>
    ) : (
      label
    );
  };

  return (
    <div className="pl-view">
      <div className="matrix-toolbar">
        <div className="matrix-legend">
          <div className="matrix-legend-bar">
            {LEGEND_RAMP.map((c, i) => (
              <i key={i} style={{ background: c }} />
            ))}
          </div>
          <div className="matrix-legend-labels">
            <span>−1.0</span>
            <span>0</span>
            <span>+1.0</span>
          </div>
        </div>
        <span className="matrix-caption">
          Subject (purple) + candidate peers (teal) + peer group · hover cell for source data
          <button type="button" className="pl-sh-action" onClick={onOpenCandidates}>
            Candidates…
          </button>
        </span>
      </div>
      <div className="matrix-wrap">
        <table className="matrix">
          <thead>
            <tr>
              <th className="corner">Fund</th>
              {names.map((n) => (
                <th
                  key={n}
                  className={`col-h${n === candidateName ? " cand" : ""} ${cellClass(n, n)}${isUnresolved(n) ? " unresolved" : ""}`}
                  title={displayName(n)}
                >
                  {headerLabel(n)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rowName = String(row.index);
              return (
                <tr key={rowName} className={rowName === candidateName ? "cand" : ""}>
                  <th className={`row-h${isUnresolved(rowName) ? " unresolved" : ""} ${cellClass(rowName, rowName)}`} title={displayName(rowName)}>
                    {headerLabel(rowName)}
                  </th>
                  {names.map((colName) => {
                    const value = row[colName] as number;
                    const isDiag = colName === rowName;
                    return (
                      <td
                        key={colName}
                        className={isDiag ? "diag" : `${heatClass(value)} ${cellClass(rowName, colName)}`}
                        title={isDiag ? undefined : cellTitle(rowName, colName, value)}
                      >
                        {isDiag ? "—" : value.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
