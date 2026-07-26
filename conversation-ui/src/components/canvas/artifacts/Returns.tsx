import { ArtifactFrame, card, grid6, tabular } from "./_shared";

interface Props {
  title: string;
  years: number;
  cagr: string;
  cumulative: string;
  bestYear: string;
  worstYear: string;
  positiveMonths: string;
  fundCurve: number[];
  benchmarkCurve: number[];
  benchmarkLabel: string;
  calendar: { year: string; value: number }[];
}

const X0 = 20;
const X1 = 580;
const TOP = 23;
const BOT = 142;

function points(curve: number[]): string {
  const n = curve.length - 1 || 1;
  return curve
    .map((v, i) => `${X0 + ((X1 - X0) * i) / n},${(BOT - v * (BOT - TOP)).toFixed(0)}`)
    .join(" ");
}

export function Returns(props: Props) {
  const fundPts = points(props.fundCurve);
  const benchPts = points(props.benchmarkCurve);
  const max = Math.max(...props.calendar.map((c) => Math.abs(c.value)), 1);

  return (
    <ArtifactFrame eyebrow={`${props.years}-year performance`} title={props.title}>
      <div style={grid6}>
        <div style={{ gridColumn: "span 2", gridRow: "span 2", background: "linear-gradient(150deg,#7d6ff2,var(--primary-d))", borderRadius: 14, padding: 15, display: "flex", flexDirection: "column", justifyContent: "space-between", color: "#fff", boxShadow: "0 10px 26px -12px rgba(108,92,240,.5)", minHeight: 150 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, opacity: 0.82, textTransform: "uppercase", letterSpacing: ".08em" }}>CAGR · {props.years}-year</div>
          <div>
            <div style={{ fontSize: 36, fontWeight: 600, letterSpacing: "-.02em", lineHeight: 1, fontFamily: "var(--mono)", ...tabular }}>{props.cagr}</div>
            <div style={{ fontSize: 11.5, opacity: 0.9, marginTop: 7 }}>
              Cumulative <b>{props.cumulative}</b>
            </div>
          </div>
        </div>

        <div style={{ gridColumn: "span 4", gridRow: "span 2", ...card, padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink2)" }}>Growth of ₩100</div>
            <div style={{ display: "flex", gap: 12, fontSize: 10.5 }}>
              <Legend color="var(--acc)" label="ANDA" />
              <Legend color="var(--mline)" label={props.benchmarkLabel} />
            </div>
          </div>
          <svg viewBox="0 0 600 158" style={{ width: "100%", height: "auto", display: "block" }}>
            <defs>
              <linearGradient id="ret-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--acc)" stopOpacity="0.16" />
                <stop offset="1" stopColor="var(--acc)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[40, 95, 150].map((y) => (
              <line key={y} x1={X0} y1={y} x2={585} y2={y} style={{ stroke: "var(--line2)" }} strokeWidth={1} />
            ))}
            <polygon points={`${fundPts} ${X1},${BOT} ${X0},${BOT}`} fill="url(#ret-fill)" />
            <polyline points={benchPts} fill="none" style={{ stroke: "var(--mline)" }} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={fundPts} fill="none" style={{ stroke: "var(--acc)" }} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <StatTile label="Best year" value={props.bestYear} soft="var(--gsoft)" line="var(--gline)" text="var(--gtext)" />
        <StatTile label="Worst year" value={props.worstYear} soft="var(--rsoft)" line="var(--rline)" text="var(--rtext)" />
        <StatTile label="Positive months" value={props.positiveMonths} />

        <div style={{ gridColumn: "span 6", ...card, padding: "13px 14px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink2)", marginBottom: 8 }}>Calendar-year returns</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 120 }}>
            {props.calendar.map((c) => {
              const h = (Math.abs(c.value) / max) * 78 + 8;
              const pos = c.value >= 0;
              return (
                <div key={c.year} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 4, ...tabular }}>
                    {pos ? "+" : "−"}
                    {Math.abs(c.value).toFixed(1)}
                  </div>
                  <div style={{ width: "70%", height: h, borderRadius: 4, background: pos ? "var(--gtext)" : "var(--neg)" }} />
                  <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 6 }}>{c.year}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ArtifactFrame>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--ink2)" }}>
      <span style={{ width: 10, height: 3, borderRadius: 2, background: color }} />
      {label}
    </span>
  );
}

function StatTile({ label, value, soft, line, text }: { label: string; value: string; soft?: string; line?: string; text?: string }) {
  return (
    <div style={{ gridColumn: "span 2", background: soft ?? "var(--panel2)", border: `1px solid ${line ?? "var(--line2)"}`, borderRadius: 14, padding: "12px 13px" }}>
      <div style={{ fontSize: 10.5, color: text ?? "var(--ink3)", fontWeight: 600, marginBottom: 5, opacity: 0.85 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: text ?? "var(--ink)", ...tabular }}>{value}</div>
    </div>
  );
}
