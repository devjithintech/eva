import { useMemo } from "react";
import { PEER_FUNDS, buildCorrelationMatrix, heatClass } from "./fixtures";

interface Props {
  candidateName: string;
}

export function CorrelationsView({ candidateName }: Props) {
  const names = useMemo(() => [candidateName, ...PEER_FUNDS], [candidateName]);
  const matrix = useMemo(() => buildCorrelationMatrix(names), [names]);
  const subjectRow = matrix[0];

  const ranked = names
    .map((name, i) => ({ name, corr: subjectRow[i] }))
    .filter((_, i) => i !== 0)
    .sort((a, b) => b.corr - a.corr);

  const topCorrelated = ranked.slice(0, 8);
  const leastCorrelated = [...ranked].sort((a, b) => a.corr - b.corr).slice(0, 8);

  const list = (title: string, sub: string, rows: { name: string; corr: number }[]) => (
    <div className="corr-box">
      <div className="corr-head">
        <span className="corr-title">{title}</span>
        <span className="corr-sub">{sub}</span>
      </div>
      <table className="corr-tbl">
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Fund</th>
            <th>Corr</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td>{r.name}</td>
              <td className="cv">
                <span className={`hc ${heatClass(r.corr)}`}>{r.corr >= 0 ? "+" : ""}{r.corr.toFixed(2)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="pl-view">
      <div className="pl-sh">
        <span>Correlations — mock reference set</span>
      </div>
      <div className="corr-grid">
        {list("Top correlated", `${PEER_FUNDS.length} funds scanned`, topCorrelated)}
        {list("Least correlated (diversifiers)", "Negative-corr opportunities", leastCorrelated)}
      </div>
    </div>
  );
}
