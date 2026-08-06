import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiIsLoading, apiSend, onApiActivity, RENDERERS_AS_OF } from "./client";
import type {
  AnalystFlagsPayload,
  CandidateMatrix,
  CandidateRecord,
  CandidateSummary,
  CandPeer,
  ComparisonPayload,
  FundHierarchyResponse,
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

/** True while any API request is in flight. The hide side is debounced so the
 *  page loader doesn't flicker between back-to-back panel fetches. */
export function useApiLoading(hideDelayMs = 250): boolean {
  const [active, setActive] = useState(apiIsLoading);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = onApiActivity((nowActive) => {
      clearTimeout(hideTimer);
      if (nowActive) setActive(true);
      else hideTimer = setTimeout(() => setActive(false), hideDelayMs);
    });
    return () => {
      clearTimeout(hideTimer);
      unsubscribe();
    };
  }, [hideDelayMs]);

  return active;
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

/** Owner/candidate key derived from a fund key — service-style keys are
 *  "<candidate_id>::<fund>" (e.g. "C-2026-001::alpha"), the dashboard
 *  dataset's are "<pm_id>--<fund-slug>" (e.g.
 *  "2e-capital-13739668--select-credit"); bare ids are their own owner. */
function candidateIdOf(fundId: string): string {
  if (fundId.includes("::")) return fundId.split("::")[0];
  if (fundId.includes("--")) return fundId.split("--")[0];
  return fundId;
}

/** Generic D1-x renderer call (`GET /renderers/{label}`) — used by the Peer
 *  Fit & Sim panels, served by the external renderers service (see
 *  VITE_RENDERERS_URL in api/client.ts). Query contract:
 *  `fund_id` is the candidate's full fund key (from the candidate record's
 *  `subject_fund.fund_id`), `candidate_id` its owner prefix (see
 *  `candidateIdOf`), `as_of_date` the valuation date (see RENDERERS_AS_OF),
 *  and `params` the URL-encoded JSON `RunParams`. `extra` covers the
 *  renderer's own plain query params (`axis`, `kind`, `stress_model`, …) for
 *  labels with multiple variants (e.g. D1-10?axis=sector); it is spread last
 *  so it can also override `candidate_id` when the caller knows better.
 *  Pass a null `fundId` to skip. */
export function useRenderer<TRow = Record<string, unknown>>(
  label: string,
  fundId: string | null,
  params?: RunParams,
  extra?: Record<string, string>,
): Resource<RendererEnvelope<TRow>> {
  let path: string | null = null;
  if (fundId != null) {
    const qs = new URLSearchParams({
      fund_id: fundId,
      candidate_id: candidateIdOf(fundId),
      as_of_date: RENDERERS_AS_OF,
      ...(params && Object.keys(params).length ? { params: JSON.stringify(params) } : {}),
      ...extra,
    });
    path = `/renderers/${label}?${qs}`;
  }
  return useResource<RendererEnvelope<TRow>>(path);
}

/** Session-lifetime cache for static reference data. Unlike `useResource`,
 *  every mount shares one promise per path — the fund hierarchy is ~400 kB,
 *  so re-downloading it on each tab switch is wasteful. Failed fetches are
 *  evicted so the next mount retries. */
const referenceCache = new Map<string, Promise<unknown>>();

function useCachedResource<T>(path: string): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    let promise = referenceCache.get(path) as Promise<T> | undefined;
    if (!promise) {
      promise = apiGet<T>(path);
      referenceCache.set(path, promise);
      promise.catch(() => referenceCache.delete(path));
    }
    promise
      .then((d) => {
        if (alive) {
          setData(d);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : "Request failed");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [path]);

  return { data, error, loading };
}

/** Fund names for the renderer matrices' bare numeric fund ids, from the
 *  renderers service's `GET /fund-hierarchy`. Returns the id→name lookup
 *  (keys stringified to match renderer column/row labels) alongside the
 *  fetch state; the map is empty until the response lands. Cached for the
 *  session — only the first mount hits the network. */
export function useFundNames(recentDays = 6): Resource<FundHierarchyResponse> & { nameById: Map<string, string> } {
  const resource = useCachedResource<FundHierarchyResponse>(`/fund-hierarchy?recent_days=${recentDays}`);
  const nameById = useMemo(
    () => new Map((resource.data?.rows ?? []).map((r) => [String(r.fund_id), r.name])),
    [resource.data],
  );
  return { ...resource, nameById };
}

/** Pre-built peer groups for the Configure-comparison-set modal. */
export const usePeerGroups = () => useResource<PeerGroup[]>("/peer_groups");

/** Candidate-peer roster for the Configure-comparison-set modal's
 *  Candidates tab (valid `candidate_peer_set` members). */
export const useCandidatePeers = () => useResource<CandPeer[]>("/peer_candidates");

/** Map candidate-peer selection keys (`CandPeer.key`, e.g. "reyes") to the
 *  fund keys the renderers service expects in `candidate_peer_set` (e.g.
 *  "C-2026-019::vega"), falling back to the raw key while the roster loads. */
export function peerFundKeys(keys: Iterable<string>, roster: CandPeer[] | null | undefined): string[] {
  const byKey = new Map((roster ?? []).map((c) => [c.key, c.analytics_fund_id ?? c.key]));
  return Array.from(keys, (k) => byKey.get(k) ?? k);
}

/** Saved custom peer sets (Recent & saved tab). */
export interface PeerSet {
  id: string;
  name: string;
  members: string[];
}
export const usePeerSets = () => useResource<PeerSet[]>("/peer_sets");
