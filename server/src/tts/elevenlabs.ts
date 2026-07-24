import { config } from "../config.js";
import type { TTSProvider, TTSResult } from "./types.js";

// Premium upgrade path. Set ELEVENLABS_API_KEY (and optionally TTS_PROVIDER=elevenlabs)
// to use it. Turbo model keeps latency low for the streamed, sentence-by-sentence flow.
export class ElevenLabsTTSProvider implements TTSProvider {
  readonly id = "elevenlabs";

  isConfigured(): boolean {
    return Boolean(config.keys.elevenlabs);
  }

  async synthesize(text: string, voice?: string): Promise<TTSResult> {
    const voiceId = voice || config.tts.elevenVoiceId;
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": config.keys.elevenlabs, "Content-Type": "application/json" },
        body: JSON.stringify({ text, model_id: "eleven_turbo_v2_5" }),
      },
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`ElevenLabs TTS ${res.status}: ${detail.slice(0, 300)}`);
    }
    return { audio: Buffer.from(await res.arrayBuffer()), contentType: "audio/mpeg" };
  }
}
