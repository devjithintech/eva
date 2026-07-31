import { useEffect, useMemo, useState } from "react";
import { useCandidatePeers, useRenderer } from "../../api/hooks";
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
  fund_name: string;
  candidate_id: string;
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

const ZONE_CHIP: Record<CohortRow["fit_zone"], string> = {
  diversifying: "chip-div",
  approaching: "chip-app",
  penalty: "chip-pen",
};

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

export function SimulatorView({ id, candidateName, params, selectedPeerKeys, onOpenPoolDetail }: Props) {
  const [alloc, setAlloc] = useState(5);
  const [simInclude, setSimInclude] = useState<Set<string>>(new Set(selectedPeerKeys));

  const candidatePeers = useCandidatePeers();
  const availablePeers = (candidatePeers.data ?? []).filter((c) => selectedPeerKeys.has(c.key));

  const peerKeysSig = Array.from(selectedPeerKeys).sort().join(",");
  useEffect(() => {
    setSimInclude(new Set(selectedPeerKeys));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerKeysSig]);

  const toggleInclude = (key: string) =>
    setSimInclude((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const simParams = useMemo<RunParams>(
    () => ({ ...params, allocation_pct: alloc / 100, candidate_peer_set: Array.from(simInclude) }),
    [params, alloc, simInclude],
  );
  const pool = useRenderer<SimRow>("D1-9", id, simParams);
  const cohort = useRenderer<CohortRow>("D1-9b", id, simParams);

  if (pool.loading || cohort.loading) return <LoadingState label="Loading simulator…" />;
  if (pool.error || !pool.data) return <ErrorState message={pool.error ?? "Simulator unavailable"} />;
  if (cohort.error || !cohort.data) return <ErrorState message={cohort.error ?? "Simulator unavailable"} />;

  const byMetric = new Map(pool.data.rows.map((r) => [r.metric, r]));
  const attrs = pool.data.attrs ?? {};
  const poolMembers = (attrs.pool_members as PoolMember[]) ?? [];
  const totalWeight = (attrs.pool_total_weight as number) ?? poolMembers.reduce((a, m) => a + m.weight, 0);
  const grossExposure = (attrs.gross_exposure_pct as number) ?? 124;
  const netExposure = (attrs.net_exposure_pct as number) ?? 38;
  const kellyMultiplier = (attrs.kelly_multiplier_pct as number) ?? 25;
  const stressRegime = (attrs.stress_regime as string) ?? "Normal";

  const results = cohort.data.rows;
  const best = results[0];
  const subjectShort = results.find((x) => x.is_subject)?.short ?? candidateName;
  const penalizedCount = results.filter((x) => x.fit_zone === "penalty").length;
  const calloutClass = best.fit_zone === "penalty" ? " bad" : penalizedCount > 0 ? " warn" : "";

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
      <div className="sim-shell">
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
              <div className="sim-range">
                <span>0%</span>
                <span>15%</span>
              </div>
            </div>
            <div className="sim-ctrl disabled">
              <div className="sim-ctrl-top">
                <span className="sim-ctrl-lbl">Gross exposure</span>
                <span className="sim-ctrl-val">{grossExposure}%</span>
              </div>
              <input type="range" min={80} max={200} step={2} value={grossExposure} disabled className="sim-slider" readOnly />
              <div className="sim-range">
                <span>80%</span>
                <span>200%</span>
              </div>
            </div>
            <div className="sim-ctrl disabled">
              <div className="sim-ctrl-top">
                <span className="sim-ctrl-lbl">Net exposure</span>
                <span className="sim-ctrl-val">{netExposure}%</span>
              </div>
              <input type="range" min={0} max={80} step={2} value={netExposure} disabled className="sim-slider" readOnly />
              <div className="sim-range">
                <span>0%</span>
                <span>80%</span>
              </div>
            </div>
            <div className="sim-ctrl disabled">
              <div className="sim-ctrl-top">
                <span className="sim-ctrl-lbl">Kelly multiplier</span>
                <span className="sim-ctrl-val">{kellyMultiplier}%</span>
              </div>
              <input type="range" min={10} max={60} step={1} value={kellyMultiplier} disabled className="sim-slider" readOnly />
              <div className="sim-range">
                <span>10%</span>
                <span>60%</span>
              </div>
            </div>
            <div className="sim-ctrl disabled">
              <div className="sim-ctrl-top">
                <span className="sim-ctrl-lbl">Stress regime</span>
                <span className="sim-ctrl-val">{stressRegime}</span>
              </div>
              <input type="range" min={0} max={3} step={1} value={0} disabled className="sim-slider" readOnly />
              <div className="sim-range">
                <span>Normal</span>
                <span>2008-style</span>
              </div>
            </div>
            <p className="note" style={{ marginTop: 8 }}>
              Identical criteria are applied to every selected candidate, into the same target pool — so the
              marginal-impact columns are directly comparable.
            </p>
          </div>
          <div className="sim-results">
            <div className="sim-inc-chips">
              <span className="ccl">Include &amp; simulate</span>
              <span className="sim-inc-chip on subj">
                <span className="ck" />
                {subjectShort}
              </span>
              {availablePeers.map((c) => {
                const on = simInclude.has(c.key);
                return (
                  <span
                    key={c.key}
                    className={`sim-inc-chip${on ? " on" : ""}`}
                    onClick={() => toggleInclude(c.key)}
                  >
                    <span className="ck" />
                    {c.short}
                  </span>
                );
              })}
              {availablePeers.length === 0 && (
                <span className="note">Turn on candidate peers (config strip above) to compare more than one at once.</span>
              )}
            </div>
            <div className="pool-card">
              <div className="pool-head">
                <span>
                  Current pool —{" "}
                  <button type="button" className="pool-info-btn" onClick={onOpenPoolDetail} title="What is the current pool?">
                    <span className="ig">i</span>LH Diversified Fund · {poolMembers.length} PMs
                  </button>{" "}
                  <span className="pool-sub">(baseline · candidate-independent)</span>
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
                    <td>Fund</td>
                    <td>—</td>
                    {results.map((x) => (
                      <td key={x.fund_id} className={x.is_subject ? "subj" : ""}>
                        {x.fund_name}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Candidate id</td>
                    <td>—</td>
                    {results.map((x) => (
                      <td key={x.fund_id} className={x.is_subject ? "subj" : ""}>
                        {x.candidate_id}
                      </td>
                    ))}
                  </tr>
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
                        <span className={`vz ${ZONE_CHIP[x.fit_zone]}`}>{x.fit_zone.toUpperCase()}</span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className={`sim-callout${calloutClass}`}>
              {best.fit_zone === "penalty" ? (
                <>
                  <strong>
                    All {results.length} candidate{results.length === 1 ? "" : "s"} penalised at {alloc.toFixed(1)}% under {stressRegime}.
                  </strong>{" "}
                  Every max-pool correlation sits at/above the 0.60 threshold — reduce allocation or test an alternative pool.
                </>
              ) : (
                <>
                  <strong>Best fit — {best.short}</strong> at {alloc.toFixed(1)}% into Lighthouse Diversified: ENS Δ{" "}
                  {best.dENS >= 0 ? "+" : ""}
                  {best.dENS.toFixed(2)}, Sharpe Δ {best.dSharpe >= 0 ? "+" : ""}
                  {best.dSharpe.toFixed(2)}, max pool corr {best.max_pm_corr.toFixed(2)}. {results.length} candidate
                  {results.length === 1 ? "" : "s"} simulated under identical levers
                  {penalizedCount > 0 ? ` · ${penalizedCount} hit the 0.60 penalty` : ""}.
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
