import { useOpportunityMap } from "../../../api/hooks";
import { LoadingState } from "../../common/LoadingState";
import type { PreferenceRange } from "../PreferenceDialog";

const STRONG_GREEN = "#1f6b45";
const POOL_GRAY = "#c7ccd4";

interface Props {
  /** Saved Alpha range from the Preferences dialog — determines which
   *  scored-but-unshortlisted candidates qualify (highlighted green) and the
   *  bounding "Shortlist zone" drawn around them, instead of a fixed
   *  decorative rectangle. */
  alphaRange: PreferenceRange;
}

/** Real-data insights for the Scored tab: a CAGR-vs-drawdown "Selection Zone"
 *  scatter (colored by pipeline stage, with a zone bounding candidates whose
 *  Alpha falls in the saved preference range) and a Pool Composition waffle
 *  chart, both sourced from `GET /opportunity-map` (the same builder the
 *  conversational agent's opportunity-map artifact uses). */
export function ScoredInsights({ alphaRange }: Props) {
  const { data, loading } = useOpportunityMap();

  if (loading) return <LoadingState label="Loading insights…" />;
  if (!data) return null;

  const W = 900, H = 248, L = 54, R = 858, T = 24, B = 196;
  const cagrs = data.points.map((p) => p.cagr);
  const dds = data.points.map((p) => p.dd);
  const cMin = Math.min(0, ...cagrs), cMax = Math.max(...cagrs, 1);
  const dMin = Math.min(...dds, -1), dMax = Math.max(0, ...dds);
  const x = (v: number) => L + ((v - cMin) / (cMax - cMin || 1)) * (R - L);
  const y = (v: number) => T + (1 - (v - dMin) / (dMax - dMin || 1)) * (B - T);

  // "In alpha range": scored-but-unshortlisted candidates whose Alpha falls
  // within the saved Preferences range — real qualification, not a fixed
  // top-N heuristic.
  const inRange = (p: (typeof data.points)[number]) => p.alpha != null && p.alpha >= alphaRange.lo && p.alpha <= alphaRange.hi;
  const scoredPts = data.points.filter((p) => p.stage === "scored");
  const qualifying = scoredPts.filter(inRange);
  const qualifyingNames = new Set(qualifying.map((p) => p.name));
  const colorOf = (p: (typeof data.points)[number]) => {
    if (p.stage === "shortlisted" || p.stage === "interview") return "var(--primary)";
    if (qualifyingNames.has(p.name)) return STRONG_GREEN;
    return POOL_GRAY;
  };
  const radiusOf = (p: (typeof data.points)[number]) => (p.stage === "shortlisted" || p.stage === "interview" ? 7 : qualifyingNames.has(p.name) ? 7 : 5.5);

  // Zone rectangle bounds the actual qualifying points on the cagr/dd axes —
  // "based on this [alpha] selection" — rather than a fixed decorative corner.
  const pad = 16;
  let zoneX = 0, zoneY = 0, zoneW = 0, zoneH = 0, hasZone = false;
  if (qualifying.length > 0) {
    const xs = qualifying.map((p) => x(p.cagr));
    const ys = qualifying.map((p) => y(p.dd));
    zoneX = Math.max(L, Math.min(...xs) - pad);
    zoneY = Math.max(T, Math.min(...ys) - pad);
    zoneW = Math.min(R, Math.max(...xs) + pad) - zoneX;
    zoneH = Math.min(B, Math.max(...ys) + pad) - zoneY;
    hasZone = true;
  }

  const candidatesPct = data.pool.candidates + data.pool.funds > 0
    ? Math.round((data.pool.candidates / (data.pool.candidates + data.pool.funds)) * 100)
    : 0;
  const cols = 13, rows = 8, total = cols * rows;
  const purple = Math.round((total * candidatesPct) / 100);

  return (
    <div className="insights-grid">
      <div className="insight-card ins-sz">
        <div className="ins-head-row">
          <span className="ins-title">Selection Zone</span>
        </div>
        <div className="sz-wrap">
          <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg">
            {hasZone && (
              <>
                <rect x={zoneX} y={zoneY} width={zoneW} height={zoneH} rx={9} fill="#3f9e6a" fillOpacity={0.1} />
                <text x={zoneX + zoneW - 10} y={zoneY + 19} textAnchor="end" fontSize="13" fontWeight="600" fill="#2f7d54">
                  Alpha {alphaRange.lo > 0 ? "+" : ""}
                  {alphaRange.lo}% – {alphaRange.hi > 0 ? "+" : ""}
                  {alphaRange.hi}% zone
                </text>
              </>
            )}
            <line x1={L} y1={T} x2={L} y2={B} stroke="var(--line)" strokeWidth={1.5} />
            <line x1={L} y1={B} x2={R} y2={B} stroke="var(--line)" strokeWidth={1.5} />
            <text x={L + 8} y={T + 12} fontSize="12" fill="var(--faint)">↑ lower drawdown</text>
            <text x={R} y={B - 10} textAnchor="end" fontSize="12" fill="var(--muted)">CAGR →</text>
            {data.points.map((p) => (
              <circle key={p.name} cx={x(p.cagr)} cy={y(p.dd)} r={radiusOf(p)} fill={colorOf(p)} fillOpacity={0.92}>
                <title>
                  {`${p.name} · CAGR ${p.cagr.toFixed(1)}% · Max DD ${p.dd.toFixed(1)}%`}
                  {p.alpha != null ? ` · Alpha ${p.alpha > 0 ? "+" : ""}${p.alpha.toFixed(1)}%` : ""}
                </title>
              </circle>
            ))}
            <circle cx={L + 4} cy={B + 22} r={5.5} fill="var(--primary)" />
            <text x={L + 15} y={B + 26} fontSize="12" fill="var(--muted)">Shortlisted</text>
            <circle cx={L + 144} cy={B + 22} r={5.5} fill={STRONG_GREEN} />
            <text x={L + 155} y={B + 26} fontSize="12" fill="var(--muted)">In alpha range</text>
            <circle cx={L + 316} cy={B + 22} r={5.5} fill={POOL_GRAY} />
            <text x={L + 327} y={B + 26} fontSize="12" fill="var(--muted)">Scored pool</text>
          </svg>
        </div>
      </div>
      <div className="insight-card ins-pool">
        <div className="ins-head-row">
          <span className="ins-title">Pool Composition</span>
        </div>
        <div className="pool-wrap">
          <div className="pool-grid">
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} className="pool-cell" style={{ background: i < purple ? "var(--primary)" : "#3f9e6a" }} />
            ))}
          </div>
          <div className="pool-legend">
            <span className="pl-item">
              <span className="pl-sw" style={{ background: "var(--primary)" }} />
              Candidates <b>{candidatesPct}%</b>
            </span>
            <span className="pl-item">
              <span className="pl-sw" style={{ background: "#3f9e6a" }} />
              Funds <b>{100 - candidatesPct}%</b>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
