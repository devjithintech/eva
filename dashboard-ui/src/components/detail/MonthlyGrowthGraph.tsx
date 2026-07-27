import { useLayoutEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface MonthlyPoint {
  date: string;
  /** Cumulative growth-of-100, expressed as % gain from the start. */
  value: number;
  /** That month's own return, as a signed percentage. */
  ret: number;
}

const STEPS = [1, 2, 5, 10, 20, 25, 50, 100];

function pickStep(range: number): number {
  for (const s of STEPS) if (range / s <= 7) return s;
  return STEPS[STEPS.length - 1];
}

/** Cumulative growth-of-100 curve at monthly granularity, with a hover
 *  crosshair + tooltip (cumulative return and that month's own return) —
 *  matches the reference's own buildGraph()/attachHover() pixel-for-pixel:
 *  same dimensions, thinned/rotated x-axis, and the two-tone net/gross
 *  line color with a fixed dark-green dot/legend swatch. */
export function MonthlyGrowthGraph({
  points,
  basis,
  basisKey,
}: {
  points: MonthlyPoint[];
  basis: string;
  basisKey: "net" | "gross";
}) {
  const W = 880;
  const H = 324;
  const L = 52;
  const R = 16;
  const T = 30;
  const B = 66;
  const pw = W - L - R;
  const ph = H - T - B;

  const [hover, setHover] = useState<{ i: number; clientX: number; clientY: number } | null>(null);
  const [tipPos, setTipPos] = useState({ left: 0, top: 0 });
  const tipRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!hover || !tipRef.current) return;
    const w = tipRef.current.offsetWidth;
    const h = tipRef.current.offsetHeight;
    let left = hover.clientX + 14;
    let top = hover.clientY - 14;
    if (left + w > window.innerWidth - 8) left = hover.clientX - w - 14;
    if (top + h > window.innerHeight - 8) top = hover.clientY - h - 10;
    setTipPos({ left, top });
  }, [hover]);

  if (points.length === 0) return null;

  const vmax0 = Math.max(...points.map((p) => p.value));
  const vmin0 = Math.min(0, ...points.map((p) => p.value));
  const span0 = vmax0 - vmin0;
  const vmin = vmin0 - span0 * 0.06;
  const vmax = vmax0 + span0 * 0.08;
  const step = pickStep(vmax - vmin);
  const y0 = Math.ceil(vmin / step) * step;

  const x = (i: number) => L + (pw * i) / Math.max(1, points.length - 1);
  const y = (v: number) => T + ph * (1 - (v - vmin) / (vmax - vmin));

  const ticks: number[] = [];
  for (let v = y0; v <= vmax + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);

  const tickEvery = points.length > 60 ? 6 : points.length > 30 ? 3 : 1;
  const startYear = points[0].date.slice(0, 4);
  const endYear = points[points.length - 1].date.slice(0, 4);
  const ytd = Number(points[points.length - 1].date.slice(5, 7)) - 1 < 11;

  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const hp = hover ? points[hover.i] : null;

  function handleMove(e: ReactMouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (W / rect.width);
    if (sx < L - 8 || sx > W - R + 8) {
      setHover(null);
      return;
    }
    let i = Math.round(((sx - L) / pw) * (points.length - 1));
    i = Math.max(0, Math.min(points.length - 1, i));
    setHover({ i, clientX: e.clientX, clientY: e.clientY });
  }

  return (
    <div className={`mn-graph ${basisKey}`}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label="Cumulative growth timeline"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        {hover && <line x1={x(hover.i)} x2={x(hover.i)} y1={T} y2={T + ph} className="g-xline" />}
        <text x={L + pw / 2} y={H - 6} textAnchor="middle" className="g-title">
          Cumulative Growth Timeline (Monthly {basis} Returns {startYear} – {endYear}
          {ytd ? " YTD" : ""})
        </text>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} y1={y(t)} x2={W - R} y2={y(t)} className={t === 0 ? "g-zero" : "g-grid"} />
            <text x={L - 8} y={y(t) + 3.5} textAnchor="end" className="g-tick">
              {t}
            </text>
          </g>
        ))}
        {points.map((p, i) => {
          const m = Number(p.date.slice(5, 7)) - 1;
          if (!(m % tickEvery === 0 && (m === 0 || m === 6 || tickEvery < 6))) return null;
          return (
            <g key={p.date}>
              <line x1={x(i)} y1={T + ph} x2={x(i)} y2={T + ph + 5} className="g-axis" />
              <text
                x={x(i)}
                y={T + ph + 18}
                textAnchor="end"
                transform={`rotate(-30 ${x(i)} ${T + ph + 18})`}
                className="g-tick"
              >
                {MONTHS[m]} '{p.date.slice(2, 4)}
              </text>
            </g>
          );
        })}
        <line x1={L} y1={T + ph} x2={W - R} y2={T + ph} className="g-axis" />
        <line x1={L} y1={T} x2={L} y2={T + ph} className="g-axis" />
        <text transform={`rotate(-90) translate(${-(T + ph / 2)}, 14)`} textAnchor="middle" className="g-lab">
          Total Return (%)
        </text>
        <path d={path} className="g-line" />
        {points.map((p, i) => (
          <circle key={p.date} cx={x(i)} cy={y(p.value)} r={1.9} className="g-dot" />
        ))}
        <line x1={L + 14} y1={T + 2} x2={L + 40} y2={T + 2} className="g-line" />
        <circle cx={L + 27} cy={T + 2} r={2.4} className="g-dot" />
        <text x={L + 48} y={T + 6} className="g-leg">
          Portfolio Equity Line
        </text>
        {hover && hp && <circle cx={x(hover.i)} cy={y(hp.value)} r={4.2} className="g-focus" />}
      </svg>
      {hover && hp && (
        <div ref={tipRef} className="g-tip" style={{ left: tipPos.left, top: tipPos.top }}>
          <b>
            {MONTHS[Number(hp.date.slice(5, 7)) - 1]} '{hp.date.slice(2, 4)}
          </b>
          <span>
            Cumulative{" "}
            <i>
              {hp.value >= 0 ? "+" : ""}
              {hp.value.toFixed(2)}%
            </i>
          </span>
          <span>
            Month {basis.toLowerCase()}{" "}
            <i className={hp.ret < 0 ? "dn" : "up"}>
              {hp.ret >= 0 ? "+" : ""}
              {hp.ret.toFixed(2)}%
            </i>
          </span>
        </div>
      )}
    </div>
  );
}
