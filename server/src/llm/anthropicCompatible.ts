import type Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, Tool } from "@anthropic-ai/sdk/resources/messages";
import type { LLMTool, ProviderStreamEvent, StreamChatOptions } from "./types.js";

/**
 * Shared streaming implementation for any Anthropic Messages-compatible endpoint.
 * The Anthropic API and Azure AI Foundry's "/anthropic/" passthrough speak the
 * same protocol — they differ only in base URL and key — so both providers pass
 * a preconfigured client here.
 *
 * Prompt caching: the tool schemas and the stable system block are marked with
 * cache_control, so the ~3.3k-token stable prefix is cached server-side and
 * billed at the cached-read rate (~10%) on every call after the first. The
 * variable system tail (session focus) sits AFTER the breakpoint — it never
 * busts the cache.
 */
function toTools(tools: LLMTool[]): Tool[] {
  const arr: Tool[] = tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters as Tool.InputSchema,
  }));
  // Cache breakpoint on the last tool → the whole (static) tool array is cached.
  if (arr.length) (arr[arr.length - 1] as Tool & { cache_control?: unknown }).cache_control = { type: "ephemeral" };
  return arr;
}

/** Split system → content blocks; breakpoint after the stable first block. */
function toSystemBlocks(system: string | string[]): { type: "text"; text: string; cache_control?: { type: "ephemeral" } }[] {
  const parts = (Array.isArray(system) ? system : [system]).filter(Boolean);
  return parts.map((text, i) => (i === 0 ? { type: "text" as const, text, cache_control: { type: "ephemeral" as const } } : { type: "text" as const, text }));
}

export async function* streamAnthropicCompatible(
  client: Anthropic,
  model: string,
  opts: StreamChatOptions,
): AsyncIterable<ProviderStreamEvent> {
  const messages: MessageParam[] = opts.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const stream = client.messages.stream(
    {
      model,
      max_tokens: 2048,
      system: toSystemBlocks(opts.system),
      messages,
      tools: opts.tools.length ? toTools(opts.tools) : undefined,
    },
    { signal: opts.signal },
  );

  // Track in-flight tool_use blocks by content-block index.
  const pending = new Map<number, { id: string; name: string; json: string }>();
  // Token usage accrues across message_start (input/cache) + message_delta (output).
  const usage = { inputTokens: 0, outputTokens: 0, cachedReadTokens: 0 };

  for await (const event of stream) {
    if (event.type === "message_start") {
      const u = event.message.usage as typeof event.message.usage & { cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null };
      // input_tokens excludes cached portions; fold cache WRITES into input (they
      // are billed ~like input) and report cache READS separately (the ~90% saving).
      usage.inputTokens = (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
      usage.cachedReadTokens = u.cache_read_input_tokens ?? 0;
      usage.outputTokens = u.output_tokens ?? 0;
    } else if (event.type === "message_delta") {
      if (event.usage?.output_tokens != null) usage.outputTokens = event.usage.output_tokens;
    } else if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
      pending.set(event.index, { id: event.content_block.id, name: event.content_block.name, json: "" });
    } else if (event.type === "content_block_delta") {
      if (event.delta.type === "text_delta") {
        yield { type: "text", delta: event.delta.text };
      } else if (event.delta.type === "input_json_delta") {
        const slot = pending.get(event.index);
        if (slot) slot.json += event.delta.partial_json;
      }
    } else if (event.type === "content_block_stop") {
      const slot = pending.get(event.index);
      if (slot) {
        yield { type: "tool", id: slot.id, name: slot.name, args: safeParse(slot.json) };
        pending.delete(event.index);
      }
    }
  }

  yield { type: "usage", inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, cachedReadTokens: usage.cachedReadTokens };
}

function safeParse(raw: string): Record<string, unknown> {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
