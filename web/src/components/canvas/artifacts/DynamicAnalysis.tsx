import type { CSSProperties } from "react";
import type { AnalysisBlock } from "../../../agui/artifacts";
import { Markdown } from "../../chat/Markdown";
import { ArtifactFrame, tabular } from "./_shared";

interface Props {
  title: string;
  subtitle?: string;
  summary?: string;
  narrative?: string;
  blocks: AnalysisBlock[];
}

/**
 * Generic renderer for the dynamic-analysis artifact. The server composes a
 * sequence of primitive blocks (verdict, stat tiles, metric table, bar chart,
 * callout) from the question's intent; this draws whatever it's handed — so new
 * analytical questions render without a bespoke component.
 */
export function DynamicAnalysis({ subtitle, summary, narrative, blocks }: Props) {
  return (
    <ArtifactFrame eyebrow="Analysis" title="">
      {(narrative || summary || subtitle) && (
        <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid var(--line2)" }}>
          {subtitle && <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ink3)" }}>{subtitle}</div>}
          {narrative ? (
            <div style={{ fontSize: 13.5, color: "var(--ink)", marginTop: subtitle ? 8 : 0 }}>
              <Markdown text={narrative} />
            </div>
          ) : (
            summary && <div style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.55, marginTop: subtitle ? 6 : 0 }}>{summary}</div>
          )}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {blocks.map((b, i) => (
          <Block key={i} block={b} />
        ))}
      </div>
    </ArtifactFrame>
  );
}

function Block({ block }: { block: AnalysisBlock }) {
  switch (block.type) {
    case "verdict":
      return <Verdict {...block} />;
    case "statTiles":
      return <StatTiles tiles={block.tiles} />;
    case "metricTable":
      return <MetricTable columns={block.columns} rows={block.rows} />;
    case "barChart":
      return <BarChart label={block.label} bars={block.bars} />;
    case "callout":
      return <div style={{ padding: "10px 14px", background: "var(--panel2)", border: "1px solid var(--line2)", borderRadius: 12, fontSize: 12.5, color: "var(--ink3)", lineHeight: 1.5 }}>{block.text}</div>;
    default:
      return null;
  }
}

const TONE: Record<"green" | "violet" | "amber", { bg: string; line: string; text: string }> = {
  green: { bg: "var(--gsoft)", line: "var(--gline)", text: "var(--gtext)" },
  violet: { bg: "var(--asoft)", line: "var(--aline)", text: "var(--acc)" },
  amber: { bg: "var(--asoft2)", line: "var(--aline2)", text: "var(--atext)" },
};

function Verdict({ winner, reason, tone }: { winner: string; reason: string; tone: "green" | "violet" | "amber" }) {
  const t = TONE[tone];
  return (
    <div style={{ background: t.bg, border: `1px solid ${t.line}`, borderRadius: 14, padding: "13px 16px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: t.text }}>Verdict</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>{winner}</span>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ink2)", marginTop: 5, lineHeight: 1.5 }}>{reason}</div>
    </div>
  );
}

function StatTiles({ tiles }: { tiles: { label: string; value: string; sub?: string }[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(tiles.length, 4)},1fr)`, gap: 10 }}>
      {tiles.map((t, i) => (
        <div key={i} style={{ background: "var(--panel2)", border: "1px solid var(--line2)", borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--ink3)" }}>{t.label}</div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.02em", color: "var(--ink)", marginTop: 5, fontFamily: "var(--mono)", ...tabular }}>{t.value}</div>
          {t.sub && <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 3 }}>{t.sub}</div>}
        </div>
      ))}
    </div>
  );
}

function MetricTable({ columns, rows }: { columns: string[]; rows: { cells: string[]; highlight?: boolean }[] }) {
  const cell: CSSProperties = { padding: "8px 12px", borderTop: "1px solid var(--line2)", whiteSpace: "nowrap" };
  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--line2)", borderRadius: 13 }}>
      <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "100%", fontSize: 12.5, minWidth: columns.length * 92 }}>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} style={{ padding: "9px 12px", background: "var(--primary)", color: "#fff", fontSize: 12, fontWeight: 700, textAlign: i === 0 ? "left" : "right", whiteSpace: "nowrap", position: i === 0 ? "sticky" : undefined, left: i === 0 ? 0 : undefined }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} style={r.highlight ? { background: "var(--asoft)" } : undefined}>
              {r.cells.map((v, ci) => (
                <td
                  key={ci}
                  style={{
                    ...cell,
                    textAlign: ci === 0 ? "left" : "right",
                    fontWeight: ci === 0 ? 600 : r.highlight && ci === r.cells.length - 1 ? 700 : 500,
                    color: ci === 0 ? "var(--ink)" : v === "—" ? "var(--ink3)" : "var(--ink2)",
                    position: ci === 0 ? "sticky" : undefined,
                    left: ci === 0 ? 0 : undefined,
                    background: ci === 0 ? (r.highlight ? "var(--asoft)" : "var(--panel)") : undefined,
                    ...tabular,
                  }}
                >
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BarChart({ label, bars }: { label: string; bars: { label: string; value: number; display: string; highlight?: boolean }[] }) {
  return (
    <div style={{ background: "var(--panel2)", border: "1px solid var(--line2)", borderRadius: 13, padding: "13px 15px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--ink3)", marginBottom: 10 }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {bars.map((b, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 96, flex: "none", fontSize: 12, color: "var(--ink2)", fontWeight: b.highlight ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.label}</div>
            <div style={{ flex: 1, height: 16, background: "var(--chip)", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ width: `${Math.max(2, Math.min(100, b.value * 100))}%`, height: "100%", borderRadius: 6, background: b.highlight ? "linear-gradient(90deg,#7d6ff2,var(--primary-d))" : "var(--mline)" }} />
            </div>
            <div style={{ width: 34, flex: "none", textAlign: "right", fontSize: 12, fontWeight: b.highlight ? 700 : 600, color: b.highlight ? "var(--acc)" : "var(--ink2)", fontFamily: "var(--mono)", ...tabular }}>{b.display}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
