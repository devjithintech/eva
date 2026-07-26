import { useReturns } from "../../api/hooks";
import { LoadingState } from "../common/LoadingState";
import { ErrorState } from "../common/ErrorState";
import { StatCard } from "../common/StatCard";

interface Props {
  id: string;
}

/** Trailing-returns view — real data from GET /api/candidates/:id/returns,
 *  which wraps `buildReturns`: growth-of-100 + annual bars derived from the
 *  fund's real annual_returns array (no chart library — hand-rolled SVG). */
export function PerformanceSection({ id }: Props) {
  const { data, loading, error } = useReturns(id);

  if (loading) return <LoadingState label="Loading returns…" />;
  if (error || !data) return <ErrorState message={error ?? "No returns available"} />;

  return (
    <section id="performance" className="sec">
      <div className="sec-head">
        <span className="sec-ic">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          </svg>
        </span>
        <h2>Performance</h2>
      </div>
      <div className="sec-body">
        <div className="ret-stats">
          <StatCard label={`CAGR · ${data.years}-yr`} value={data.cagr} />
          <StatCard label="Cumulative" value={data.cumulative} />
          <StatCard label="Best year" value={data.bestYear} />
          <StatCard label="Worst year" value={data.worstYear} />
          <StatCard label="Positive months" value={data.positiveMonths} />
        </div>

        {data.fundCurve.length > 1 && <GrowthCurve fund={data.fundCurve} benchmark={data.benchmarkCurve} benchmarkLabel={data.benchmarkLabel} />}
        {data.calendar.length > 0 && <AnnualBars calendar={data.calendar} />}
      </div>
    </section>
  );
}

function GrowthCurve({ fund, benchmark, benchmarkLabel }: { fund: number[]; benchmark: number[]; benchmarkLabel: string }) {
  const W = 640, H = 160, L = 8, R = W - 8, T = 8, B = H - 8;
  const x = (i: number, n: number) => L + (i / (n - 1)) * (R - L);
  const y = (v: number) => T + (1 - v) * (B - T);
  const path = (arr: number[]) => arr.map((v, i) => `${i ? "L" : "M"}${x(i, arr.length).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const hasBench = benchmark.length === fund.length;

  return (
    <div className="ret-chart">
      <div className="ret-legend">
        <span>
          <i style={{ background: "var(--primary)" }} /> Fund
        </span>
        {hasBench && (
          <span>
            <i style={{ background: "var(--faint)" }} /> {benchmarkLabel}
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Growth of 100 curve">
        {hasBench && <path d={path(benchmark)} fill="none" stroke="var(--faint)" strokeWidth={1.5} />}
        <path d={path(fund)} fill="none" stroke="var(--primary)" strokeWidth={2.2} strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function AnnualBars({ calendar }: { calendar: { year: string; value: number }[] }) {
  const W = 640, H = 160, L = 8, R = W - 8, T = 16, B = H - 22;
  const vmax = Math.max(0, ...calendar.map((c) => c.value));
  const vmin = Math.min(0, ...calendar.map((c) => c.value));
  const y0 = T + (1 - (0 - vmin) / (vmax - vmin || 1)) * (B - T);
  const slot = (R - L) / calendar.length;
  const bw = Math.min(28, slot * 0.55);

  return (
    <div className="ret-chart" style={{ marginTop: 18 }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Annual returns bar chart">
        <line x1={L} y1={y0} x2={R} y2={y0} stroke="var(--line)" />
        {calendar.map((c, i) => {
          const cx = L + slot * i + slot / 2;
          const yv = T + (1 - (c.value - vmin) / (vmax - vmin || 1)) * (B - T);
          const top = Math.min(y0, yv);
          const h = Math.max(1, Math.abs(y0 - yv));
          return (
            <g key={c.year}>
              <rect x={cx - bw / 2} y={top} width={bw} height={h} rx={2} fill={c.value >= 0 ? "var(--pos)" : "var(--neg)"} />
              <text x={cx} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--muted)">
                {c.year}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
