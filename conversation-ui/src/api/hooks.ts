import { useCallback, useEffect, useState } from "react";
import { apiGet } from "./client";
import type {
  CandidateMatrix,
  CandidateRecord,
  CandidateSummary,
  ConversationSummary,
  OpportunityMapData,
  Renderer,
  StoredEvent,
  StoredMessage,
  TurnMeta,
} from "./types";

export interface Resource<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/**
 * Fetch a BFF resource once on mount. Pass `null` to skip. Aborts on unmount so
 * a late response can't set state on a gone component.
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

/** Candidate comparison matrix (CAGR · Sharpe · Alpha · Max DD). */
export const useCandidateMatrix = () => useResource<CandidateMatrix>("/candidates/matrix");

/** Opportunity map (scatter points + funnel + pool). */
export const useOpportunityMap = () => useResource<OpportunityMapData>("/opportunity-map");

/** List renderers. */
export const useRenderers = () => useResource<Renderer[]>("/renderers");

/** A renderer's payload by label, e.g. useRenderer("D1-1", "anda"). Pass null to skip. */
export const useRenderer = <T = unknown>(label: string | null, candidate?: string) =>
  useResource<T>(label ? `/renderers/${label}${candidate ? `?candidate=${candidate}` : ""}` : null);

/** Saved conversations for the sidebar. `refresh()` re-fetches (call after a turn). */
export function useConversations(): Resource<ConversationSummary[]> & { refresh: () => void } {
  const [data, setData] = useState<ConversationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(() => {
    setLoading(true);
    apiGet<ConversationSummary[]>("/conversations")
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

/** Load one conversation's stored transcript, rendered events, and per-turn
 *  cost/latency (for restoring the full workspace + card meta). */
export async function fetchConversation(
  threadId: string,
): Promise<{ messages: StoredMessage[]; events: StoredEvent[]; turns: TurnMeta[] }> {
  const [messages, events, turns] = await Promise.all([
    apiGet<{ messages: StoredMessage[] }>(`/conversations/${threadId}/messages`)
      .then((r) => r.messages)
      .catch(() => [] as StoredMessage[]),
    apiGet<{ events: StoredEvent[] }>(`/conversations/${threadId}/events`)
      .then((r) => r.events)
      .catch(() => [] as StoredEvent[]),
    apiGet<{ turns: TurnMeta[] }>(`/conversations/${threadId}/turns`)
      .then((r) => r.turns)
      .catch(() => [] as TurnMeta[]),
  ]);
  return { messages, events, turns };
}
