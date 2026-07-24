import { buildAnalysis } from "../data/analytics.js";
import {
  buildAnalystFlags,
  buildCharacteristics,
  buildComparison,
  buildCorrelation,
  buildOpportunityMap,
  buildReturns,
  buildScorecard,
  buildCandidatePool,
  findCandidateInText,
  resolveCandidateRecord,
} from "../data/candidates.js";
import { getSelectedCandidate, setSelectedCandidate } from "../data/session.js";
import type { ArtifactPayload } from "../data/types.js";

/** Per-run context threaded into executors (for session-scoped candidate focus). */
export interface ToolContext {
  threadId?: string;
  /** The user's latest message — the source of truth for which candidate they named. */
  message?: string;
}

type Executor = (args: Record<string, unknown>, ctx: ToolContext) => ArtifactPayload | null;

/** Coerce a tool arg to a trimmed string (or undefined). */
const pickStr = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);

/** Coerce a tool arg to a number (or undefined) — models sometimes send "5". */
const pickNum = (v: unknown): number | undefined => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
};

/** Coerce a tool arg to a boolean — models send true / "true" / 1. */
const pickBool = (v: unknown): boolean => v === true || v === "true" || v === 1 || v === "1";

/** Coerce a tool arg to a string array (accepts a single string or CSV too). */
const pickStrArray = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map(pickStr).filter((s): s is string => !!s);
  const s = pickStr(v);
  return s ? s.split(/\s*,\s*/).filter(Boolean) : [];
};

/**
 * Resolve the candidate for a single-candidate view — deterministically, from
 * what the USER actually named (message scan) → session focus. We deliberately
 * ignore a model-supplied candidate that the user didn't reference, so the agent
 * asks "which candidate?" instead of defaulting one. Returns undefined when the
 * user named none and there's no focus.
 */
function candidateFor(_args: Record<string, unknown>, ctx: ToolContext): string | undefined {
  const named = findCandidateInText(ctx.message);
  if (named) {
    setSelectedCandidate(ctx.threadId, named);
    return named;
  }
  return getSelectedCandidate(ctx.threadId);
}

/**
 * Maps an artifact tool name to the canonical payload it renders. This is the
 * "server owns the data" seam: the model supplies intent, the executor returns
 * trustworthy numbers tagged with the artifact `kind` the renderer switches on.
 */
export const TOOL_EXECUTORS: Record<string, Executor> = {
  render_opportunity_map: () => ({ kind: "opportunity_map", ...buildOpportunityMap() }),
  render_candidate_pool: (args) => ({ kind: "candidate_pool", ...buildCandidatePool(pickNum(args.n), pickBool(args.all)) }),
  render_comparison: (args, ctx) => {
    // Accept a `candidates` array, or legacy a/b (+ candidateId/peerId) pairs.
    const list = Array.isArray(args.candidates) ? args.candidates.map(pickStr).filter((s): s is string => !!s) : [];
    const queries = list.length ? list : [pickStr(args.a ?? args.candidateId), pickStr(args.b ?? args.peerId)].filter((s): s is string => !!s);
    // Ask-back path: fewer than two resolvable candidates → render nothing.
    if (queries.filter((q) => resolveCandidateRecord(q)).length < 2) return null;
    setSelectedCandidate(ctx.threadId, resolveCandidateRecord(queries[0])?.name ?? queries[0]); // first fund becomes focus
    return { kind: "comparison", ...buildComparison(queries) };
  },
  render_analysis: (args, ctx) => {
    const candidates = pickStrArray(args.candidates);
    if (candidates[0]) setSelectedCandidate(ctx.threadId, resolveCandidateRecord(candidates[0])?.name ?? candidates[0]);
    const mode = pickStr(args.mode);
    return {
      kind: "analysis",
      ...buildAnalysis({
        question: pickStr(args.question),
        candidates,
        metrics: pickStrArray(args.metrics),
        mode: mode === "compare" || mode === "rank" || mode === "screen" ? mode : undefined,
      }),
    };
  },
  render_document: (args) => {
    // Model-authored fallback view — shape the supplied content into the payload.
    const co = args.callout && typeof args.callout === "object" ? (args.callout as Record<string, unknown>) : null;
    const tone = pickStr(co?.tone);
    const calloutText = pickStr(co?.text);
    const callout = calloutText ? { tone: (tone === "warning" || tone === "important" ? tone : "tip") as "tip" | "warning" | "important", text: calloutText } : undefined;
    const sections = Array.isArray(args.sections)
      ? (args.sections as unknown[])
          .map((s) => ({ title: pickStr((s as Record<string, unknown>)?.title) ?? "Details", body: pickStr((s as Record<string, unknown>)?.body) ?? "" }))
          .filter((s) => s.body)
      : undefined;
    return {
      kind: "document",
      title: pickStr(args.title),
      intro: pickStr(args.intro),
      keyPoints: pickStrArray(args.keyPoints),
      callout,
      body: pickStr(args.body),
      sections,
      followups: pickStrArray(args.followups),
    };
  },
  render_returns: (args, ctx) => {
    const candidate = candidateFor(args, ctx);
    return candidate ? { kind: "returns", ...buildReturns(candidate, pickNum(args.years)) } : null;
  },
  render_analyst_flags: (args, ctx) => {
    const candidate = candidateFor(args, ctx);
    return candidate ? { kind: "analyst_flags", ...buildAnalystFlags(candidate) } : null;
  },
  render_benchmark_correlation: () => ({ kind: "benchmark_correlation", ...buildCorrelation() }),
  render_characteristics: (args, ctx) => {
    // User's named candidate (or session focus) wins; else the model's arg; else the default.
    const candidate = candidateFor(args, ctx) ?? pickStr(args.candidateId) ?? pickStr(args.candidate);
    return { kind: "characteristics", ...buildCharacteristics(candidate) };
  },
  render_scorecard: (args, ctx) => {
    const candidate = candidateFor(args, ctx);
    return candidate ? { kind: "scorecard", ...buildScorecard(candidate) } : null;
  },
};

export function executeArtifactTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext = {},
): ArtifactPayload | null {
  const exec = TOOL_EXECUTORS[name];
  return exec ? exec(args, ctx) : null;
}
