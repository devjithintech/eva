import { useFundNames, useRenderer } from "../../api/hooks";
import type { RunParams } from "../../api/types";
import { LoadingState } from "../common/LoadingState";
import { ErrorState } from "../common/ErrorState";

/** D1-6 row — funds with too little history come back with null metrics,
 *  and `fund` is a bare numeric id for peer-group rows (resolved to a name
 *  via the fund hierarchy). */
interface PeerRow {
  fund: string;
  row_type: "candidate" | "peer" | "median" | "candidate_peer" | "cohort_median";
  source: string;
  ytd_return: number | null;
  annualised_return: number | null;
  annualised_vol: number | null;
  sharpe: number | null;
  max_drawdown: number | null;
}

/** Fraction → "12.3%" ("—" when the service has no value). */
const pct = (v: number | null | undefined) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`);
/** Fraction → signed "+12.3%" / "−2.0%". */
const signedPct = (v: number | null | undefined) => (v == null ? "—" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`);
const num = (v: number | null | undefined, digits = 2) => (v == null ? "—" : v.toFixed(digits));
/** pos/neg cell class — none when the value is missing. */
const signClass = (v: number | null | undefined) => (v == null ? "" : v >= 0 ? "pos" : "neg");

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
  const fundNames = useFundNames();

  if (table.loading) return <LoadingState label="Loading peer table…" />;
  if (table.error || !table.data) return <ErrorState message={table.error ?? "Peer table unavailable"} />;

  const rows = table.data.rows;
  const fundLabel = (r: PeerRow) => fundNames.nameById.get(r.fund) ?? r.fund;
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
          <div className={`pk-v ${signClass(subject?.ytd_return)}`}>{signedPct(subject?.ytd_return)}</div>
        </div>
        <div className="peer-kpi">
          <div className="pk-l">Ann. return</div>
          <div className={`pk-v ${signClass(subject?.annualised_return)}`}>{signedPct(subject?.annualised_return)}</div>
        </div>
        <div className="peer-kpi">
          <div className="pk-l">Ann. vol</div>
          <div className="pk-v">{pct(subject?.annualised_vol)}</div>
        </div>
        <div className="peer-kpi">
          <div className="pk-l">Sharpe</div>
          <div className={`pk-v ${signClass(subject?.sharpe)}`}>{num(subject?.sharpe)}</div>
        </div>
        <div className="peer-kpi">
          <div className="pk-l">Max DD</div>
          <div className="pk-v">{pct(subject?.max_drawdown)}</div>
        </div>
        <div className="peer-kpi">
          <div className="pk-l">Peer median Sharpe</div>
          <div className="pk-v">{num(peerMedian?.sharpe)}</div>
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
                  {r.row_type === "candidate" ? `${candidateName} — subject` : fundLabel(r)}
                  {ROW_LABEL[r.row_type] && r.row_type !== "candidate" && (
                    <span className="ctag" style={{ marginLeft: 6 }}>{ROW_LABEL[r.row_type]}</span>
                  )}
                </td>
                <td className={signClass(r.ytd_return)}>{signedPct(r.ytd_return)}</td>
                <td className={signClass(r.annualised_return)}>{signedPct(r.annualised_return)}</td>
                <td>{pct(r.annualised_vol)}</td>
                <td>{num(r.sharpe)}</td>
                <td>{pct(r.max_drawdown)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
