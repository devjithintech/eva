/** Tiered area chart of a fund's long (positive market-value) holdings,
 *  largest first — mirrors the reference's own tier-banded bar/area chart
 *  exactly: same 4 size tiers (>=40%/17%/8.6%/rest of the top holding),
 *  same per-tier fill/line colors, and value labels on the top two tiers. */
const TIERS = [
  { t: 0.4, fill: "#f7d571", line: "#f0ad2d", fo: 0.78 },
  { t: 0.17, fill: "#cfcfcf", line: "#9b9b9b", fo: 0.75 },
  { t: 0.086, fill: "#a9c6e8", line: "#4f88c7", fo: 0.75 },
  { t: -1, fill: "#f4c9a0", line: "#e07f35", fo: 0.75 },
];

function tierOf(v: number, max: number): number {
  for (let i = 0; i < TIERS.length; i++) if (v >= max * TIERS[i].t) return i;
  return TIERS.length - 1;
}

const fmtB = (v: number) => `${(v / 1e9).toFixed(2)}B`;

export function PortfolioValueGraph({ rows, currency }: { rows: { instrument: string; value: number }[]; currency: string }) {
  const N = rows.length;
  const max = rows[0].value;
  const L = 56;
  const R = 14;
  const T = 24;
  const B = 118;
  const W = 56 + 14 + N * 36;
  const H = 430;
  const pw = W - L - R;
  const ph = H - T - B;
  const yMaxB = Math.max(1, Math.ceil(max / 1e9));
  const yst = yMaxB > 6 ? 2 : 1;

  const x = (i: number) => L + (pw * (i + 0.5)) / N;
  const y = (v: number) => T + ph * (1 - v / (yMaxB * 1e9));

  const ticks: number[] = [];
  for (let g = 0; g <= yMaxB; g += yst) ticks.push(g);

  const tierIdx = rows.map((r) => tierOf(r.value, max));
  const segments: { start: number; lastInTier: number; end: number; tier: number }[] = [];
  let i = 0;
  while (i < N) {
    const t = tierIdx[i];
    let j = i;
    while (j < N - 1 && tierIdx[j + 1] === t) j++;
    const end = Math.min(j + 1, N - 1);
    segments.push({ start: i, lastInTier: j, end, tier: t });
    i = j + 1;
  }

  return (
    <div className="pf-graph">
      <div className="pf-scroll">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} xmlns="http://www.w3.org/2000/svg">
          {ticks.map((g) => (
            <g key={g}>
              <line x1={L} y1={y(g * 1e9)} x2={W - R} y2={y(g * 1e9)} className="g-grid" />
              <text x={L - 8} y={y(g * 1e9) + 3.5} textAnchor="end" className="g-tick">
                {g}
              </text>
            </g>
          ))}
          {segments.map((seg, si) => {
            let path = `M${x(seg.start).toFixed(1)} ${y(0).toFixed(1)}`;
            for (let k = seg.start; k <= seg.end; k++) path += `L${x(k).toFixed(1)} ${y(rows[k].value).toFixed(1)}`;
            path += `L${x(seg.end).toFixed(1)} ${y(0).toFixed(1)}Z`;
            let linePath = "";
            for (let k = seg.start; k <= seg.end; k++) linePath += `${k === seg.start ? "M" : "L"}${x(k).toFixed(1)} ${y(rows[k].value).toFixed(1)}`;
            const tier = TIERS[seg.tier];
            return (
              <g key={si}>
                <path d={path} fill={tier.fill} fillOpacity={tier.fo} />
                <path d={linePath} fill="none" stroke={tier.line} strokeWidth={2.4} strokeLinejoin="round" />
                {Array.from({ length: seg.lastInTier - seg.start + 1 }, (_, off) => seg.start + off).map((k) => (
                  <line key={k} x1={x(k)} y1={y(0)} x2={x(k)} y2={y(rows[k].value)} stroke={tier.line} strokeOpacity={0.35} strokeWidth={1} />
                ))}
              </g>
            );
          })}
          {rows.map(
            (r, k) =>
              tierIdx[k] <= 1 && (
                <text key={`lbl-${k}`} x={x(k) + 6} y={y(r.value) - 8} className="vlbl">
                  {fmtB(r.value)}
                </text>
              ),
          )}
          <line x1={L} y1={y(0)} x2={W - R} y2={y(0)} className="g-axis" />
          {rows.map((r, k) => (
            <text key={`xl-${k}`} x={x(k)} y={T + ph + 14} textAnchor="end" transform={`rotate(-40 ${x(k)} ${T + ph + 14})`} className="g-tick">
              {r.instrument}
            </text>
          ))}
          <text transform={`rotate(-90) translate(${-(T + ph / 2)},16)`} textAnchor="middle" className="g-lab">
            Market Value (Billion {currency})
          </text>
        </svg>
      </div>
      <div className="pf-title">Portfolio Value Area Chart</div>
    </div>
  );
}
