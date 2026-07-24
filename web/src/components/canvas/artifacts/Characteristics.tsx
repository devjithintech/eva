import type { Candidate } from "../../../agui/artifacts";
import { ArtifactFrame, card, grid6 } from "./_shared";

const fact = (label: string, value: string) => ({ label, value });

export function Characteristics({ candidate }: { candidate: Candidate }) {
  const facts = [
    fact("Strategy family", candidate.strategyFamily),
    fact("Net exposure", candidate.netExposure),
    fact("Benchmark", candidate.benchmark),
    fact("Base currency", candidate.currency),
    fact("Inception", candidate.inception),
    fact("Vehicle", candidate.vehicle),
  ];

  return (
    <ArtifactFrame eyebrow="Candidate characteristics" title={candidate.name}>
      <div style={grid6}>
        <div style={{ ...card, gridColumn: "span 4", display: "flex", gap: 13, alignItems: "center" }}>
          <div style={{ width: 46, height: 46, flex: "none", borderRadius: 13, background: "linear-gradient(150deg,#7d6ff2,var(--primary-d))", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700 }}>
            {candidate.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{candidate.name}</div>
            <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 2 }}>
              {candidate.manager} · {candidate.location} · {candidate.teamSize}-person team
            </div>
          </div>
        </div>
        <div style={{ gridColumn: "span 2", background: "linear-gradient(150deg,#7d6ff2,var(--primary-d))", borderRadius: 14, padding: 14, color: "#fff", boxShadow: "0 10px 26px -12px rgba(108,92,240,.5)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.82, textTransform: "uppercase", letterSpacing: ".08em" }}>Fund AUM</div>
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.02em", lineHeight: 1, marginTop: 5, fontFamily: "var(--mono)" }}>{candidate.aum}</div>
        </div>

        <div style={{ ...card, gridColumn: "span 6" }}>
          <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--ink2)", margin: "0 0 12px", textWrap: "pretty" }}>{candidate.blurb}</p>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Style DNA</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {candidate.styleTags.map((t) => (
              <span
                key={t.label}
                style={{
                  padding: "6px 12px",
                  background: t.primary ? "var(--asoft)" : "var(--chip)",
                  color: t.primary ? "var(--acc)" : "var(--ink2)",
                  borderRadius: 9,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {t.label}
              </span>
            ))}
          </div>
        </div>

        {facts.map((f) => (
          <div key={f.label} style={{ ...card, gridColumn: "span 2", padding: "11px 13px" }}>
            <div style={{ fontSize: 10, color: "var(--ink3)", marginBottom: 4 }}>{f.label}</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>{f.value}</div>
          </div>
        ))}
      </div>
    </ArtifactFrame>
  );
}
