import { useMemo } from "react";
import { PEER_FUNDS, buildCorrelationMatrix, heatClass } from "./fixtures";

interface Props {
  candidateName: string;
}

export function MatrixView({ candidateName }: Props) {
  const names = useMemo(() => [candidateName, ...PEER_FUNDS.slice(0, 11)], [candidateName]);
  const matrix = useMemo(() => buildCorrelationMatrix(names), [names]);

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
                <th key={n} className={`col-h${n === candidateName ? " cand" : ""}`}>
                  {n}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {names.map((rowName, i) => (
              <tr key={rowName} className={rowName === candidateName ? "cand" : ""}>
                <th className="row-h">{rowName}</th>
                {names.map((_, j) => (
                  <td key={j} className={i === j ? "diag" : heatClass(matrix[i][j])}>
                    {i === j ? "—" : matrix[i][j].toFixed(2)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
