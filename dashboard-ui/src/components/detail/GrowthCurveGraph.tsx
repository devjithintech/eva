/** Cumulative growth line chart — the reference's "Returns by fund" section
 *  charts a monthly cumulative-growth-of-100 curve (`buildGraph()` in its
 *  own script); this dataset only has annual returns, so this plots the
 *  same growth-of-100 concept at annual granularity instead — a real
 *  computed series, not a stand-in bar chart. */
export function niceStep(span: number): number {
  const raw = span / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const norm = raw / mag;
  const step = norm >= 5 ? 5 : norm >= 2 ? 2 : 1;
  return step * mag;
}

export function GrowthCurveGraph({ points }: { points: { label: string; value: number }[] }) {
  const W = 880;
  const H = 240;
  const L = 46;
  const R = 12;
  const T = 26;
  const B = 34;
  const vmax = Math.max(0, ...points.map((p) => p.value));
  const vmin = Math.min(0, ...points.map((p) => p.value));
  const span = vmax - vmin || 1;
  const step = niceStep(span);
  const tickMin = Math.floor(vmin / step) * step;
  const tickMax = Math.ceil(vmax / step) * step;

  const x = (i: number) => L + (points.length > 1 ? (i / (points.length - 1)) * (W - L - R) : (W - L - R) / 2);
  const y = (v: number) => T + (1 - (v - vmin) / span) * (H - T - B);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");

  const ticks: number[] = [];
  for (let t = tickMin; t <= tickMax + 1e-9; t += step) ticks.push(Math.round(t * 100) / 100);

  return (
    <div className="growth-graph">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Cumulative growth timeline">
        <text x={L + (W - L - R) / 2} y={H - 6} textAnchor="middle" className="g-title">
          Cumulative Growth Timeline (Annual Returns {points[0]?.label} – {points[points.length - 1]?.label})
        </text>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} y1={y(t)} x2={W - R} y2={y(t)} className={t === 0 ? "g-zero" : "g-grid"} />
            <text x={L - 8} y={y(t) + 3.5} textAnchor="end" className="g-tick">
              {t}%
            </text>
          </g>
        ))}
        <path d={path} className="g-line" />
        {points.map((p, i) => (
          <circle key={p.label} cx={x(i)} cy={y(p.value)} r={2.4} className="g-dot" />
        ))}
        {points.map((p, i) => (
          <text key={`lbl-${p.label}`} x={x(i)} y={T + (H - T - B) + 18} textAnchor="middle" className="g-tick">
            {p.label}
          </text>
        ))}
        <text transform={`rotate(-90) translate(${-(T + (H - T - B) / 2)}, 14)`} textAnchor="middle" className="g-lab">
          Growth (%)
        </text>
      </svg>
    </div>
  );
}
