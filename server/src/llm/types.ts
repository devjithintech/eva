/**
 * Provider-agnostic LLM contract.
 *
 * Every concrete provider (Gemini, OpenAI, Anthropic, mock) normalizes its
 * native streaming API into the same `ProviderStreamEvent` stream so the agent
 * orchestrator in `agui/runAgent.ts` is completely model-agnostic. Switching
 * models is therefore just picking a different registry entry.
 */

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** A tool the model may call. `parameters` is a JSON Schema object. */
export interface LLMTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export type ProviderStreamEvent =
  | { type: "text"; delta: string }
  | { type: "tool"; id: string; name: string; args: Record<string, unknown> }
  | { type: "usage"; inputTokens: number; outputTokens: number; cachedReadTokens?: number };

export interface StreamChatOptions {
  /** Provider-native model id, e.g. "gemini-2.0-flash". */
  model: string;
  /** System prompt. Pass an array to split [stable, ...variable] — providers
   *  with prompt caching (Anthropic) cache the stable first part; the variable
   *  tail (e.g. the session's in-focus candidate) never busts the cache. */
  system: string | string[];
  messages: ChatTurn[];
  tools: LLMTool[];
  signal?: AbortSignal;
}

/** Flatten a split system prompt for providers without prefix caching. */
export const joinSystem = (s: string | string[]): string => (Array.isArray(s) ? s.filter(Boolean).join("\n\n") : s);

export interface LLMProvider {
  readonly id: string;
  /** True when the necessary API key is configured. */
  isConfigured(): boolean;
  streamChat(opts: StreamChatOptions): AsyncIterable<ProviderStreamEvent>;
}
