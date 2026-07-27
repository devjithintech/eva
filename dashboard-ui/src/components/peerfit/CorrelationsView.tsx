import { useRenderer } from "../../api/hooks";
import type { RunParams } from "../../api/types";
import { LoadingState } from "../common/LoadingState";
import { ErrorState } from "../common/ErrorState";
import { heatClass } from "./heat";

interface CorrRow {
  quadrant: "lh_most" | "lh_least" | "bb_most" | "bb_least";
  name: string;
  correlation: number;
  source: string;
}

interface Props {
  id: string;
  candidateName: string;
  params: RunParams;
}

export function CorrelationsView({ id, params }: Props) {
  const corr = useRenderer<CorrRow>("D1-7", id, params);

  if (corr.loading) return <LoadingState label="Loading correlations…" />;
  if (corr.error || !corr.data) return <ErrorState message={corr.error ?? "Correlations unavailable"} />;

  const rows = corr.data.rows;
  const topCorrelated = rows.filter((r) => r.quadrant === "lh_most" || r.quadrant === "bb_most");
  const leastCorrelated = rows.filter((r) => r.quadrant === "lh_least" || r.quadrant === "bb_least");
  const scanned = (corr.data.attrs?.scanned as number) ?? rows.length;

  const list = (title: string, sub: string, entries: CorrRow[]) => (
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
          {entries.map((r) => (
            <tr key={r.name}>
              <td>{r.name}</td>
              <td className="cv">
                <span className={`hc ${heatClass(r.correlation)}`}>
                  {r.correlation >= 0 ? "+" : ""}
                  {r.correlation.toFixed(2)}
                </span>
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
        {list("Top correlated", `${scanned} funds scanned`, topCorrelated)}
        {list("Least correlated (diversifiers)", "Negative-corr opportunities", leastCorrelated)}
      </div>
    </div>
  );
}
