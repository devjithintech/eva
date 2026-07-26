/** Annual bar chart — mirrors the reference's client-side conversion of an
 *  annual-returns table into an `.an-graph` bar chart (bars diverge from a
 *  zero baseline, colored by sign). Shared between PerformanceSection
 *  (per-snapshot annual_returns) and ReturnsByFundSection (the picked
 *  return series from GET /api/candidates/:id/returns) — same visual, two
 *  different real data sources with different field names, hence the
 *  generic {label, value} row shape. */
export function AnnualBarGraph({ rows }: { rows: { label: string; value: number }[] }) {
  const W = 880;
  const H = 220;
  const L = 8;
  const R = 8;
  const T = 20;
  const B = 34;
  const vmax = Math.max(0, ...rows.map((r) => r.value));
  const vmin = Math.min(0, ...rows.map((r) => r.value));
  const span = vmax - vmin || 1;
  const y = (v: number) => T + (1 - (v - vmin) / span) * (H - T - B);
  const y0 = y(0);
  const slot = (W - L - R) / rows.length;
  const bw = Math.min(28, slot * 0.55);

  return (
    <div className="an-graph">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Annual returns bar chart">
        <line x1={L} y1={y0} x2={W - R} y2={y0} className="g-zero" />
        {rows.map((r, i) => {
          const cx = L + slot * i + slot / 2;
          const yv = y(r.value);
          const pos = r.value >= 0;
          const top = Math.min(y0, yv);
          const h = Math.max(1, Math.abs(y0 - yv));
          return (
            <g key={r.label}>
              <rect x={cx - bw / 2} y={top} width={bw} height={h} className={`bar ${pos ? "p" : "n"}`} />
              <text x={cx} y={pos ? top - 6 : top + h + 13} textAnchor="middle" className={`bl ${pos ? "p" : "n"}`}>
                {r.value.toFixed(1)}%
              </text>
              <text x={cx} y={H - 8} textAnchor="middle" className="g-tick">
                {r.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
