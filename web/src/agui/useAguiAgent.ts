import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HttpAgent } from "@ag-ui/client";
import type { Message } from "@ag-ui/core";
import type { StoredEvent, StoredMessage, TurnMeta } from "../api/types";
import type { ArtifactKind, ArtifactPayload } from "./artifacts";

export type RunStatus = "idle" | "thinking" | "streaming";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface GeneratedArtifact {
  id: string;
  kind: ArtifactKind;
  payload: ArtifactPayload;
  /** Per-turn cost + latency, stamped when the run finalizes. */
  tokens?: number;
  /** Prompt-cache reads — billed at ~10%; shown so the saving is visible. */
  cachedTokens?: number;
  latencyMs?: number;
}

export interface ResolvedModel {
  id: string;
  label: string;
  provider: string;
}

const AGENT_URL = import.meta.env.VITE_AGENT_URL ?? "/agent";

/**
 * Bridges an AG-UI HttpAgent into React state:
 *  - chat       — user prompts + the assistant's streamed prose
 *  - artifacts  — one entry per render_* tool call (the generative UI)
 *  - status     — run lifecycle for the thinking/streaming affordances
 */
export function useAguiAgent() {
  const agentRef = useRef<HttpAgent | null>(null);
  if (!agentRef.current) agentRef.current = new HttpAgent({ url: AGENT_URL });

  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [artifacts, setArtifacts] = useState<GeneratedArtifact[]>([]);
  // Mirror the agent's threadId in state so the sidebar can highlight the active
  // conversation and re-render when we switch/start threads.
  const [threadId, setThreadId] = useState<string>(() => agentRef.current!.threadId);
  const [status, setStatus] = useState<RunStatus>("idle");
  const [resolvedModel, setResolvedModel] = useState<ResolvedModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  // True when the last run answered in chat but rendered no canvas view (an
  // out-of-scope question, or an ask-back). Drives the soft "no view" card.
  const [noView, setNoView] = useState(false);
  const producedArtifact = useRef(false);
  const errored = useRef(false);
  // Ids of artifacts produced this run, so the turn_usage event can stamp their cost.
  const runArtifactIds = useRef<string[]>([]);
  // The latest user prompt — so a greeting/ack that legitimately renders no view
  // doesn't trigger the "no view" card.
  const lastUser = useRef("");

  useEffect(() => {
    const agent = agentRef.current!;

    const syncChat = (messages: readonly Message[]) => {
      setChat(
        messages
          .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
          .map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: (m.content as string) ?? "" }))
          // an assistant message with only a tool call has empty prose — hide it
          .filter((m) => m.role === "user" || m.content.trim().length > 0),
      );
    };

    const subscription = agent.subscribe({
      onRunInitialized: () => {
        setStatus("thinking");
        setError(null);
        setNoView(false);
        producedArtifact.current = false;
        errored.current = false;
        runArtifactIds.current = [];
      },
      onTextMessageStartEvent: () => setStatus("streaming"),
      onMessagesChanged: ({ messages }) => syncChat(messages),
      onToolCallEndEvent: ({ toolCallName, toolCallArgs }) => {
        const kind = TOOL_TO_KIND[toolCallName];
        if (!kind) return;
        producedArtifact.current = true;
        const payload = toolCallArgs as unknown as ArtifactPayload;
        const id = `${toolCallName}-${Date.now()}-${runArtifactIds.current.length}`;
        runArtifactIds.current.push(id);
        setArtifacts((prev) => [...prev, { id, kind, payload }]);
      },
      onCustomEvent: ({ event }) => {
        const e = event as unknown as { name?: string; value?: unknown };
        if (e.name === "model_resolved" && e.value) setResolvedModel(e.value as ResolvedModel);
        // Stamp cost + latency onto this turn's artifacts as soon as it arrives
        // (all tool calls precede turn_usage, so the artifacts already exist) —
        // race-free vs. relying on run-finalize ordering.
        if (e.name === "turn_usage") {
          const v = (e.value ?? {}) as { tokens?: number | null; latencyMs?: number; cachedReadTokens?: number };
          const ids = runArtifactIds.current;
          const tokens = v.tokens ?? undefined;
          const cachedTokens = v.cachedReadTokens || undefined;
          const latencyMs = v.latencyMs;
          if (ids.length) setArtifacts((prev) => prev.map((a) => (ids.includes(a.id) ? { ...a, tokens, cachedTokens, latencyMs } : a)));
        }
      },
      onRunFinalized: () => {
        setStatus("idle");
        // Answered in chat but nothing rendered → show the soft "no view" card,
        // unless it was just a greeting/ack (which never warrants a view).
        if (!producedArtifact.current && !errored.current && !isConversational(lastUser.current)) setNoView(true);
      },
      onRunErrorEvent: ({ event }) => {
        errored.current = true;
        setError((event as unknown as { message?: string }).message ?? "Run failed");
        setStatus("idle");
      },
      onRunFailed: ({ error: e }) => {
        errored.current = true;
        setError(e?.message ?? "Run failed");
        setStatus("idle");
      },
    });

    return () => subscription.unsubscribe();
  }, []);

  const send = useCallback((text: string, model?: string) => {
    const agent = agentRef.current!;
    const trimmed = text.trim();
    if (!trimmed || agent.isRunning) return;

    lastUser.current = trimmed;
    agent.addMessage({ id: `u-${Date.now()}`, role: "user", content: trimmed });
    setStatus("thinking");
    void agent.runAgent({ forwardedProps: model ? { model } : {} });
  }, []);

  /** Re-run the last request without re-adding the user message — powers the
   *  error fallback's "Ask Again". The prior turns are still on the agent. */
  const retry = useCallback((model?: string) => {
    const agent = agentRef.current!;
    if (agent.isRunning) return;
    setStatus("thinking");
    setError(null);
    void agent.runAgent({ forwardedProps: model ? { model } : {} });
  }, []);

  const reset = useCallback(() => {
    const agent = agentRef.current!;
    if (agent.isRunning) agent.abortRun();
    // A new chat is a NEW thread — otherwise it would append to the last
    // conversation server-side (history is keyed by threadId).
    const tid = crypto.randomUUID();
    agent.threadId = tid;
    agent.setMessages([]);
    setThreadId(tid);
    setChat([]);
    setArtifacts([]);
    setStatus("idle");
    setError(null);
    setNoView(false);
  }, []);

  /** Load a saved conversation: point the agent at its thread, restore the chat
   *  transcript, and rebuild the canvas artifacts from stored tool-call events. */
  const loadConversation = useCallback((tid: string, messages: StoredMessage[], events: StoredEvent[], turns: TurnMeta[] = []) => {
    const agent = agentRef.current!;
    if (agent.isRunning) agent.abortRun();
    agent.threadId = tid;

    const msgs: Message[] = messages
      .filter((m) => (m.role === "user" || m.role === "assistant") && (m.content ?? "").trim().length > 0)
      .map((m) => ({ id: `db-${m.sequence}`, role: m.role as "user" | "assistant", content: m.content ?? "" }));
    agent.setMessages(msgs);
    setChat(msgs.map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content as string })));

    // Per-turn cost/latency keyed by sequence, to restore each card's meta.
    const metaBySeq = new Map(turns.map((t) => [t.sequence, t]));
    const arts: GeneratedArtifact[] = [];
    for (const e of events) {
      if (e.type !== "TOOL_CALL_ARGS" || !e.uiSlot) continue;
      const kind = TOOL_TO_KIND[e.uiSlot];
      if (!kind) continue;
      const m = metaBySeq.get(e.sequence);
      arts.push({
        id: `${e.uiSlot}-${e.sequence}-${e.eventSequence}`,
        kind,
        payload: e.payload as ArtifactPayload,
        tokens: m?.tokens ?? undefined,
        latencyMs: m?.latencyMs ?? undefined,
      });
    }
    setArtifacts(arts);

    setThreadId(tid);
    setStatus("idle");
    setError(null);
    setNoView(false);
    producedArtifact.current = arts.length > 0;
    lastUser.current = "";
  }, []);

  const isEmpty = chat.length === 0 && artifacts.length === 0;

  return useMemo(
    () => ({ chat, artifacts, threadId, status, resolvedModel, error, noView, isEmpty, send, retry, reset, loadConversation }),
    [chat, artifacts, threadId, status, resolvedModel, error, noView, isEmpty, send, retry, reset, loadConversation],
  );
}

const GREETING_RE = /^(hi+|hey+|hello+|yo|sup|hiya|howdy|good\s+(morning|afternoon|evening|day)|thanks?|thank\s+you|thx|ty|ok(ay)?|cool|great|nice|awesome|got\s+it|understood|bye|goodbye|see\s+ya|cheers|np|no\s+problem)\b[\s!.?]*$/i;

/** A greeting / ack / pleasantry that legitimately renders no canvas view — so
 *  we don't show the "nothing to show" card for it. */
function isConversational(text?: string): boolean {
  const s = (text ?? "").trim();
  if (!s) return true;
  if (s.length <= 2) return true;
  return GREETING_RE.test(s);
}

/** render_* tool name → artifact kind. */
const TOOL_TO_KIND: Record<string, ArtifactKind> = {
  render_opportunity_map: "opportunity_map",
  render_candidate_pool: "candidate_pool",
  render_comparison: "comparison",
  render_returns: "returns",
  render_benchmark_correlation: "benchmark_correlation",
  render_characteristics: "characteristics",
  render_analyst_flags: "analyst_flags",
  render_scorecard: "scorecard",
  render_analysis: "analysis",
  render_document: "document",
};
