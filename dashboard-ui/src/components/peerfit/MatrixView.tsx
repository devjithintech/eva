import { useRenderer } from "../../api/hooks";
import type { RunParams } from "../../api/types";
import { LoadingState } from "../common/LoadingState";
import { ErrorState } from "../common/ErrorState";
import { heatClass } from "./heat";

interface Props {
  id: string;
  candidateName: string;
  params: RunParams;
}

export function MatrixView({ id, candidateName, params }: Props) {
  const matrix = useRenderer<Record<string, unknown>>("D1-8", id, params);

  if (matrix.loading) return <LoadingState label="Loading matrix…" />;
  if (matrix.error || !matrix.data) return <ErrorState message={matrix.error ?? "Matrix unavailable"} />;

  const names = matrix.data.schema.slice(1).map((c) => c.name);
  const rows = matrix.data.rows;
  const sourceByName = (matrix.data.attrs?.source_by_name as Record<string, string>) ?? {};

  const cellClass = (rowName: string, colName: string) => {
    if (sourceByName[rowName] === "Candidate peer" || sourceByName[colName] === "Candidate peer") return "cand-peer-cell";
    return "";
  };

  // D1-8 sometimes has no display name for a fund (only an opaque numeric id
  // made it through) — flag those instead of silently showing a bare number.
  const isUnresolved = (name: string) => /^\d+$/.test(name);
  const headerLabel = (name: string) =>
    isUnresolved(name) ? (
      <>
        {name}
        <span className="no-name-flag" title={`No display name available for fund id ${name}`}>
          ⚠
        </span>
      </>
    ) : (
      name
    );

  return (
    <div className="pl-view">
      <div className="pl-sh">
        <span>Peer correlation matrix — mock reference set</span>
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
                  title={n}
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
                  <th className={`row-h${isUnresolved(rowName) ? " unresolved" : ""}`} title={rowName}>
                    {headerLabel(rowName)}
                  </th>
                  {names.map((colName) => {
                    const value = row[colName] as number;
                    const isDiag = colName === rowName;
                    return (
                      <td key={colName} className={isDiag ? "diag" : `${heatClass(value)} ${cellClass(rowName, colName)}`}>
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
