import type { ArtifactPayload } from "../../agui/artifacts";
import { VIEW_SUMMARIES, dynamicIntro } from "./viewSummaries";

/**
 * Card lead-in, matching the LightAssist answer-card grammar: an intro line
 * (data-aware — real counts / leaders / scores from the payload), a "Key points"
 * bullet list, and the per-kind reading note as a blue Tip callout. Always open —
 * this replaced the old collapsible "How to read this" block.
 */
export function ViewSummary({ payload }: { payload: ArtifactPayload }) {
  const s = VIEW_SUMMARIES[payload.kind];
  if (!s) return null;
  const intro = dynamicIntro(payload) ?? s.intro;

  return (
    <div style={{ marginBottom: 18, paddingBottom: 16, borderBottom: "1px solid var(--line2)" }}>
      <p style={{ margin: 0, fontSize: 14.5, color: "var(--ink2)", lineHeight: 1.6 }}>{intro}</p>

      <div style={{ margin: "14px 0 8px", fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>Key points</div>
      <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
        {s.points.map((p) => (
          <li key={p.label} style={{ fontSize: 13.5, color: "var(--ink2)", lineHeight: 1.6 }}>
            <b style={{ color: "var(--ink)" }}>{p.label}:</b> {p.text}
          </li>
        ))}
      </ul>

      {s.note && (
        <div style={{ display: "flex", gap: 10, marginTop: 14, background: "var(--blue-soft)", border: "1px solid var(--blue-bd)", borderRadius: 8, padding: "12px 14px" }}>
          <span style={{ fontSize: 15, lineHeight: 1.4, flexShrink: 0 }}>💡</span>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--blue-ink)" }}>
            <b>Tip.</b> {s.note}
          </p>
        </div>
      )}
    </div>
  );
}
