import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { joinSystem, type LLMTool, type ProviderStreamEvent, type StreamChatOptions } from "./types.js";

/**
 * Shared streaming implementation for any OpenAI-compatible Chat Completions
 * endpoint. OpenAI and Groq both speak this protocol — they differ only in
 * base URL and key — so both providers delegate here.
 */
function toTools(tools: LLMTool[]): ChatCompletionTool[] {
  return tools.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

export async function* streamOpenAICompatible(
  client: OpenAI,
  opts: StreamChatOptions,
): AsyncIterable<ProviderStreamEvent> {
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: joinSystem(opts.system) },
    ...opts.messages.map((m) => ({ role: m.role, content: m.content }) as ChatCompletionMessageParam),
  ];

  const stream = await client.chat.completions.create(
    {
      model: opts.model,
      messages,
      tools: opts.tools.length ? toTools(opts.tools) : undefined,
      stream: true,
    },
    { signal: opts.signal },
  );

  // Tool-call args arrive as fragments keyed by index; accumulate then flush.
  const pending = new Map<number, { id: string; name: string; args: string }>();

  for await (const chunk of stream) {
    const choice = chunk.choices[0];
    const delta = choice?.delta;
    if (delta?.content) yield { type: "text", delta: delta.content };

    for (const tc of delta?.tool_calls ?? []) {
      const slot = pending.get(tc.index) ?? { id: "", name: "", args: "" };
      if (tc.id) slot.id = tc.id;
      if (tc.function?.name) slot.name = tc.function.name;
      if (tc.function?.arguments) slot.args += tc.function.arguments;
      pending.set(tc.index, slot);
    }

    // Some OpenAI-compatible backends (incl. Groq) use finish_reason "stop"
    // alongside tool calls, so flush whenever the stream signals completion.
    if (choice?.finish_reason && pending.size) {
      for (const slot of pending.values()) {
        yield { type: "tool", id: slot.id, name: slot.name, args: safeParse(slot.args) };
      }
      pending.clear();
    }
  }
}

function safeParse(raw: string): Record<string, unknown> {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
