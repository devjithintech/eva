import { useState } from "react";
import type { AnalystFlag } from "../../../agui/artifacts";
import { ArtifactFrame } from "./_shared";

/** How many flags to show before the user expands the full list. */
const COLLAPSED_COUNT = 6;

interface Props {
  title: string;
  counts: { high: number; medium: number; low: number };
  flags: AnalystFlag[];
  total: number;
}

const TONE = {
  high: { dot: "var(--neg)", soft: "var(--rsoft)", line: "var(--rline)", text: "var(--rtext)", tag: "HIGH" },
  medium: { dot: "var(--atext)", soft: "var(--asoft2)", line: "var(--aline2)", text: "var(--atext)", tag: "MED" },
  low: { dot: "var(--ink3)", soft: "var(--panel2)", line: "var(--line2)", text: "var(--ink2)", tag: "LOW" },
} as const;

export function AnalystFlags({ title, counts, flags, total }: Props) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? flags : flags.slice(0, COLLAPSED_COUNT);
  const canExpand = flags.length > COLLAPSED_COUNT;

  return (
    <ArtifactFrame eyebrow="Analyst flags" title={title}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 10 }}>
        <CountCard n={counts.high} label="High severity" tone="high" />
        <CountCard n={counts.medium} label="Medium" tone="medium" />
        <CountCard n={counts.low} label="Low / informational" tone="low" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {shown.map((f, i) => {
          const t = TONE[f.severity];
          return (
            <div key={`${f.title}-${i}`} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "8px 12px", background: t.soft, border: `1px solid ${t.line}`, borderRadius: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.dot, marginTop: 5, flex: "none" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{f.title}</div>
                <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 2 }}>{f.detail}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: t.text, flex: "none" }}>{t.tag}</span>
            </div>
          );
        })}
      </div>

      {canExpand && (
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          style={{ marginTop: 14, width: "100%", padding: 11, border: "1px solid var(--line)", background: "var(--panel2)", borderRadius: 11, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--ink2)" }}
        >
          {expanded ? "Show fewer" : `Show all ${total} flags`}
        </button>
      )}
    </ArtifactFrame>
  );
}

function CountCard({ n, label, tone }: { n: number; label: string; tone: keyof typeof TONE }) {
  const t = TONE[tone];
  return (
    <div style={{ background: t.soft, border: `1px solid ${t.line}`, borderRadius: 14, padding: 13 }}>
      <div style={{ fontSize: 24, fontWeight: 600, color: t.text, lineHeight: 1, letterSpacing: "-.02em", fontFamily: "var(--mono)", fontVariantNumeric: "tabular-nums" }}>{n}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: t.text, opacity: 0.85, marginTop: 5 }}>{label}</div>
    </div>
  );
}
