import { config } from "../config.js";
import type { TTSProvider, TTSResult } from "./types.js";

// Groq hosts PlayAI TTS on its OpenAI-compatible /audio/speech endpoint, on the
// free tier. Note: the playai-tts model requires a one-time terms acceptance in
// the Groq console (console.groq.com) before the first call succeeds.
const GROQ_SPEECH_URL = "https://api.groq.com/openai/v1/audio/speech";

export class GroqTTSProvider implements TTSProvider {
  readonly id = "groq";

  isConfigured(): boolean {
    return Boolean(config.keys.groq);
  }

  async synthesize(text: string, voice?: string): Promise<TTSResult> {
    const res = await fetch(GROQ_SPEECH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.keys.groq}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.tts.groqModel,
        voice: voice || config.tts.voice,
        input: text,
        response_format: "wav",
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Groq TTS ${res.status}: ${detail.slice(0, 300)}`);
    }
    return { audio: Buffer.from(await res.arrayBuffer()), contentType: "audio/wav" };
  }
}
