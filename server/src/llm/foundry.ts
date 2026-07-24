import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";
import { streamAnthropicCompatible } from "./anthropicCompatible.js";
import type { LLMProvider, ProviderStreamEvent, StreamChatOptions } from "./types.js";

// Microsoft (Azure AI) Foundry serves Claude through an Anthropic-compatible
// "/anthropic/" passthrough, so we point the Anthropic SDK at the Foundry
// endpoint + key and reuse the shared Messages streaming. The client picks the
// "foundry-claude" model id; the provider-native model is fixed by config
// (the Azure deployment name), so opts.model is ignored here.
let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      // Match the official AnthropicFoundry client exactly: it POSTs to
      // {base}/v1/messages with BOTH `x-api-key` (SDK default, from apiKey) and
      // `api-key` (Azure style) headers — not Bearer. Verified by running the
      // official Python SDK against this endpoint.
      apiKey: config.foundry.apiKey,
      // Strip any trailing slash so the SDK appends /v1/messages cleanly.
      baseURL: config.foundry.endpoint.replace(/\/$/, ""),
      defaultHeaders: { "api-key": config.foundry.apiKey },
    });
  }
  return client;
}

export class FoundryProvider implements LLMProvider {
  readonly id = "foundry";

  isConfigured(): boolean {
    return Boolean(config.foundry.apiKey && config.foundry.endpoint);
  }

  streamChat(opts: StreamChatOptions): AsyncIterable<ProviderStreamEvent> {
    return streamAnthropicCompatible(getClient(), config.foundry.model, opts);
  }
}
