import { useRenderer } from "../../api/hooks";
import type { RunParams } from "../../api/types";
import { LoadingState } from "../common/LoadingState";
import { ErrorState } from "../common/ErrorState";

interface PeerRow {
  fund: string;
  row_type: "candidate" | "peer" | "median" | "candidate_peer" | "cohort_median";
  source: string;
  ytd_return: number;
  annualised_return: number;
  annualised_vol: number;
  sharpe: number;
  max_drawdown: number;
}

interface Props {
  id: string;
  candidateName: string;
  params: RunParams;
  onOpenCandidates: () => void;
}

const ROW_LABEL: Record<PeerRow["row_type"], string> = {
  candidate: "SUBJECT",
  candidate_peer: "CAND PEER",
  cohort_median: "COHORT MED.",
  median: "MEDIAN",
  peer: "",
};

export function PeerTableView({ id, candidateName, params, onOpenCandidates }: Props) {
  const table = useRenderer<PeerRow>("D1-6", id, params);

  if (table.loading) return <LoadingState label="Loading peer table…" />;
  if (table.error || !table.data) return <ErrorState message={table.error ?? "Peer table unavailable"} />;

  const rows = table.data.rows;
  const subject = rows.find((r) => r.row_type === "candidate");
  const peerMedian = rows.find((r) => r.row_type === "median");
  const peerCount = rows.filter((r) => r.row_type === "peer").length;
  const hasCohort = rows.some((r) => r.row_type === "candidate_peer");

  return (
    <div className="pl-view">
      <div className="pl-sh">
        <span>
          Peer group statistics — <span style={{ color: "var(--primary)", fontWeight: 600 }}>Mock reference set</span>
        </span>
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span>{peerCount} peers · ranked by Sharpe{hasCohort ? " · candidate peers included" : ""}</span>
          <button type="button" className="pl-sh-action" onClick={onOpenCandidates}>
            Candidates…
          </button>
        </span>
      </div>
      <div className="peer-strip">
        <div className="peer-kpi">
          <div className="pk-l">YTD return</div>
          <div className="pk-v pos">+{((subject?.ytd_return ?? 0) * 100).toFixed(1)}%</div>
        </div>
        <div className="peer-kpi">
          <div className="pk-l">Ann. return</div>
          <div className="pk-v pos">+{((subject?.annualised_return ?? 0) * 100).toFixed(1)}%</div>
        </div>
        <div className="peer-kpi">
          <div className="pk-l">Ann. vol</div>
          <div className="pk-v">{((subject?.annualised_vol ?? 0) * 100).toFixed(1)}%</div>
        </div>
        <div className="peer-kpi">
          <div className="pk-l">Sharpe</div>
          <div className="pk-v pos">{(subject?.sharpe ?? 0).toFixed(2)}</div>
        </div>
        <div className="peer-kpi">
          <div className="pk-l">Max DD</div>
          <div className="pk-v">{((subject?.max_drawdown ?? 0) * 100).toFixed(1)}%</div>
        </div>
        <div className="peer-kpi">
          <div className="pk-l">Peer median Sharpe</div>
          <div className="pk-v">{(peerMedian?.sharpe ?? 0).toFixed(2)}</div>
        </div>
      </div>
      <div className="peer-tbl-wrap">
        <table className="peer-tbl">
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Fund</th>
              <th>YTD</th>
              <th>Ann. return</th>
              <th>Ann. vol</th>
              <th>Sharpe</th>
              <th>Max DD</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.fund}-${i}`} className={r.row_type === "candidate" ? "cand" : r.row_type === "candidate_peer" || r.row_type === "cohort_median" ? "cand-peer" : ""}>
                <td>
                  {r.row_type === "candidate" ? `${candidateName} — subject` : r.fund}
                  {ROW_LABEL[r.row_type] && r.row_type !== "candidate" && (
                    <span className="ctag" style={{ marginLeft: 6 }}>{ROW_LABEL[r.row_type]}</span>
                  )}
                </td>
                <td className="pos">+{(r.ytd_return * 100).toFixed(1)}%</td>
                <td className="pos">+{(r.annualised_return * 100).toFixed(1)}%</td>
                <td>{(r.annualised_vol * 100).toFixed(1)}%</td>
                <td>{r.sharpe.toFixed(2)}</td>
                <td>{(r.max_drawdown * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
