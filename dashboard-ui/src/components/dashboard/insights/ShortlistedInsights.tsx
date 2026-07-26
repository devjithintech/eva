import { useState } from "react";
import { useCandidateMatrix, useCandidates, usePipeline } from "../../../api/hooks";
import { LoadingState } from "../../common/LoadingState";

/* ---------- 5-Year Growth Matrix (decorative) ----------
 * Illustrative benchmark comparison — same as the design reference. There's
 * no monthly return series in the backend to build a true multi-fund
 * drawdown curve, and only annual CAGR (not full growth curves) for real
 * candidates, so this widget stays a faithful port of the mockup's static
 * industry-benchmark illustration rather than an approximation. */
const GM: { name: string; values: number[] }[] = [
  { name: "Bridgewater (Pure Alpha)", values: [10000, 13400, 17956, 24061, 32241, 43204] },
  { name: "D.E. Shaw (Oculus)", values: [10000, 12820, 16435, 21069, 27011, 34629] },
  { name: "AQR (Apex)", values: [10000, 11960, 14304, 17107, 20460, 24471] },
  { name: "Point72 (L/S Equity)", values: [10000, 11750, 13806, 16222, 19061, 22396] },
  { name: "Millennium (World-Wide)", values: [10000, 11050, 12210, 13492, 14909, 16474] },
];
const GMIN = 10000, GMAX = 43204;

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}
function toHex(x: number) {
  const c = Math.max(0, Math.min(255, x));
  return c.toString(16).padStart(2, "0");
}
function heat(t: number): string {
  const c1 = [240, 238, 252], c2 = [108, 92, 240], c3 = [46, 42, 107];
  const [a, b, tt] = t < 0.5 ? [c1, c2, t / 0.5] : [c2, c3, (t - 0.5) / 0.5];
  return `#${toHex(lerp(a[0], b[0], tt))}${toHex(lerp(a[1], b[1], tt))}${toHex(lerp(a[2], b[2], tt))}`;
}

