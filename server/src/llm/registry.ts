import { config } from "../config.js";
import { AnthropicProvider } from "./anthropic.js";
import { FoundryProvider } from "./foundry.js";
import { GeminiProvider } from "./gemini.js";
import { GroqProvider } from "./groq.js";
import { MockProvider } from "./mock.js";
import { OpenAIProvider } from "./openai.js";
import type { LLMProvider } from "./types.js";

const providers: Record<string, LLMProvider> = {
  foundry: new FoundryProvider(),
  gemini: new GeminiProvider(),
  openai: new OpenAIProvider(),
  anthropic: new AnthropicProvider(),
  groq: new GroqProvider(),
  mock: new MockProvider(),
};

export interface ModelEntry {
  /** Public model id sent by the client. */
  id: string;
  label: string;
  sub: string;
  providerId: keyof typeof providers;
  /** Provider-native model name. */
  providerModel: string;
}

/**
 * Catalog of selectable models, in picker order. Currently ONLY Cloud Foundry
 * (Claude) is enabled — all other providers are commented out below. The UI
 * shows entries whose provider is configured; the default is DEFAULT_MODEL
 * (see resolveModel). To re-enable a model, uncomment its line.
 */
export const MODEL_CATALOG: ModelEntry[] = [
  { id: "foundry-claude", label: "Claude (Foundry)", sub: "Azure AI Foundry · Anthropic-compatible · tool-capable", providerId: "foundry", providerModel: config.foundry.model },
  // ── Other models disabled (Cloud Foundry only). Uncomment to re-enable ──
  // { id: "groq-llama-3.3-70b", label: "Llama 3.3 70B (Groq)", sub: "Groq · fast + free tier · tool-capable", providerId: "groq", providerModel: "llama-3.3-70b-versatile" },
  // { id: "groq-llama-3.1-8b", label: "Llama 3.1 8B (Groq)", sub: "Groq · fastest, lightweight", providerId: "groq", providerModel: "llama-3.1-8b-instant" },
  // { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", sub: "Fast · best for candidate analysis", providerId: "gemini", providerModel: "gemini-2.0-flash" },
  // { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", sub: "Deeper multi-step diligence", providerId: "gemini", providerModel: "gemini-2.5-pro" },
  // { id: "gpt-4o", label: "GPT-4o", sub: "OpenAI · balanced reasoning", providerId: "openai", providerModel: "gpt-4o" },
  // { id: "gpt-4o-mini", label: "GPT-4o mini", sub: "OpenAI · fastest, lightweight", providerId: "openai", providerModel: "gpt-4o-mini" },
  // { id: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet", sub: "Anthropic · strong analysis", providerId: "anthropic", providerModel: "claude-3-5-sonnet-latest" },
  // { id: "demo", label: "Demo (no key)", sub: "Deterministic scripted walkthrough", providerId: "mock", providerModel: "demo" },
];

export interface ResolvedModel {
  entry: ModelEntry;
  provider: LLMProvider;
}

/** True when the model's provider has an API key (mock is always usable). */
export function isModelAvailable(entry: ModelEntry): boolean {
  return providers[entry.providerId].isConfigured();
}

/** Models the client is allowed to pick right now. */
export function availableModels(): ModelEntry[] {
  return MODEL_CATALOG.filter(isModelAvailable);
}

/**
 * Resolve a requested model id to a provider. Falls back gracefully:
 * requested → configured default → first available real model → mock.
 */
export function resolveModel(requestedId?: string): ResolvedModel {
  const pick = (id?: string) =>
    MODEL_CATALOG.find((m) => m.id === id && isModelAvailable(m));

  const entry =
    pick(requestedId) ??
    pick(config.defaultModel) ??
    availableModels().find((m) => m.providerId !== "mock") ??
    MODEL_CATALOG[MODEL_CATALOG.length - 1]; // mock

  return { entry, provider: providers[entry.providerId] };
}
