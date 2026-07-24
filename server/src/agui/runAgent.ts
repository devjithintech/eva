import { randomUUID } from "node:crypto";
import type { Message, RunAgentInput } from "@ag-ui/core";
import { ANALYST_NARRATIVE_PROMPT, SYSTEM_PROMPT } from "../agent/systemPrompt.js";
import { ARTIFACT_TOOLS } from "../agent/tools.js";
import { executeArtifactTool } from "../agent/toolExecutors.js";
import { candidateNames } from "../data/candidates.js";
import { getSelectedCandidate } from "../data/session.js";
import { allocateSequence, appendMessage, ensureConversation, insertEvents, insertTurnRetrieval, loadTurns } from "../db/conversationRepo.js";
import type { RecordedEvent } from "../db/eventTypes.js";
import { persistConversations } from "../db/sqlConfig.js";
import type { ArtifactPayload } from "../data/types.js";
import { resolveModel, type ResolvedModel } from "../llm/registry.js";
import type { ChatTurn } from "../llm/types.js";
import { ev } from "./events.js";
import type { AguiStream } from "./stream.js";

/** Accumulated token usage for one LLM call (or a whole turn). */
interface TurnUsage {
  inputTokens: number;
  outputTokens: number;
  cachedReadTokens: number;
}

/** Second pass: feed the computed evidence back to the model and collect the
 *  reasoned narrative (markdown) + the tokens it cost. The narrative pass is part
 *  of preparing the analysis UI, so its usage is folded into the turn total. */
async function narrateAnalysis(
  provider: ResolvedModel["provider"],
  model: string,
  history: ChatTurn[],
  question: string,
  evidence: string,
  signal: AbortSignal,
): Promise<{ narrative: string; usage: TurnUsage | null }> {
  const events = provider.streamChat({
    model,
    system: ANALYST_NARRATIVE_PROMPT,
    messages: [
      ...history,
      { role: "user", content: `Question: ${question}\n\nComputed analysis (our data — authoritative):\n${evidence}\n\nWrite the analyst answer now.` },
    ],
    tools: [],
    signal,
  });
  let text = "";
  let usage: TurnUsage | null = null;
  for await (const event of events) {
    if (signal.aborted) break;
    if (event.type === "text") text += event.delta;
    else if (event.type === "usage") usage = { inputTokens: event.inputTokens, outputTokens: event.outputTokens, cachedReadTokens: event.cachedReadTokens ?? 0 };
  }
  return { narrative: text.trim(), usage };
}

/** Flatten a computed analysis payload into a compact, model-readable evidence
 *  block (verdict + the scored metric table) for the narrative second pass. */
function analysisEvidence(p: Extract<ArtifactPayload, { kind: "analysis" }>): string {
  const out: string[] = [];
  if (p.summary) out.push(p.summary);
  for (const b of p.blocks) {
    if (b.type === "verdict") out.push(`Verdict: ${b.winner} — ${b.reason}`);
    else if (b.type === "metricTable") {
      out.push(b.columns.join(" | "));
      for (const r of b.rows) out.push(r.cells.join(" | "));
    }
  }
  return out.join("\n");
}

