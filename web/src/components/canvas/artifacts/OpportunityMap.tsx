import type { OppPoint } from "../../../agui/artifacts";
import { ArtifactFrame, card, grid6, tabular } from "./_shared";

interface Props {
  title: string;
  funnel: { scored: number; shortlisted: number; interview: number };
  pool: { candidates: number; funds: number };
  points: OppPoint[];
}

// Scatter plot area within the 700×300 viewBox, and the shortlist-zone rect.
const X0 = 110;
const X1 = 660;
const YTOP = 60;
const YBOT = 250;
const ZONE_X = 452;
const ZONE_Y = 162;

export function OpportunityMap({ title, funnel, pool, points }: Props) {
  const total = pool.candidates + pool.funds;
  const violetCells = Math.max(1, Math.min(21, Math.round((pool.candidates / total) * 22)));

  // Map CAGR → x (higher = right), max drawdown → y (less negative = higher).
  const cLo = Math.min(...points.map((p) => p.cagr));
  const cHi = Math.max(...points.map((p) => p.cagr));
  const dLo = Math.min(...points.map((p) => p.dd));
  const dHi = Math.max(...points.map((p) => p.dd));
  const px = (c: number) => (cHi === cLo ? (X0 + X1) / 2 : X0 + ((c - cLo) / (cHi - cLo)) * (X1 - X0));
  const py = (d: number) => (dHi === dLo ? (YTOP + YBOT) / 2 : YBOT - ((d - dLo) / (dHi - dLo)) * (YBOT - YTOP));
  const dots = points.map((p) => {
    const x = px(p.cagr);
    const y = py(p.dd);
    const shortlisted = p.stage === "shortlisted" || p.stage === "interview";
    const color = shortlisted ? "var(--acc)" : x >= ZONE_X && y <= ZONE_Y ? "var(--gtext)" : "var(--mline)";
    return { key: p.name, name: p.name, x, y, color, r: p.stage === "interview" ? 6 : shortlisted ? 5 : 4 };
  });

  return (
    <ArtifactFrame eyebrow="Field insights" title={title}>
      <div style={grid6}>
        <div style={{ gridColumn: "span 6", ...card, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>
            Opportunity map
          </div>
          <svg viewBox="0 0 700 300" style={{ width: "100%", height: "auto", display: "block" }}>
            <defs>
              <linearGradient id="cometP" x1="280" y1="0" x2="660" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="var(--acc)" stopOpacity="0" />
                <stop offset="1" stopColor="var(--acc)" stopOpacity="0.85" />
              </linearGradient>
              <linearGradient id="cometG" x1="280" y1="0" x2="600" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="var(--gtext)" stopOpacity="0" />
                <stop offset="1" stopColor="var(--gtext)" stopOpacity="0.9" />
              </linearGradient>
            </defs>
            <rect x="452" y="40" width="240" height="122" rx="12" fill="var(--gtext)" opacity="0.08" />
            <text x="684" y="60" textAnchor="end" fontSize="13" fontWeight="700" style={{ fill: "var(--gtext)" }} fontFamily="inherit">
              Shortlist zone
            </text>
            <line x1="68" y1="34" x2="68" y2="272" style={{ stroke: "var(--line2)" }} strokeWidth={1} />
            <line x1="68" y1="272" x2="692" y2="272" style={{ stroke: "var(--line2)" }} strokeWidth={1} />
            <text x="78" y="24" fontSize="12" fontWeight="600" style={{ fill: "var(--ink3)" }} fontFamily="inherit">
              ↑ lower drawdown
            </text>
            <text x="690" y="292" textAnchor="end" fontSize="12" fontWeight="600" style={{ fill: "var(--ink3)" }} fontFamily="inherit">
              CAGR →
            </text>
            {dots.map((d) => (
              <circle key={d.key} cx={d.x} cy={d.y} r={d.r} fill={d.color} opacity={d.color === "var(--mline)" ? 0.55 : 1}>
                <title>{d.name}</title>
              </circle>
            ))}
          </svg>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8, fontSize: 11, color: "var(--ink2)", flexWrap: "wrap" }}>
            <Legend color="var(--acc)" label="Shortlisted" />
            <Legend color="var(--gtext)" label="Strong, unshortlisted" />
            <Legend color="var(--mline)" label="Scored pool" />
            <span style={{ marginLeft: "auto", color: "var(--ink3)" }}>
              {points.length} of {pool.candidates} plotted
              {pool.candidates - points.length > 0 && ` · ${pool.candidates - points.length} missing CAGR/drawdown`}
            </span>
          </div>
        </div>

        <div style={{ gridColumn: "span 3", ...card, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 14 }}>
            Pool composition
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 56, marginBottom: 13 }}>
            {Array.from({ length: 22 }, (_, i) => (
              <div key={i} style={{ flex: 1, height: 56, borderRadius: 4, background: i < violetCells ? "var(--acc)" : "var(--gtext)" }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 18, fontSize: 12 }}>
            <PoolLegend color="var(--acc)" n={pool.candidates} label="candidates" />
            <PoolLegend color="var(--gtext)" n={pool.funds} label="funds" />
          </div>
        </div>

        <div style={{ gridColumn: "span 3", ...card, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 16 }}>
            Decision tree
          </div>
          <div style={{ display: "flex" }}>
            <FunnelStep label="Scored" value={funnel.scored} color="var(--acc)" />
            <FunnelStep label="Shortlisted" value={funnel.shortlisted} divider />
            <FunnelStep label="Interview" value={funnel.interview} divider />
          </div>
        </div>
      </div>
    </ArtifactFrame>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: color }} />
      {label}
    </span>
  );
}
function PoolLegend({ color, n, label }: { color: string; n: number; label: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ink2)" }}>
      <span style={{ width: 11, height: 11, borderRadius: 3, background: color }} />
      <b style={{ color: "var(--ink)", ...tabular }}>{n.toLocaleString()}</b> {label}
    </span>
  );
}
function FunnelStep({ label, value, color, divider }: { label: string; value: number; color?: string; divider?: boolean }) {
  return (
    <div style={{ flex: 1, borderLeft: divider ? "1px solid var(--line2)" : undefined, paddingLeft: divider ? 16 : 0 }}>
      <div style={{ fontSize: 13, color: "var(--ink2)", marginBottom: 7 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600, color: color ?? "var(--ink)", lineHeight: 1, letterSpacing: "-.02em", fontFamily: "var(--mono)", ...tabular }}>{value.toLocaleString()}</div>
    </div>
  );
}
