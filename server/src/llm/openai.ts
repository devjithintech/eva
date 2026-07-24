import OpenAI from "openai";
import { config } from "../config.js";
import { streamOpenAICompatible } from "./openaiCompatible.js";
import type { LLMProvider, ProviderStreamEvent, StreamChatOptions } from "./types.js";

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: config.keys.openai });
  return client;
}

export class OpenAIProvider implements LLMProvider {
  readonly id = "openai";

  isConfigured(): boolean {
    return Boolean(config.keys.openai);
  }

  streamChat(opts: StreamChatOptions): AsyncIterable<ProviderStreamEvent> {
    return streamOpenAICompatible(getClient(), opts);
  }
}
