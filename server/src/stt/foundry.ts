import { config } from "../config.js";
import type { STTProvider } from "./types.js";

// Speech-to-text via Azure AI Foundry (Whisper), reusing FOUNDRY_API_KEY. The
// Anthropic passthrough that serves Claude can't transcribe, so we call the
// Azure OpenAI audio-transcription route on the same resource. Azure keys go in
// the `api-key` header (not Bearer), and the model is the deployment name.

/** File extension Whisper expects for a given browser recording MIME type. */
function extensionFor(contentType: string): string {
  if (contentType.includes("wav")) return "wav";
  if (contentType.includes("mp4") || contentType.includes("m4a")) return "mp4";
  if (contentType.includes("mpeg") || contentType.includes("mp3")) return "mp3";
  if (contentType.includes("ogg")) return "ogg";
  return "webm"; // MediaRecorder's default (audio/webm;codecs=opus)
}

/**
 * Resolve the full transcription URL. Prefer an explicit override; otherwise
 * derive it from the Anthropic passthrough endpoint by swapping "/anthropic/"
 * for the Azure OpenAI audio route on the same resource.
 */
function transcribeUrl(): string {
  if (config.foundry.transcribeEndpoint) return config.foundry.transcribeEndpoint;
  const base = config.foundry.endpoint.replace(/\/anthropic\/?$/, "").replace(/\/$/, "");
  if (!base) return "";
  const model = encodeURIComponent(config.foundry.transcribeModel);
  return `${base}/openai/deployments/${model}/audio/transcriptions?api-version=2024-06-01`;
}

export class FoundrySTTProvider implements STTProvider {
  readonly id = "foundry";

  isConfigured(): boolean {
    return Boolean(config.foundry.apiKey && transcribeUrl());
  }

  async transcribe(audio: Buffer, contentType: string): Promise<string> {
    const url = transcribeUrl();
    if (!url || !config.foundry.apiKey) throw new Error("Foundry STT not configured");

    const form = new FormData();
    const type = contentType || "audio/webm";
    // Buffer → Uint8Array so the global Blob accepts it in Node.
    form.append("file", new Blob([new Uint8Array(audio)], { type }), `audio.${extensionFor(type)}`);
    form.append("model", config.foundry.transcribeModel);
    form.append("response_format", "json");

    const res = await fetch(url, {
      method: "POST",
      headers: { "api-key": config.foundry.apiKey },
      body: form,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Foundry STT ${res.status}: ${detail.slice(0, 300)}`);
    }
    const data = (await res.json()) as { text?: string };
    return (data.text ?? "").trim();
  }
}
