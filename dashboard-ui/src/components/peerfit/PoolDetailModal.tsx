import { useRenderer } from "../../api/hooks";
import type { RunParams } from "../../api/types";

interface PoolMember {
  name: string;
  description: string;
  weight: number;
}

interface Baseline {
  ret: number;
  vol: number;
  sharpe: number;
  dd: number;
  corr: number;
  ens: number;
  var: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  id: string;
  params: RunParams;
}

/** Current-pool detail modal — opened from the Simulator's "Current pool"
 *  info button. Fetches the same D1-9 renderer SimulatorView uses (baseline
 *  fields are allocation-invariant), so the two stay consistent. */
export function PoolDetailModal({ open, onClose, id, params }: Props) {
  const pool = useRenderer<Record<string, unknown>>("D1-9", open ? id : null, params);
  if (!open) return null;

  const attrs = pool.data?.attrs ?? {};
  const poolMembers = (attrs.pool_members as PoolMember[]) ?? [];
  const baseline = (attrs.baseline as Baseline) ?? { ret: 0, vol: 0, sharpe: 0, dd: 0, corr: 0, ens: 0, var: 0 };
  const total = poolMembers.reduce((a, m) => a + m.weight, 0);
  const max = Math.max(...poolMembers.map((m) => m.weight), 1);

  const BASELINE: [string, string][] = [
    ["Ann. return", `+${baseline.ret.toFixed(1)}%`],
    ["Ann. volatility", `${baseline.vol.toFixed(1)}%`],
    ["Sharpe", baseline.sharpe.toFixed(2)],
    ["Max drawdown", `${baseline.dd.toFixed(1)}%`],
    ["Avg PM corr.", baseline.corr.toFixed(2)],
    ["Effective N (ENS)", baseline.ens.toFixed(1)],
    ["95% VaR (1d)", `${baseline.var.toFixed(1)}%`],
    ["Members", String(poolMembers.length)],
  ];

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal wide" role="dialog" aria-modal="true" aria-label="Current pool detail">
        <div className="modal-head">
          <div className="modal-title">
            Current pool — LH Diversified Fund
            <small>SIMULATOR BASELINE · MASTER VEHICLE</small>
          </div>
          <button className="modal-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-content">
          <div className="pm-banner">
            <span className="pm-banner-ic">i</span>
            <span>
              The simulator baseline is <strong>one Lighthouse master vehicle</strong> — a capital-weighted basket of
              the <strong>{poolMembers.length} active-book PMs</strong> that are members of it. Every marginal-impact
              column in the Simulator is measured against <em>this</em> pool.
            </span>
          </div>
          <div className="pm-sec">
            <div className="pm-sec-h">Composition — member PMs &amp; in-vehicle weights</div>
            <div className="pm-mem-head">
              <span>#</span>
              <span>PM fund</span>
              <span></span>
              <span>Weight</span>
            </div>
            <div className="pm-mem-scroll">
              {poolMembers.map((m, i) => {
                const memberPct = (m.weight / total) * 100;
                return (
                  <div className="pm-mem" key={m.name}>
                    <span className="pm-mem-rank">{i + 1}</span>
                    <span className="pm-mem-name">
                      {m.name}
                      <small>{m.description}</small>
                    </span>
                    <span className="pm-mem-bar">
                      <i style={{ width: `${(m.weight / max) * 100}%` }} />
                    </span>
                    <span className="pm-mem-w">{memberPct.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
            <div className="pm-mem-foot">
              <span>{poolMembers.length} PMs</span>
              <span>
                Σ weights = <strong>100.0%</strong>
              </span>
            </div>
          </div>
          <div className="pm-sec">
            <div className="pm-sec-h">Baseline metrics — candidate-independent</div>
            <div className="pm-metrics">
              {BASELINE.map(([l, valueStr]) => (
                <div className="pm-met" key={l}>
                  <div className="pm-met-l">{l}</div>
                  <div className="pm-met-v">{valueStr}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <div className="modal-foot-info">Recomputed per analysis window.</div>
          <div className="modal-foot-actions">
            <button className="pl-action-btn primary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
