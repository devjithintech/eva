import OpenAI from "openai";
import { config } from "../config.js";
import { streamOpenAICompatible } from "./openaiCompatible.js";
import type { LLMProvider, ProviderStreamEvent, StreamChatOptions } from "./types.js";

// Groq exposes an OpenAI-compatible Chat Completions API, so we reuse the
// OpenAI SDK pointed at Groq's base URL. Fast + generous free tier — handy
// when other providers' quotas are exhausted.
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: config.keys.groq, baseURL: GROQ_BASE_URL });
  return client;
}

export class GroqProvider implements LLMProvider {
  readonly id = "groq";

  isConfigured(): boolean {
    return Boolean(config.keys.groq);
  }

  streamChat(opts: StreamChatOptions): AsyncIterable<ProviderStreamEvent> {
    return streamOpenAICompatible(getClient(), opts);
  }
}
