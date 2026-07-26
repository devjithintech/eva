import type { MatrixRow } from "../../../agui/artifacts";
import { ArtifactFrame } from "./_shared";

interface Col {
  key: keyof Pick<MatrixRow, "cagr" | "sharpe" | "alpha" | "dd">;
  label: string;
  suffix: string;
  signed: boolean;
  dec: number;
}

const COLS: Col[] = [
  { key: "cagr", label: "CAGR", suffix: "%", signed: true, dec: 1 },
  { key: "sharpe", label: "Sharpe", suffix: "", signed: false, dec: 2 },
  { key: "alpha", label: "Alpha", suffix: "%", signed: true, dec: 1 },
  { key: "dd", label: "Max DD", suffix: "%", signed: true, dec: 1 },
];

export function CandidatePool({ title, rows }: { title: string; rows: MatrixRow[] }) {
  const range: Record<string, [number, number]> = {};
  for (const c of COLS) {
    const vals = rows.map((r) => r[c.key]).filter((v): v is number => v != null);
    range[c.key] = vals.length ? [Math.min(...vals), Math.max(...vals)] : [0, 0];
  }

  const fmt = (v: number | null, c: Col) =>
    v == null ? "–" : (c.signed && v > 0 ? "+" : "") + v.toFixed(c.dec) + c.suffix;

  const cellBase: React.CSSProperties = {
    flex: 1,
    padding: "6px 9px",
    textAlign: "right",
    fontSize: 11.5,
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
    borderTop: "1px solid var(--line2)",
  };
  const heat = (v: number | null, c: Col): React.CSSProperties => {
    if (v == null) return { ...cellBase, color: "var(--ink3)", fontWeight: 500 };
    const [lo, hi] = range[c.key];
    const g = hi === lo ? 0.5 : (v - lo) / (hi - lo);
    const d = Math.abs(g - 0.5) * 2;
    const rgb = g >= 0.5 ? "33,157,106" : "221,76,99";
    return { ...cellBase, color: "var(--ink)", background: `rgba(${rgb},${(0.06 + 0.26 * d).toFixed(2)})` };
  };

  return (
    <ArtifactFrame eyebrow="Top-10 comparison" title={title}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--ink3)", marginBottom: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: "rgba(221,76,99,.32)" }} />
        worse
        <span style={{ width: 10, height: 10, borderRadius: 3, background: "rgba(33,157,106,.32)", marginLeft: 4 }} />
        better
      </div>
      <div style={{ border: "1px solid var(--line2)", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "flex", background: "var(--panel2)" }}>
          <Head style={{ width: 26, textAlign: "center" }}>#</Head>
          <Head style={{ flex: 1.5, minWidth: 0 }}>Manager</Head>
          {COLS.map((c) => (
            <Head key={c.key} style={{ flex: 1, textAlign: "right" }}>
              {c.label}
            </Head>
          ))}
        </div>
        {rows.map((r, i) => (
          <div key={r.name} style={{ display: "flex" }}>
            <div style={{ flex: "none", width: 26, padding: "6px 0", textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--ink3)", borderTop: "1px solid var(--line2)", background: r.you ? "var(--asoft)" : undefined }}>
              {i + 1}
            </div>
            <div
              style={{
                flex: 1.5,
                minWidth: 0,
                padding: "6px 10px",
                fontSize: 11.5,
                fontWeight: r.you ? 700 : 600,
                borderTop: "1px solid var(--line2)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                color: r.you ? "var(--acc)" : "var(--ink)",
                background: r.you ? "var(--asoft)" : undefined,
              }}
            >
              {r.name}
            </div>
            {COLS.map((c) => (
              <div key={c.key} style={heat(r[c.key], c)}>
                {fmt(r[c.key], c)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </ArtifactFrame>
  );
}

function Head({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ padding: "7px 9px", fontSize: 10, fontWeight: 700, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".04em", ...style }}>
      {children}
    </div>
  );
}
