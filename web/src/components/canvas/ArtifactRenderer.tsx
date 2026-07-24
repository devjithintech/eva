import type { ArtifactPayload } from "../../agui/artifacts";
import { ResultCard, artifactTitle } from "./ResultCard";
import { ViewSummary } from "./ViewSummary";
import { AnalystFlags } from "./artifacts/AnalystFlags";
import { BenchmarkCorrelation } from "./artifacts/BenchmarkCorrelation";
import { Characteristics } from "./artifacts/Characteristics";
import { Comparison } from "./artifacts/Comparison";
import { DocumentView } from "./artifacts/DocumentView";
import { DynamicAnalysis } from "./artifacts/DynamicAnalysis";
import { OpportunityMap } from "./artifacts/OpportunityMap";
import { Returns } from "./artifacts/Returns";
import { Scorecard } from "./artifacts/Scorecard";
import { CandidatePool } from "./artifacts/CandidatePool";

/** Maps a generative-UI payload to its React artifact, wrapped in the shared
 *  result-card chrome. The single switch point the AG-UI tool calls flow into. */
export function ArtifactRenderer({ payload, turn, tokens, cachedTokens, latencyMs, onFollowup }: { payload: ArtifactPayload; turn?: number; tokens?: number; cachedTokens?: number; latencyMs?: number; onFollowup?: (text: string) => void }) {
  // The document/answer artifact is a self-contained LightAssist card (its own
  // header + controls + post-actions), so it is NOT wrapped in the result-card chrome.
  if (payload.kind === "document") {
    return <DocumentView {...payload} tokens={tokens} cachedTokens={cachedTokens} latencyMs={latencyMs} onFollowup={onFollowup} />;
  }
  const count = payload.kind === "analyst_flags" ? payload.total : undefined;
  // Analysis carries its own summary/answer above the component.
  const skipSummary = payload.kind === "analysis";
  return (
    <ResultCard kind={payload.kind} title={artifactTitle(payload)} turn={turn} tokens={tokens} cachedTokens={cachedTokens} latencyMs={latencyMs} count={count}>
      {!skipSummary && <ViewSummary payload={payload} />}
      {renderInner(payload, onFollowup)}
    </ResultCard>
  );
}

function renderInner(payload: ArtifactPayload, onFollowup?: (text: string) => void) {
  switch (payload.kind) {
    case "opportunity_map":
      return <OpportunityMap {...payload} />;
    case "candidate_pool":
      return <CandidatePool {...payload} />;
    case "comparison":
      return <Comparison {...payload} />;
    case "returns":
      return <Returns {...payload} />;
    case "benchmark_correlation":
      return <BenchmarkCorrelation {...payload} />;
    case "characteristics":
      return <Characteristics candidate={payload.candidate} />;
    case "analyst_flags":
      return <AnalystFlags {...payload} />;
    case "scorecard":
      return <Scorecard {...payload} />;
    case "analysis":
      return <DynamicAnalysis {...payload} />;
    case "document":
      return <DocumentView {...payload} onFollowup={onFollowup} />;
    default:
      return null;
  }
}
