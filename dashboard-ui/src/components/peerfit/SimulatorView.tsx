import { useMemo, useState } from "react";
import { useRenderer } from "../../api/hooks";
import type { RunParams } from "../../api/types";
import { LoadingState } from "../common/LoadingState";
import { ErrorState } from "../common/ErrorState";

interface SimRow {
  metric: string;
  label: string;
  current: number;
  proposed: number;
  delta: number;
  format: string;
}

interface CohortRow {
  rank: number;
  fund_id: string;
  is_subject: boolean;
  short: string;
  ret: number;
  vol: number;
  sharpe: number;
  dd: number;
  ens: number;
  var: number;
  dRet: number;
  dVol: number;
  dSharpe: number;
  dDD: number;
  dENS: number;
  max_pm_corr: number;
  fit_zone: "diversifying" | "approaching" | "penalty";
}

interface PoolMember {
  name: string;
  description: string;
  weight: number;
}

interface Props {
  id: string;
  candidateName: string;
  params: RunParams;
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

export function SimulatorView({ id, params, selectedPeerKeys, onOpenPoolDetail }: Props) {
  const [alloc, setAlloc] = useState(5);

  const simParams = useMemo<RunParams>(() => ({ ...params, allocation_pct: alloc / 100 }), [params, alloc]);
  const pool = useRenderer<SimRow>("D1-9", id, simParams);
  const cohort = useRenderer<CohortRow>("D1-9b", id, simParams);

  if (pool.loading || cohort.loading) return <LoadingState label="Loading simulator…" />;
  if (pool.error || !pool.data) return <ErrorState message={pool.error ?? "Simulator unavailable"} />;
  if (cohort.error || !cohort.data) return <ErrorState message={cohort.error ?? "Simulator unavailable"} />;

  const byMetric = new Map(pool.data.rows.map((r) => [r.metric, r]));
  const attrs = pool.data.attrs ?? {};
  const poolMembers = (attrs.pool_members as PoolMember[]) ?? [];
  const totalWeight = (attrs.pool_total_weight as number) ?? poolMembers.reduce((a, m) => a + m.weight, 0);

  const results = cohort.data.rows;
  const best = results[0];

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
            {selectedPeerKeys.size === 0 && (
              <p className="note" style={{ marginTop: 8 }}>
                No candidate peers selected — showing the subject only.
              </p>
            )}
          </div>
          <div className="sim-results">
            <div className="pool-card">
              <div className="pool-head">
                <span>
                  Current pool —{" "}
                  <button type="button" className="pool-info-btn" onClick={onOpenPoolDetail} title="What is the current pool?">
                    <span className="ig">i</span>LH Diversified · {poolMembers.length} PMs
                  </button>
                </span>
                <span style={{ color: "var(--muted)" }}>100%</span>
              </div>
              <div className="pool-bar">
                {poolMembers.map((m, i) => (
                  <div
                    key={m.name}
                    className="pool-seg"
                    style={{ width: `${(m.weight / totalWeight) * 100}%`, background: POOL_COLORS[i % POOL_COLORS.length] }}
                  >
                    {((m.weight / totalWeight) * 100).toFixed(0)}%
                  </div>
                ))}
              </div>
              <div className="pool-legend">
                {poolMembers.map((m, i) => (
                  <span key={m.name}>
                    <span className="pool-legend-dot" style={{ background: POOL_COLORS[i % POOL_COLORS.length] }} />
                    {m.name}
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
                      <th key={x.fund_id} className={x.is_subject ? "subj" : ""}>
                        #{i + 1} {x.short}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Ann. return</td>
                    <td>+{(byMetric.get("annualised_return")?.current ?? 0).toFixed(1)}%</td>
                    {results.map((x) => (
                      <td key={x.fund_id} className={x.is_subject ? "subj" : ""}>
                        {(x.ret >= 0 ? "+" : "") + x.ret.toFixed(1)}% {d(x.dRet, 2)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Ann. volatility</td>
                    <td>{(byMetric.get("annualised_vol")?.current ?? 0).toFixed(1)}%</td>
                    {results.map((x) => (
                      <td key={x.fund_id} className={x.is_subject ? "subj" : ""}>
                        {x.vol.toFixed(1)}% {d(x.dVol, 2, true)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Sharpe</td>
                    <td>{(byMetric.get("sharpe")?.current ?? 0).toFixed(2)}</td>
                    {results.map((x) => (
                      <td key={x.fund_id} className={x.is_subject ? "subj" : ""}>
                        {x.sharpe.toFixed(2)} {d(x.dSharpe, 2)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Max drawdown</td>
                    <td>{(byMetric.get("max_drawdown")?.current ?? 0).toFixed(1)}%</td>
                    {results.map((x) => (
                      <td key={x.fund_id} className={x.is_subject ? "subj" : ""}>
                        {x.dd.toFixed(1)}% {d(x.dDD, 2)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Effective N (ENS)</td>
                    <td>{(byMetric.get("ens")?.current ?? 0).toFixed(1)}</td>
                    {results.map((x) => (
                      <td key={x.fund_id} className={x.is_subject ? "subj" : ""}>
                        {x.ens.toFixed(1)} {d(x.dENS, 2)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Max pool corr</td>
                    <td>—</td>
                    {results.map((x) => (
                      <td key={x.fund_id} className={x.is_subject ? "subj" : ""}>
                        {x.max_pm_corr.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Verdict</td>
                    <td>—</td>
                    {results.map((x) => (
                      <td key={x.fund_id} className={x.is_subject ? "subj" : ""}>
                        {x.fit_zone.toUpperCase()}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className={`sim-callout${best.fit_zone === "penalty" ? " bad" : ""}`}>
              <strong>Best fit — {best.short}</strong> at {alloc.toFixed(1)}% into Lighthouse Diversified: ENS Δ{" "}
              {best.dENS >= 0 ? "+" : ""}
              {best.dENS.toFixed(2)}, Sharpe Δ {best.dSharpe >= 0 ? "+" : ""}
              {best.dSharpe.toFixed(2)}, max pool corr {best.max_pm_corr.toFixed(2)}.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