/** AG-UI messages → provider chat turns (only user/assistant carry prose). */
function toChatTurns(messages: Message[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const m of messages) {
    if ((m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim()) {
      turns.push({ role: m.role, content: m.content });
    }
  }
  return turns;
}

/**
 * Orchestrate one agent run. Streams the model's spoken answer as
 * TEXT_MESSAGE_* events and each chosen artifact as a TOOL_CALL_* triple whose
 * args are the server-enriched payload the frontend renders.
 */
export async function runAgent(
  input: RunAgentInput,
  stream: AguiStream,
  signal: AbortSignal,
): Promise<void> {
  const { threadId, runId } = input;
  const requestedModel = (input.forwardedProps as { model?: string } | undefined)?.model;
  const { entry, provider } = resolveModel(requestedModel);

  stream.send(ev.runStarted(threadId, runId));
  // Surface which model actually served this run (UI badge / debugging).
  stream.send(ev.custom("model_resolved", { id: entry.id, label: entry.label, provider: entry.providerId }));

  const messageId = randomUUID();
  const startedAt = Date.now();
  let assistantText = "";
  // Accumulates ALL tokens spent preparing this turn's UI — the main turn plus
  // any second-pass (analysis narrative). `sawUsage` tells real 0 from "unknown".
  const usage: TurnUsage = { inputTokens: 0, outputTokens: 0, cachedReadTokens: 0 };
  let sawUsage = false;
  const addUsage = (u: TurnUsage) => {
    usage.inputTokens += u.inputTokens;
    usage.outputTokens += u.outputTokens;
    usage.cachedReadTokens += u.cachedReadTokens;
    sawUsage = true;
  };
  let textOpen = false;
  // Buffer this turn's AG-UI events; flushed to dbo.AgUiEvents at run end under
  // the assistant turn's sequence. We persist only what's unique + useful: which
  // model answered, and each rendered artifact's payload. Run lifecycle markers
  // (RUN_STARTED/FINISHED) are NOT stored — the turn boundary is the `sequence`,
  // and since we flush on success they'd carry no extra signal.
  const uiEvents: RecordedEvent[] = [];
  uiEvents.push({ name: "CUSTOM", uiSlot: "model_resolved", payload: { id: entry.id, label: entry.label, provider: entry.providerId } });
  const openText = () => {
    if (!textOpen) (stream.send(ev.textStart(messageId)), (textOpen = true));
  };
  const closeText = () => {
    if (textOpen) (stream.send(ev.textEnd(messageId)), (textOpen = false));
  };

  try {
    // Inject the live candidate pool + the session's in-focus candidate, so the
    // model resolves names, reuses the focus for follow-ups, and asks back when
    // a candidate is needed but none is named or in focus.
    const lastUser = [...input.messages].reverse().find((m) => m.role === "user" && typeof m.content === "string");
    const userMessage = (lastUser?.content as string) ?? "";
    const focus = getSelectedCandidate(threadId);
    // Split system: [stable, variable]. The stable block (prompt + live candidate
    // pool + tool schemas) is prompt-cached by Anthropic-compatible providers —
    // ~3.3k tokens billed at the ~10% cached rate after the first call. The
    // per-session focus line lives after the cache breakpoint so it never busts it.
    const system = [
      `${SYSTEM_PROMPT}\n\nCandidate pool (use these exact names): ${candidateNames().join(", ")}.`,
      ...(focus ? [`Candidate currently in focus this session: ${focus}. For single-candidate views (returns, analyst flags), use it when the user doesn't name a candidate.`] : []),
    ];

    // Persist this turn's user message and hydrate history FROM the DB, so the
    // conversation survives restarts and the server owns the transcript. Any DB
    // failure disables persistence for this run and we fall back to the client's
    // messages — never break the stream. (Assumes one new user turn per run.)
    let convId: number | null = null;
    let history = toChatTurns(input.messages);
    if (persistConversations) {
      try {
        convId = await ensureConversation(threadId);
        if (userMessage.trim()) await appendMessage(convId, "user", userMessage);
        history = await loadTurns(convId);
      } catch (err) {
        convId = null;
        history = toChatTurns(input.messages);
        console.warn(`[persist] save/read disabled this run: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const events = provider.streamChat({
      model: entry.providerModel,
      system,
      messages: history,
      tools: ARTIFACT_TOOLS,
      signal,
    });

    for await (const event of events) {
      if (signal.aborted) break;

      if (event.type === "usage") {
        addUsage({ inputTokens: event.inputTokens, outputTokens: event.outputTokens, cachedReadTokens: event.cachedReadTokens ?? 0 });
      } else if (event.type === "text") {
        openText();
        assistantText += event.delta;
        stream.send(ev.textContent(messageId, event.delta));
      } else if (event.type === "tool") {
        closeText(); // a tool always follows the spoken answer
        const payload = executeArtifactTool(event.name, event.args, { threadId, message: userMessage });
        if (!payload) continue;

        // Reason-then-answer: for the analysis view, feed the computed evidence
        // back to the model to write the reasoned narrative, and embed it IN the
        // payload so it renders above the component (not in the chat window).
        // Skipped for the scripted mock provider (which can't reason).
        if (event.name === "render_analysis" && payload.kind === "analysis" && entry.providerId !== "mock" && !signal.aborted) {
          const narrated = await narrateAnalysis(provider, entry.providerModel, history, userMessage, analysisEvidence(payload), signal);
          payload.narrative = narrated.narrative;
          if (narrated.usage) addUsage(narrated.usage); // fold the UI-prep pass into the turn total
        }

        const toolCallId = event.id || randomUUID();
        stream.send(ev.toolStart(toolCallId, event.name, messageId));
        stream.send(ev.toolArgs(toolCallId, JSON.stringify(payload)));
        stream.send(ev.toolEnd(toolCallId));
        // Record the rendered UI + its payload (the tool name is the UI slot).
        uiEvents.push({ name: "TOOL_CALL_ARGS", uiSlot: event.name, payload });
      }
    }

    closeText();
    const latencyMs = Date.now() - startedAt;
    // Persist the assistant turn (message + AG-UI events + cost), best-effort.
    if (convId !== null) {
      try {
        // The assistant's prose lives in dbo.Messages at this same turn sequence,
        // so it is NOT copied into AgUiEvents (join Messages by sequence for text).
        // Anchor events to the assistant message's sequence; if the answer was
        // artifact-only (no prose), allocate a bare sequence for the events.
        const hasText = assistantText.trim().length > 0;
        const turnSeq = hasText ? await appendMessage(convId, "assistant", assistantText) : await allocateSequence(convId);
        await insertEvents(convId, turnSeq, uiEvents);
        // TurnRetrieval FKs to Messages, so only write it when a message exists.
        if (hasText && sawUsage) {
          const tools = uiEvents.filter((e) => e.name === "TOOL_CALL_ARGS").map((e) => e.uiSlot).filter(Boolean);
          await insertTurnRetrieval(convId, turnSeq, {
            modelId: entry.id,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            cachedReadTokens: usage.cachedReadTokens,
            latencyMs,
            retrievalJson: JSON.stringify({ tools }),
          });
        }
      } catch (err) {
        console.warn(`[persist] assistant/events save failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    // Surface per-turn cost + latency to the client (drives the card meta). Tokens
    // include the analysis narrative pass, so it reflects the full UI-prep cost.
    const tokens = sawUsage ? usage.inputTokens + usage.outputTokens : null;
    stream.send(ev.custom("turn_usage", { tokens, latencyMs, ...(sawUsage ? usage : {}) }));
    stream.send(ev.runFinished(threadId, runId));
  } catch (err) {
    closeText();
    stream.send(ev.runError(err instanceof Error ? err.message : "Agent run failed"));
  } finally {
    stream.end();
  }
}
