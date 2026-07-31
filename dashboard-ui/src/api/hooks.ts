import { useCallback, useEffect, useState } from "react";
import { apiGet, apiSend } from "./client";
import type {
  AnalystFlagsPayload,
  CandidateMatrix,
  CandidateRecord,
  CandidateSummary,
  CandPeer,
  ComparisonPayload,
  OpportunityMapData,
  PeerGroup,
  PipelineState,
  RendererEnvelope,
  ReturnsPayload,
  RunParams,
  ScorecardPayload,
  Stage,
} from "./types";

export interface Resource<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/**
 * Fetch a BFF resource once on mount (and whenever `path` changes). Pass
 * `null` to skip. Aborts on unmount so a late response can't set state on a
 * gone component.
 */
export function useResource<T>(path: string | null): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(path != null);

  useEffect(() => {
    if (path == null) {
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    apiGet<T>(path, ctrl.signal)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => {
        if ((e as Error).name !== "AbortError") setError(e instanceof Error ? e.message : "Request failed");
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [path]);

  return { data, error, loading };
}

/** List candidate profiles (summaries). */
export const useCandidates = () => useResource<CandidateSummary[]>("/candidates");

/** Get a candidate profile by id (slug / name / pm_id). Pass null to skip. */
export const useCandidate = (id: string | null) =>
  useResource<CandidateRecord>(id ? `/candidates/${id}` : null);

/** Candidate comparison matrix (CAGR · Sharpe · Alpha · Max DD). `all=true` for
 *  the full ranked list (the dashboard always wants every candidate). */
export const useCandidateMatrix = (all = true) =>
  useResource<CandidateMatrix>(`/candidates/matrix${all ? "?all=true" : ""}`);

/** Funnel counts + each candidate's current stage. Re-fetch after mutating a
 *  stage with `useSetStage()`. */
export function usePipeline(): Resource<PipelineState> & { refresh: () => void } {
  const [data, setData] = useState<PipelineState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    apiGet<PipelineState>("/pipeline")
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Request failed"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => refresh(), [refresh]);
  return { data, error, loading, refresh };
}

/** Move a candidate to a new pipeline stage. Call `refresh()` on the
 *  `usePipeline()` result afterwards to reflect the change. */
export function useSetStage() {
  const [saving, setSaving] = useState(false);
  const setStage = useCallback(async (id: string, stage: Stage) => {
    setSaving(true);
    try {
      await apiSend<{ id: string; stage: Stage }>("PUT", `/pipeline/${id}`, { stage });
    } finally {
      setSaving(false);
    }
  }, []);
  return { setStage, saving };
}

/** Committee scorecard (1–5 per criterion). Pass null to skip. */
export const useScorecard = (id: string | null) =>
  useResource<ScorecardPayload>(id ? `/candidates/${id}/scorecard` : null);

/** Analyst flags with severity. Pass null to skip. */
export const useFlags = (id: string | null) =>
  useResource<AnalystFlagsPayload>(id ? `/candidates/${id}/flags` : null);

/** Trailing-returns view (annual bar + growth-of-100 curve). Pass null to skip. */
export const useReturns = (id: string | null, years = 5) =>
  useResource<ReturnsPayload>(id ? `/candidates/${id}/returns?years=${years}` : null);

/** Side-by-side comparison of 2+ candidates. Pass fewer than 2 ids to skip. */
export const useCompare = (ids: string[]) =>
  useResource<ComparisonPayload>(ids.length >= 2 ? `/candidates/compare?ids=${ids.join(",")}` : null);

/** Opportunity map (scatter points + funnel + pool composition). */
export const useOpportunityMap = () => useResource<OpportunityMapData>("/opportunity-map");

/** Generic D1-x renderer call (`GET /renderers/{label}`) — used by the Peer
 *  Fit & Sim panels. `params` is URL-encoded as the `params` JSON query
 *  string per the Frontend API Guide's `RunParams` contract. `extra` covers
 *  the renderer's own plain query params (`axis`, `kind`, `stress_model`, …)
 *  for labels with multiple variants (e.g. D1-10?axis=sector). Pass a null
 *  `fundId` to skip. */
export function useRenderer<TRow = Record<string, unknown>>(
  label: string,
  fundId: string | null,
  params?: RunParams,
  extra?: Record<string, string>,
): Resource<RendererEnvelope<TRow>> {
  const query = params && Object.keys(params).length ? `&params=${encodeURIComponent(JSON.stringify(params))}` : "";
  const extraQuery = extra
    ? Object.entries(extra)
        .map(([k, v]) => `&${k}=${encodeURIComponent(v)}`)
        .join("")
    : "";
  const path = fundId == null ? null : `/renderers/${label}?candidate_id=${encodeURIComponent(fundId)}${query}${extraQuery}`;
  return useResource<RendererEnvelope<TRow>>(path);
}

/** Pre-built peer groups for the Configure-comparison-set modal. */
export const usePeerGroups = () => useResource<PeerGroup[]>("/peer_groups");

/** Candidate-peer roster for the Configure-comparison-set modal's
 *  Candidates tab (valid `candidate_peer_set` members). */
export const useCandidatePeers = () => useResource<CandPeer[]>("/peer_candidates");

/** Saved custom peer sets (Recent & saved tab). */
export interface PeerSet {
  id: string;
  name: string;
  members: string[];
}
export const usePeerSets = () => useResource<PeerSet[]>("/peer_sets");
