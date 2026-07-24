import type { ScorecardCriterion } from "../../../agui/artifacts";
import { ArrowUpRightIcon } from "../../common/icons";
import { ArtifactFrame, grid6 } from "./_shared";

interface Props {
  title: string;
  overall: number;
  criteria: ScorecardCriterion[];
  recommendation: string;
  recommendationDetail: string;
}

const BAR = { green: "var(--gtext)", violet: "var(--acc)", amber: "var(--atext)" } as const;

export function Scorecard({ title, overall, criteria, recommendation, recommendationDetail }: Props) {
  return (
    <ArtifactFrame eyebrow="Committee scorecard" title={title}>
      <div style={grid6}>
        <div style={{ gridColumn: "span 2", gridRow: "span 2", background: "linear-gradient(150deg,#25a877,#1f8a4c)", borderRadius: 14, padding: 15, color: "#fff", display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 10px 26px -12px rgba(31,138,76,.5)", minHeight: 158 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, opacity: 0.85, textTransform: "uppercase", letterSpacing: ".08em" }}>Overall score</div>
          <div>
            <div style={{ fontSize: 46, fontWeight: 600, lineHeight: 1, letterSpacing: "-.02em", fontFamily: "var(--mono)", fontVariantNumeric: "tabular-nums" }}>{overall.toFixed(1)}</div>
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 5 }}>out of 5 · top quartile</div>
          </div>
        </div>

        <div style={{ gridColumn: "span 4", gridRow: "span 2", background: "var(--panel2)", border: "1px solid var(--line2)", borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 11, justifyContent: "center" }}>
          {criteria.map((c, i) => (
            <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 130, flex: "none", fontSize: 12.5, color: "var(--ink2)" }}>{c.label}</span>
              <div style={{ flex: 1, height: 8, background: "var(--line2)", borderRadius: 5, overflow: "hidden" }}>
                <div style={{ width: `${(c.score / 5) * 100}%`, height: "100%", background: BAR[c.tone], borderRadius: 5, transformOrigin: "left", animation: `grow .7s ease both ${i * 0.05}s` }} />
              </div>
              <span style={{ width: 30, textAlign: "right", fontSize: 12.5, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{c.score.toFixed(1)}</span>
            </div>
          ))}
        </div>

        <div style={{ gridColumn: "span 6", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 16px", background: "var(--gsoft)", border: "1px solid var(--gline)", borderRadius: 14 }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--gtext)" }}>Recommendation: {recommendation}</div>
            <div style={{ fontSize: 12, color: "var(--gtext)", opacity: 0.85, marginTop: 2 }}>{recommendationDetail}</div>
          </div>
          <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 18px", background: "var(--acc)", color: "#fff", border: "none", borderRadius: 11, cursor: "pointer", fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", boxShadow: "0 4px 14px -4px rgba(99,84,242,.5)" }}>
            <ArrowUpRightIcon size={15} width={2.2} />
            Advance for Interview
          </button>
        </div>
      </div>
    </ArtifactFrame>
  );
}
