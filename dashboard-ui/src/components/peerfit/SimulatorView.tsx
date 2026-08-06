import { useEffect, useMemo, useState } from "react";
import { peerFundKeys, useCandidatePeers, useFundNames, useRenderer } from "../../api/hooks";
import type { RunParams } from "../../api/types";
import { LoadingState } from "../common/LoadingState";
import { ErrorState } from "../common/ErrorState";

/** D1-9 row — pool metric before/after adding the subject at the chosen
 *  allocation. Values are raw fractions; `format` says how to render them
 *  (".2%", ".2f", ".0%"). */
interface SimRow {
  metric: string;
  label: string;
  current: number;
  proposed: number;
  delta: number;
  format: string;
}

/** D1-9b row — one simulated candidate, ranked by fit. The service only
 *  returns marginal-impact numbers (not per-candidate absolute metrics), and
 *  `dSharpe` is null when a candidate has too little overlapping history. */
interface CohortRow {
  rank: number;
  fund_id: string;
  is_subject: boolean;
  dENS: number;
  dSharpe: number | null;
  max_pm_corr: number;
  penalty: boolean;
  fit_zone: "diversifying" | "approaching" | "penalty";
}

/** D1-9 `attrs.composition` entry — pool member weights (fractions of NAV,
 *  levered, so they don't sum to 1). Numeric fund ids resolve to names via
 *  the fund hierarchy. */
interface CompositionEntry {
  fund_id: string;
  current_pct: number;
  proposed_pct: number;
}

const ZONE_CHIP: Record<CohortRow["fit_zone"], string> = {
  diversifying: "chip-div",
  approaching: "chip-app",
  penalty: "chip-pen",
};

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

/** Render a raw metric value per the renderer's `format` hint. */
function fmtValue(v: number | null | undefined, format: string): string {
  if (v == null) return "—";
  const m = /^\.(\d+)(%|f)$/.exec(format);
  const digits = m ? Number(m[1]) : 2;
  return m?.[2] === "%" ? `${(v * 100).toFixed(digits)}%` : v.toFixed(digits);
}

/** Owner/candidate prefix of a fund key (see candidateIdOf in api/hooks). */
function ownerOf(fundId: string): string {
  if (fundId.includes("::")) return fundId.split("::")[0];
  if (fundId.includes("--")) return fundId.split("--")[0];
  return fundId;
}

