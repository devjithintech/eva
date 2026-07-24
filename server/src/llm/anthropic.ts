import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";
import { streamAnthropicCompatible } from "./anthropicCompatible.js";
import type { LLMProvider, ProviderStreamEvent, StreamChatOptions } from "./types.js";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: config.keys.anthropic });
  return client;
}

export class AnthropicProvider implements LLMProvider {
  readonly id = "anthropic";

  isConfigured(): boolean {
    return Boolean(config.keys.anthropic);
  }

  streamChat(opts: StreamChatOptions): AsyncIterable<ProviderStreamEvent> {
    return streamAnthropicCompatible(getClient(), opts.model, opts);
  }
}