/* ---------- Peak-to-Trough Drawdown (decorative, same illustrative funds as GM) ---------- */
const DD: { name: string; color: string; dash?: string; dots?: boolean; values: number[] }[] = [
  { name: "Point72 (Tight Multi-Manager Bounds)", color: "#4f63d6", dots: true, values: [0, -0.3, -1, -2.2, -3.6, -4.5, -4.2, -3, -1.6, -0.5, 0, 0, -0.4, -1.2, -1.5, -1, -0.3, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: "D.E. Shaw (Systematic Quant Limits)", color: "#2f8f5b", values: [0, -0.5, -1.8, -3.6, -5.8, -7.5, -7, -5.4, -3.4, -1.6, -0.4, 0, -0.6, -2, -3, -2.2, -1, -0.2, 0, 0, 0, 0, 0, 0, 0] },
  { name: "Bridgewater (Macro Swing Footprint)", color: "#e0892b", dash: "7 5", values: [0, -0.8, -2.6, -5.4, -8.6, -11, -11.5, -10.2, -8, -5.4, -3, -1.2, -0.3, -0.6, -0.9, -0.5, -0.1, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: "AQR Capital (Quant Value Cycles)", color: "#d0463a", dash: "2 4", values: [0, -1.2, -3.4, -6.6, -10, -12.6, -13.5, -12.8, -10.8, -8, -5.2, -2.8, -1.2, -1.6, -2, -1.2, -0.4, 0, 0, 0, 0, 0, 0, 0, 0] },
];
const DD_W = 480, DD_H = 300, DD_L = 54, DD_R = 440, DD_T = 14, DD_B = 248, DD_YMIN = -14;
const ddX = (m: number) => DD_L + (m / 24) * (DD_R - DD_L);
const ddY = (v: number) => DD_T + (-v / -DD_YMIN) * (DD_B - DD_T);

type SortMetric = "cagr" | "sharpe" | "alpha" | "dd";
const SORT_OPTIONS: { key: SortMetric; label: string }[] = [
  { key: "cagr", label: "CAGR" },
  { key: "sharpe", label: "Sharpe" },
  { key: "alpha", label: "Alpha" },
  { key: "dd", label: "Max DD" },
];
const fmtMetric = (key: SortMetric, v: number) => (key === "sharpe" ? v.toFixed(2) : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`);

/** Shortlisted-tab insights: real "Top Picks" (ranked from the same matrix
 *  data the table uses) plus decorative Growth Matrix / Drawdown widgets
 *  ported from the design reference. */
export function ShortlistedInsights() {
  const matrix = useCandidateMatrix(true);
  const pipeline = usePipeline();
  const candidates = useCandidates();
  const [sortKey, setSortKey] = useState<SortMetric>("cagr");

  if (matrix.loading || pipeline.loading || candidates.loading) return <LoadingState label="Loading insights…" />;
  if (!matrix.data || !pipeline.data) return null;

  const fundByName = new Map((candidates.data ?? []).map((c) => [c.name, c.fundName]));
  const idByName = new Map((candidates.data ?? []).map((c) => [c.name, c.id]));

  const picks = matrix.data.rows
    .filter((r) => {
      const id = idByName.get(r.name);
      const stage = id ? pipeline.data!.stages[id] ?? "scored" : "scored";
      return stage === "shortlisted" || stage === "interview";
    })
    .filter((r) => r[sortKey] != null)
    .sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number))
    .slice(0, 4);

  return (
    <div className="insights-grid">
      <div className="insight-card ins-growth">
        <div className="ins-head-row">
          <span className="ins-title">5-Year Growth Matrix</span>
          <span className="ins-sub-label">($10k Base)</span>
        </div>
        <div className="gm-wrap">
          <div className="gm-main">
            <table className="gm-table">
              <tbody>
                {GM.map((row) => (
                  <tr key={row.name}>
                    {row.values.map((v, i) => {
                      const t = (v - GMIN) / (GMAX - GMIN);
                      return (
                        <td key={i} className="gm-cell" style={{ background: heat(t), color: t > 0.42 ? "#fff" : "var(--ink)" }}>
                          ${v.toLocaleString("en-US")}
                        </td>
                      );
                    })}
                    <td className="gm-rowlab">{row.name}</td>
                  </tr>
                ))}
                <tr>
                  {["Y0", "Y1", "Y2", "Y3", "Y4", "Y5"].map((y) => (
                    <td key={y} className="gm-colhead">{y}</td>
                  ))}
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="insight-card ins-picks">
        <div className="ins-head-row">
          <span className="ins-title">Top Picks</span>
          <label className="tp-ctrl">
            by:{" "}
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortMetric)}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>
        {picks.length === 0 ? (
          <div className="cfd-empty">No shortlisted candidates yet.</div>
        ) : (
          <ol className="tp-list">
            {picks.map((p, i) => (
              <li className="tp-item" key={p.name}>
                <span className="tp-rank">{i + 1}.</span>
                <div className="tp-body">
                  <div className="tp-name">{fundByName.get(p.name) ?? p.name}</div>
                  <div className="tp-by">by {p.name}</div>
                </div>
                <div className="tp-metric">
                  <div className={`tp-val ${sortKey === "dd" ? "neg" : "pos"}`}>{fmtMetric(sortKey, p[sortKey] as number)}</div>
                  {p.alpha != null && <div className="tp-sec">+{p.alpha.toFixed(1)}</div>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="insight-card ins-draw">
        <div className="ins-head-row">
          <span className="ins-title">Peak-to-Trough Drawdown</span>
        </div>
        <div className="dd-wrap">
          <svg viewBox={`0 0 ${DD_W} ${DD_H}`} xmlns="http://www.w3.org/2000/svg">
            {Array.from({ length: 8 }, (_, i) => -i * 2).map((g) => (
              <g key={g}>
                <line x1={DD_L} y1={ddY(g)} x2={DD_R} y2={ddY(g)} stroke="var(--line)" strokeWidth={1} strokeDasharray={g === 0 ? undefined : "2 3"} />
                <text x={DD_L - 8} y={ddY(g) + 3.5} textAnchor="end" fontSize="10" fill="var(--faint)">{g.toFixed(1)}%</text>
              </g>
            ))}
            {Array.from({ length: 13 }, (_, i) => i * 2).map((m) => (
              <text key={m} x={ddX(m)} y={DD_B + 16} textAnchor="middle" fontSize="10" fill="var(--faint)">{m}</text>
            ))}
            <polygon
              points={`${ddX(0)},${ddY(0)} ${DD[0].values.map((v, m) => `${ddX(m)},${ddY(v)}`).join(" ")} ${ddX(24)},${ddY(0)}`}
              fill="#4f63d6"
              fillOpacity={0.09}
            />
            {DD.map((s) => (
              <g key={s.name}>
                <polyline
                  points={s.values.map((v, m) => `${ddX(m)},${ddY(v)}`).join(" ")}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2.2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray={s.dash}
                />
                {s.dots && s.values.map((v, m) => <circle key={m} cx={ddX(m)} cy={ddY(v)} r={1.8} fill={s.color} />)}
              </g>
            ))}
            <text x={(DD_L + DD_R) / 2} y={DD_H - 6} textAnchor="middle" fontSize="10.5" fill="var(--muted)">Timeline Horizon (Months Elapsed)</text>
            <text x={14} y={(DD_T + DD_B) / 2} textAnchor="middle" fontSize="10" fill="var(--muted)" transform={`rotate(-90 14 ${(DD_T + DD_B) / 2})`}>
              Distance From Peak Net Asset Value (%)
            </text>
            {DD.map((s, i) => {
              const lx = DD_R - 158, ly = DD_B - 64 + i * 13.5;
              return (
                <g key={s.name}>
                  <line x1={lx} y1={ly} x2={lx + 20} y2={ly} stroke={s.color} strokeWidth={2.2} strokeDasharray={s.dash} />
                  <text x={lx + 25} y={ly + 3} fontSize="8.5" fill="var(--slate)">{s.name}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
