import { ARTIFACT_LABELS, type ArtifactKind, type ArtifactPayload } from "../agui/artifacts";
import { ArtifactRenderer } from "../components/canvas/ArtifactRenderer";
import { ErrorFallback } from "../components/common/ErrorFallback";
import { NoViewCard } from "../components/common/NoViewCard";
import { useCandidateMatrix, useOpportunityMap } from "../api/hooks";
import { useTheme } from "../context/ThemeContext";
import { MoonIcon, SunIcon } from "../components/common/icons";
import { ARTIFACT_FIXTURES } from "./fixtures";

/** kind → the AG-UI tool the agent calls to render it. */
const KIND_TO_TOOL: Record<ArtifactKind, string> = {
  opportunity_map: "render_opportunity_map",
  candidate_pool: "render_candidate_pool",
  comparison: "render_comparison",
  returns: "render_returns",
  benchmark_correlation: "render_benchmark_correlation",
  characteristics: "render_characteristics",
  analyst_flags: "render_analyst_flags",
  scorecard: "render_scorecard",
  analysis: "render_analysis",
  document: "render_document",
};

const KINDS = Object.keys(ARTIFACT_FIXTURES) as ArtifactKind[];

/**
 * Standalone gallery of every AG-UI artifact, each rendered from a sample
 * payload. Reachable at #/test — a harness for eyeballing the generative-UI
 * components without driving a live agent run.
 */
export function TestUI() {
  const { vars, isDark, toggle } = useTheme();
  // Live data from the BFF; each falls back to its static fixture if the API
  // isn't reachable.
  const { data: matrix, error: matrixError } = useCandidateMatrix();
  const { data: oppMap, error: oppError } = useOpportunityMap();

  // Which kinds are backed by a live endpoint (for the chip + payload).
  const live: Partial<Record<ArtifactKind, { data: unknown; error: string | null; path: string }>> = {
    candidate_pool: { data: matrix, error: matrixError, path: "/api/candidates/matrix" },
    opportunity_map: { data: oppMap, error: oppError, path: "/api/opportunity-map" },
  };

  // Prefer live data where available; everything else uses its fixture.
  const payloadFor = (kind: ArtifactKind): ArtifactPayload => {
    if (kind === "candidate_pool" && matrix) return { kind: "candidate_pool", title: matrix.title, rows: matrix.rows };
    if (kind === "opportunity_map" && oppMap) return { kind: "opportunity_map", ...oppMap };
    return ARTIFACT_FIXTURES[kind];
  };

  return (
    <div style={{ ...vars, minHeight: "100vh", background: "var(--bg)", color: "var(--ink)" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          height: 52,
          padding: "0 20px",
          background: "var(--panel)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#6354f2" }} />
          <span style={{ fontSize: 14, fontWeight: 700 }}>AG-UI artifact gallery</span>
          <span style={{ fontSize: 12, color: "var(--ink3)" }}>{KINDS.length} components</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a
            href="#/"
            style={{ display: "flex", alignItems: "center", height: 31, padding: "0 12px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--ink2)", fontSize: 12.5, fontWeight: 600, textDecoration: "none" }}
          >
            ← Back to app
          </a>
          <button
            onClick={toggle}
            title="Toggle light / dark"
            style={{ width: 31, height: 31, borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {isDark ? <SunIcon size={17} stroke="#e2ab54" /> : <MoonIcon size={17} stroke="var(--ink3)" />}
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 940, margin: "0 auto", padding: "22px 20px 80px" }}>
        {/* Index of every artifact "link" — jumps to its section below. */}
        <nav style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 26 }}>
          {KINDS.map((kind) => (
            <a
              key={kind}
              href={`#/test/${kind}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(`art-${kind}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              style={{ padding: "7px 13px", borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: "pointer", background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink2)", textDecoration: "none" }}
            >
              {ARTIFACT_LABELS[kind]}
            </a>
          ))}
        </nav>

        <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
          <section id="art-error_fallback" style={{ scrollMarginTop: 68 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Error fallback</h2>
              <code style={{ fontSize: 11.5, color: "var(--acc)", background: "var(--asoft)", border: "1px solid var(--aline)", borderRadius: 6, padding: "2px 7px", fontWeight: 600 }}>
                ErrorFallback
              </code>
            </div>
            <ErrorFallback logs="Sample diagnostic log — copied to clipboard." onRetry={() => {}} />
          </section>

          <section id="art-no_view" style={{ scrollMarginTop: 68 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>No-view card</h2>
              <code style={{ fontSize: 11.5, color: "var(--acc)", background: "var(--asoft)", border: "1px solid var(--aline)", borderRadius: 6, padding: "2px 7px", fontWeight: 600 }}>
                NoViewCard
              </code>
            </div>
            <NoViewCard />
          </section>

          {KINDS.map((kind) => (
            <section key={kind} id={`art-${kind}`} style={{ scrollMarginTop: 68 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{ARTIFACT_LABELS[kind]}</h2>
                <code style={{ fontSize: 11.5, color: "var(--acc)", background: "var(--asoft)", border: "1px solid var(--aline)", borderRadius: 6, padding: "2px 7px", fontWeight: 600 }}>
                  {KIND_TO_TOOL[kind]}
                </code>
                {live[kind] && (
                  <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 6, padding: "2px 7px", ...(live[kind]!.data ? { color: "var(--gtext)", background: "var(--gsoft)", border: "1px solid var(--gline)" } : { color: "var(--ink3)", background: "var(--chip)", border: "1px solid var(--line)" }) }}>
                    {live[kind]!.data ? `live · ${live[kind]!.path}` : live[kind]!.error ? "API unreachable · fixture" : "loading…"}
                  </span>
                )}
              </div>
              <ArtifactRenderer payload={payloadFor(kind)} />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