export function SimulatorView({ id, candidateName, params, selectedPeerKeys, onOpenPoolDetail }: Props) {
  const [alloc, setAlloc] = useState(5);
  const [simInclude, setSimInclude] = useState<Set<string>>(new Set(selectedPeerKeys));

  const candidatePeers = useCandidatePeers();
  const fundNames = useFundNames();
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
    () => ({ ...params, allocation_pct: alloc / 100, candidate_peer_set: peerFundKeys(simInclude, candidatePeers.data) }),
    [params, alloc, simInclude, candidatePeers.data],
  );
  const pool = useRenderer<SimRow>("D1-9", id, simParams);
  const cohort = useRenderer<CohortRow>("D1-9b", id, simParams);

  if (pool.loading || cohort.loading) return <LoadingState label="Loading simulator…" />;
  if (pool.error || !pool.data) return <ErrorState message={pool.error ?? "Simulator unavailable"} />;
  if (cohort.error || !cohort.data) return <ErrorState message={cohort.error ?? "Simulator unavailable"} />;

  const byMetric = new Map(pool.data.rows.map((r) => [r.metric, r]));
  const attrs = pool.data.attrs ?? {};

  // Pool composition — members with weight today (the subject enters at 0%).
  const composition = ((attrs.composition as CompositionEntry[]) ?? []).filter((m) => m.current_pct > 0);
  const totalWeight = composition.reduce((a, m) => a + m.current_pct, 0) || 1;
  const poolMemberName = (fundId: string) => fundNames.nameById.get(fundId) ?? fundId;
  const targetPoolName = fundNames.nameById.get(String(attrs.target_pool ?? "")) ?? "LH Diversified Fund";

  // Lever readouts — fractions on the wire, percent on screen.
  const grossExposure = ((attrs.gross_exposure as number) ?? 1.24) * 100;
  const netExposure = ((attrs.net_exposure as number) ?? 0.38) * 100;
  const kellyMultiplier = ((attrs.kelly_multiplier as number) ?? 0.25) * 100;
  const stressRegime = (attrs.regime_selector as string) ?? "Normal";

  const results = cohort.data.rows;
  if (results.length === 0) return <ErrorState message="Simulator returned no candidates" />;
  const best = results[0];
  const penalizedCount = results.filter((x) => x.fit_zone === "penalty").length;
  const calloutClass = best.fit_zone === "penalty" ? " bad" : penalizedCount > 0 ? " warn" : "";

  // Cohort rows carry only fund keys — display names come from the peer
  // roster (candidate peers) or the candidate itself (subject).
  const peerByFund = new Map((candidatePeers.data ?? []).map((c) => [c.analytics_fund_id ?? c.key, c]));
  const shortOf = (x: CohortRow) => (x.is_subject ? candidateName : peerByFund.get(x.fund_id)?.short ?? ownerOf(x.fund_id));
  const fundOf = (x: CohortRow) => peerByFund.get(x.fund_id)?.fund ?? (x.is_subject ? candidateName : x.fund_id);

  const d = (v: number | null, digits = 2, invertGood = false) => {
    if (v == null) return <span className="simx-d">—</span>;
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
                <span className="sim-ctrl-val">{grossExposure.toFixed(0)}%</span>
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
                <span className="sim-ctrl-val">{netExposure.toFixed(0)}%</span>
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
                <span className="sim-ctrl-val">{kellyMultiplier.toFixed(0)}%</span>
              </div>
              <input type="range" min={0} max={200} step={5} value={kellyMultiplier} disabled className="sim-slider" readOnly />
              <div className="sim-range">
                <span>0%</span>
                <span>200%</span>
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
                {candidateName}
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
                    <span className="ig">i</span>{targetPoolName} · {composition.length} PMs
                  </button>{" "}
                  <span className="pool-sub">(baseline · candidate-independent)</span>
                </span>
                <span style={{ color: "var(--muted)" }}>100%</span>
              </div>
              <div className="pool-bar">
                {composition.map((m, i) => (
                  <div
                    key={m.fund_id}
                    className="pool-seg"
                    style={{ width: `${(m.current_pct / totalWeight) * 100}%`, background: POOL_COLORS[i % POOL_COLORS.length] }}
                    title={poolMemberName(m.fund_id)}
                  >
                    {((m.current_pct / totalWeight) * 100).toFixed(0)}%
                  </div>
                ))}
              </div>
              <div className="pool-legend">
                {composition.map((m, i) => (
                  <span key={m.fund_id}>
                    <span className="pool-legend-dot" style={{ background: POOL_COLORS[i % POOL_COLORS.length] }} />
                    {poolMemberName(m.fund_id)}
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
                    {results.map((x) => (
                      <th key={x.fund_id} className={x.is_subject ? "subj" : ""}>
                        #{x.rank} {shortOf(x)}
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
                        {fundOf(x)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Candidate id</td>
                    <td>—</td>
                    {results.map((x) => (
                      <td key={x.fund_id} className={x.is_subject ? "subj" : ""}>
                        {ownerOf(x.fund_id)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Effective N (ENS)</td>
                    <td>{fmtValue(byMetric.get("ens")?.current, byMetric.get("ens")?.format ?? ".2f")}</td>
                    {results.map((x) => (
                      <td key={x.fund_id} className={x.is_subject ? "subj" : ""}>
                        {d(x.dENS, 2)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>Sharpe</td>
                    <td>{fmtValue(byMetric.get("sharpe")?.current, byMetric.get("sharpe")?.format ?? ".2f")}</td>
                    {results.map((x) => (
                      <td key={x.fund_id} className={x.is_subject ? "subj" : ""}>
                        {d(x.dSharpe, 2)}
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

            {/* Pool impact — the subject's before/after on every D1-9 metric.
                Per-candidate absolute metrics aren't served by D1-9b, so this
                table is subject-only. */}
            <div className="sim-mc">
              <table className="simx-tbl">
                <thead>
                  <tr>
                    <th>Pool impact — {candidateName} at {alloc.toFixed(1)}%</th>
                    <th>Current</th>
                    <th>Proposed</th>
                    <th>Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {pool.data.rows.map((r) => (
                    <tr key={r.metric}>
                      <td>{r.label}</td>
                      <td>{fmtValue(r.current, r.format)}</td>
                      <td>{fmtValue(r.proposed, r.format)}</td>
                      <td>
                        <span className={`simx-d ${Math.abs(r.delta) < 1e-9 ? "" : r.delta >= 0 ? "pos" : "neg"}`}>
                          {(r.delta >= 0 ? "+" : "") + fmtValue(r.delta, r.format)}
                        </span>
                      </td>
                    </tr>
                  ))}
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
                  <strong>Best fit — {shortOf(best)}</strong> at {alloc.toFixed(1)}% into {targetPoolName}: ENS Δ{" "}
                  {best.dENS >= 0 ? "+" : ""}
                  {best.dENS.toFixed(2)}, Sharpe Δ{" "}
                  {best.dSharpe == null ? "n/a" : (best.dSharpe >= 0 ? "+" : "") + best.dSharpe.toFixed(2)}, max pool corr{" "}
                  {best.max_pm_corr.toFixed(2)}. {results.length} candidate
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
