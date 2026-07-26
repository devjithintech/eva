import { POOL_MEMBERS, SIM_BASE } from "./fixtures";

interface Props {
  open: boolean;
  onClose: () => void;
}

const BASELINE: [string, string][] = [
  ["Ann. return", `+${SIM_BASE.ret.toFixed(1)}%`],
  ["Ann. volatility", `${SIM_BASE.vol.toFixed(1)}%`],
  ["Sharpe", SIM_BASE.sharpe.toFixed(2)],
  ["Max drawdown", `${SIM_BASE.dd.toFixed(1)}%`],
  ["Avg PM corr.", SIM_BASE.corr.toFixed(2)],
  ["Effective N (ENS)", SIM_BASE.ens.toFixed(1)],
  ["95% VaR (1d)", `${SIM_BASE.var.toFixed(1)}%`],
  ["Members", String(POOL_MEMBERS.length)],
];

/** Current-pool detail modal — opened from the Simulator's "Current pool"
 *  info button. Renders the same POOL_MEMBERS/SIM_BASE fixtures the
 *  Simulator itself uses, so the two stay consistent. */
export function PoolDetailModal({ open, onClose }: Props) {
  if (!open) return null;
  const total = POOL_MEMBERS.reduce((a, m) => a + m[2], 0);
  const max = Math.max(...POOL_MEMBERS.map((m) => m[2]));

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
              the <strong>{POOL_MEMBERS.length} active-book PMs</strong> that are members of it. Every marginal-impact
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
              {POOL_MEMBERS.map((m, i) => {
                const pct = (m[2] / total) * 100;
                return (
                  <div className="pm-mem" key={m[0]}>
                    <span className="pm-mem-rank">{i + 1}</span>
                    <span className="pm-mem-name">
                      {m[0]}
                      <small>{m[1]}</small>
                    </span>
                    <span className="pm-mem-bar">
                      <i style={{ width: `${(m[2] / max) * 100}%` }} />
                    </span>
                    <span className="pm-mem-w">{pct.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
            <div className="pm-mem-foot">
              <span>{POOL_MEMBERS.length} PMs</span>
              <span>
                Σ weights = <strong>100.0%</strong>
              </span>
            </div>
          </div>
          <div className="pm-sec">
            <div className="pm-sec-h">Baseline metrics — candidate-independent</div>
            <div className="pm-metrics">
              {BASELINE.map(([l, v]) => (
                <div className="pm-met" key={l}>
                  <div className="pm-met-l">{l}</div>
                  <div className="pm-met-v">{v}</div>
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
