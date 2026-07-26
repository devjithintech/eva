import { PEER_FUNDS } from "./fixtures";

interface Row {
  name: string;
  ytd: number;
  ann: number;
  vol: number;
  sharpe: number;
  dd: number;
}

function mockRow(name: string, i: number): Row {
  // Deterministic mock figures, descending by sharpe like the reference table.
  const sharpe = Math.max(0.3, 1.45 - i * 0.06);
  return {
    name,
    ytd: 14.2 - i * 0.5,
    ann: 12.7 - i * 0.4,
    vol: 7.0 + i * 0.15,
    sharpe: Math.round(sharpe * 100) / 100,
    dd: -5.3 - i * 0.4,
  };
}

interface Props {
  candidateName: string;
  onOpenCandidates: () => void;
}

export function PeerTableView({ candidateName, onOpenCandidates }: Props) {
  const rows: Row[] = [mockRow(candidateName, 0), ...PEER_FUNDS.map((n, i) => mockRow(n, i + 1))];
  const median = rows[Math.floor(rows.length / 2)];

  return (
    <div className="pl-view">
      <div className="pl-sh">
        <span>
          Peer group statistics — <span style={{ color: "var(--primary)", fontWeight: 600 }}>Mock reference set</span>
        </span>
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span>{rows.length - 1} peers · ranked by Sharpe</span>
          <button type="button" className="pl-sh-action" onClick={onOpenCandidates}>
            Candidates…
          </button>
        </span>
      </div>
      <div className="peer-strip">
        <div className="peer-kpi">
          <div className="pk-l">YTD return</div>
          <div className="pk-v pos">+{rows[0].ytd.toFixed(1)}%</div>
        </div>
        <div className="peer-kpi">
          <div className="pk-l">Ann. return</div>
          <div className="pk-v pos">+{rows[0].ann.toFixed(1)}%</div>
        </div>
        <div className="peer-kpi">
          <div className="pk-l">Ann. vol</div>
          <div className="pk-v">{rows[0].vol.toFixed(1)}%</div>
        </div>
        <div className="peer-kpi">
          <div className="pk-l">Sharpe</div>
          <div className="pk-v pos">{rows[0].sharpe.toFixed(2)}</div>
        </div>
        <div className="peer-kpi">
          <div className="pk-l">Max DD</div>
          <div className="pk-v">{rows[0].dd.toFixed(1)}%</div>
        </div>
        <div className="peer-kpi">
          <div className="pk-l">Peer median Sharpe</div>
          <div className="pk-v">{median.sharpe.toFixed(2)}</div>
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
              <tr key={r.name} className={i === 0 ? "cand" : ""}>
                <td>{i === 0 ? `${r.name} — subject` : r.name}</td>
                <td className="pos">+{r.ytd.toFixed(1)}%</td>
                <td className="pos">+{r.ann.toFixed(1)}%</td>
                <td>{r.vol.toFixed(1)}%</td>
                <td>{r.sharpe.toFixed(2)}</td>
                <td>{r.dd.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
