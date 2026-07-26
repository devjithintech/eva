import type { CSSProperties } from "react";
import { ArtifactFrame } from "./_shared";

interface Props {
  title: string;
  funds: string[];
  matrix: (number | null)[][];
}

function fmt(v: number | null): string {
  if (v === null) return "–";
  return (v < 0 ? "−" : "+") + Math.abs(v).toFixed(2);
}

function cellStyle(v: number | null, you: boolean): CSSProperties {
  const base: CSSProperties = {
    padding: "7px 6px",
    textAlign: "center",
    fontSize: 11,
    fontVariantNumeric: "tabular-nums",
    border: "1px solid var(--panel)",
  };
  if (v === null) return { ...base, color: "var(--ink3)", background: "var(--chip)" };
  const mag = Math.abs(v);
  const [rgb, color] = v >= 0 ? ["226,104,86", "var(--neg)"] : ["40,160,124", "var(--gtext)"];
  return {
    ...base,
    fontWeight: 600,
    color,
    background: `rgba(${rgb},${(0.07 + mag * 0.5).toFixed(3)})`,
    boxShadow: you ? "inset 0 0 0 1.5px rgba(99,84,242,.0)" : undefined,
  };
}

export function BenchmarkCorrelation({ title, funds, matrix }: Props) {
  return (
    <ArtifactFrame eyebrow="Benchmark comparison" title={title}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: "var(--ink3)", fontWeight: 600 }}>Correlation</span>
        <span style={{ fontSize: 11, color: "var(--gtext)", fontWeight: 700 }}>−1.0</span>
        <div style={{ flex: 1, maxWidth: 220, height: 9, borderRadius: 5, background: "linear-gradient(90deg,#2aa07c,#cfe9df 38%,var(--chip) 50%,#f4d6cf 62%,#e26856)" }} />
        <span style={{ fontSize: 11, color: "var(--neg)", fontWeight: 700 }}>+1.0</span>
      </div>

      <div style={{ overflowX: "auto", border: "1px solid var(--line2)", borderRadius: 12, background: "var(--panel)" }}>
        <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "max-content", minWidth: "100%", fontVariantNumeric: "tabular-nums" }}>
          <thead>
            <tr>
              <th style={{ position: "sticky", left: 0, zIndex: 2, textAlign: "left", verticalAlign: "bottom", padding: "6px 12px 9px 14px", background: "var(--panel2)", fontSize: 11, fontWeight: 600, color: "var(--ink3)" }}>
                Fund
              </th>
              {funds.map((f, i) => (
                <th key={f} style={{ padding: "6px 0 9px", verticalAlign: "bottom", height: 128, background: i === 0 ? "var(--asoft)" : "var(--panel2)" }}>
                  <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: 10.5, fontWeight: 600, whiteSpace: "nowrap", margin: "0 auto", color: i === 0 ? "var(--acc)" : "var(--ink2)" }}>
                    {f}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {funds.map((name, i) => (
              <tr key={name}>
                <td
                  style={{
                    position: "sticky",
                    left: 0,
                    zIndex: 1,
                    padding: "7px 12px 7px 14px",
                    fontSize: 11.5,
                    whiteSpace: "nowrap",
                    border: "1px solid var(--panel)",
                    background: i === 0 ? "var(--asoft)" : "var(--panel)",
                    color: i === 0 ? "var(--acc)" : "var(--ink)",
                    fontWeight: i === 0 ? 700 : 500,
                  }}
                >
                  {name}
                </td>
                {matrix[i].map((v, j) => (
                  <td key={j} style={cellStyle(v, i === 0)}>
                    {fmt(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 10.5, color: "var(--ink3)", lineHeight: 1.5, marginTop: 10, textWrap: "pretty" }}>
        <b style={{ color: "var(--ink3)" }}>Methodology ·</b> Correlations computed from monthly returns over the configured
        window. Peer universe configurable via "Configure peers" (3,642 funds · 79 pre-built groups). Penalty triggered if
        max PM correlation ≥ 0.60.
      </div>
    </ArtifactFrame>
  );
}
