import { useMemo, useState } from "react";
import { CAND_PEERS, POOL_MEMBERS, SIM_BASE, simCompute } from "./fixtures";

interface Props {
  candidateName: string;
  selectedPeerKeys: Set<string>;
  onOpenPoolDetail: () => void;
}

const PRESETS: { label: string; alloc: number }[] = [
  { label: "Toe-in 2%", alloc: 2 },
  { label: "Base 5%", alloc: 5 },
  { label: "Lean 8%", alloc: 8 },
  { label: "Full 12%", alloc: 12 },
];

const POOL_COLORS = ["#9facd9", "#dc8e88", "#e4bd81", "#c2cd9c", "#90abb2", "#b7a1cc", "#d0c48a", "#8fbfae"];

export function SimulatorView({ candidateName, selectedPeerKeys, onOpenPoolDetail }: Props) {
  const [alloc, setAlloc] = useState(5);

  const candidates = useMemo(
    () => [
      { key: "subject", short: candidateName, fund: candidateName, ret: 12.7, vol: 7.0, dd: -5.3, corr: 0.53, subject: true },
      ...CAND_PEERS.filter((c) => selectedPeerKeys.has(c.key)).map((c) => ({
        key: c.key,
        short: c.short,
        fund: c.fund,
        ret: c.ret,
        vol: c.vol,
        dd: c.dd,
        corr: c.corr,
        subject: false,
      })),
    ],
    [candidateName, selectedPeerKeys],
  );

  const results = candidates
    .map((c) => ({ c, r: simCompute(alloc, c) }))
    .sort((a, b) => b.r.dENS - a.r.dENS);

  const best = results[0];
  const totalWeight = POOL_MEMBERS.reduce((a, m) => a + m[2], 0);

  const d = (v: number, digits = 2, invertGood = false) => {
    const good = invertGood ? v <= 0 : v >= 0;
    return (
      <span className={`simx-d ${Math.abs(v) < 0.005 ? "" : good ? "pos" : "neg"}`}>
        {(v >= 0 ? "+" : "") + v.toFixed(digits)}
      </span>
    );
  };

  return (
    <div className="pl-view">
      <div className="pl-sh">
        <span>What-if simulator — mock reference pool</span>
      </div>
      <div className="sim-shell">
        <div className="sim-head">
          <span className="sim-title">Simulator · Lighthouse Diversified + {results.length} candidate{results.length === 1 ? "" : "s"}</span>
        </div>
        <div className="sim-body">
          <div className="sim-controls">
            <div className="sim-presets">
              {PRESETS.map((p) => (
                <span
                  key={p.label}
                  className={`sim-preset${alloc === p.alloc ? " active" : ""}`}
                  onClick={() => setAlloc(p.alloc)}
                >
                  {p.label}
                </span>
              ))}
            </div>
            <div className="sim-ctrl">
              <div className="sim-ctrl-top">
                <span className="sim-ctrl-lbl">Allocation %</span>
                <span className="sim-ctrl-val">{alloc.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={15}
                step={0.5}
                value={alloc}
                className="sim-slider"
                onChange={(e) => setAlloc(Number(e.target.value))}
              />
            </div>
            <p className="note" style={{ marginTop: 8 }}>
              Identical criteria are applied to every candidate, into the same mock target pool — the marginal-impact
              columns are directly comparable.
            </p>
          </div>
          <div className="sim-results">
            <div className="pool-card">
              <div className="pool-head">
                <span>
                  Current pool —{" "}
                  <button type="button" className="pool-info-btn" onClick={onOpenPoolDetail} title="What is the current pool?">
                    <span className="ig">i</span>LH Diversified · {POOL_MEMBERS.length} PMs
                  </button>
                </span>
                <span style={{ color: "var(--muted)" }}>100%</span>
              </div>
              <div className="pool-bar">
                {POOL_MEMBERS.map((m, i) => (
                  <div
                    key={m[0]}
                    className="pool-seg"
                    style={{ width: `${(m[2] / totalWeight) * 100}%`, background: POOL_COLORS[i % POOL_COLORS.length] }}
                  >
                    {((m[2] / totalWeight) * 100).toFixed(0)}%
                  </div>
                ))}
              </div>
              <div className="pool-legend">
                {POOL_MEMBERS.map((m, i) => (
                  <span key={m[0]}>
                    <span className="pool-legend-dot" style={{ background: POOL_COLORS[i % POOL_COLORS.length] }} />
                    {m[0]}
                  </span>
                ))}
              </div>
            </div>

            <div className="sim-mc">
              <table className="simx-tbl">
                <thead>
                  <tr>
                    <th>Marginal impact at {alloc.toFixed(1)}%</th>
                    <th>Current pool</th>
                    {results.map((x, i) => (
                      <th key={x.c.key} className={x.c.subject ? "subj" : ""}>
                        #{i + 1} {x.c.short}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Ann. return</td>
                    <td>+{SIM_BASE.ret.toFixed(1)}%</td>
                    {results.map((x) => (
                      <td key={x.c.key} className={x.c.subject ? "subj" : ""}>
                        {(x.r.ret >= 0 ? "+" : "") + x.r.ret.toFixed(1)}% {d(x.r.dRet, 2)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Ann. volatility</td>
                    <td>{SIM_BASE.vol.toFixed(1)}%</td>
                    {results.map((x) => (
                      <td key={x.c.key} className={x.c.subject ? "subj" : ""}>
                        {x.r.vol.toFixed(1)}% {d(x.r.dVol, 2, true)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Sharpe</td>
                    <td>{SIM_BASE.sharpe.toFixed(2)}</td>
                    {results.map((x) => (
                      <td key={x.c.key} className={x.c.subject ? "subj" : ""}>
                        {x.r.sharpe.toFixed(2)} {d(x.r.dSharpe, 2)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Max drawdown</td>
                    <td>{SIM_BASE.dd.toFixed(1)}%</td>
                    {results.map((x) => (
                      <td key={x.c.key} className={x.c.subject ? "subj" : ""}>
                        {x.r.dd.toFixed(1)}% {d(x.r.dDD, 2)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Effective N (ENS)</td>
                    <td>{SIM_BASE.ens.toFixed(1)}</td>
                    {results.map((x) => (
                      <td key={x.c.key} className={x.c.subject ? "subj" : ""}>
                        {x.r.ens.toFixed(1)} {d(x.r.dENS, 2)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Max pool corr</td>
                    <td>—</td>
                    {results.map((x) => (
                      <td key={x.c.key} className={x.c.subject ? "subj" : ""}>
                        {x.r.maxcorr.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Verdict</td>
                    <td>—</td>
                    {results.map((x) => (
                      <td key={x.c.key} className={x.c.subject ? "subj" : ""}>
                        {x.r.zone === "pen" ? "PENALTY" : x.r.zone === "app" ? "APPROACHING" : "DIVERSIFYING"}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className={`sim-callout${best.r.zone === "pen" ? " bad" : ""}`}>
              <strong>Best fit — {best.c.short}</strong> at {alloc.toFixed(1)}% into Lighthouse Diversified: ENS Δ{" "}
              {best.r.dENS >= 0 ? "+" : ""}
              {best.r.dENS.toFixed(2)}, Sharpe Δ {best.r.dSharpe >= 0 ? "+" : ""}
              {best.r.dSharpe.toFixed(2)}, max pool corr {best.r.maxcorr.toFixed(2)}.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
