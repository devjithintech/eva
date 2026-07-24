import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// Load env regardless of the process working directory (src/ in dev, dist/ in
// prod both sit one level under the server package root). Prefer server/.env;
// fall back to the repo-root .env so a single top-level file also works. dotenv
// doesn't overwrite already-set vars, so the server-local file wins.
const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../.env") });
dotenv.config({ path: path.resolve(here, "../../.env") });

export const config = {
  port: Number(process.env.PORT ?? 8787),
  defaultModel: process.env.DEFAULT_MODEL ?? "groq-llama-3.3-70b",
  keys: {
    gemini: process.env.GEMINI_API_KEY ?? "",
    openai: process.env.OPENAI_API_KEY ?? "",
    anthropic: process.env.ANTHROPIC_API_KEY ?? "",
    groq: process.env.GROQ_API_KEY ?? "",
    elevenlabs: process.env.ELEVENLABS_API_KEY ?? "",
  },
  // Microsoft (Azure AI) Foundry. One resource serves both Claude (via the
  // Anthropic-compatible "/anthropic/" passthrough) and speech-to-text (Whisper
  // via the Azure OpenAI transcription route). Both authenticate with FOUNDRY_API_KEY.
  foundry: {
    endpoint: process.env.FOUNDRY_ENDPOINT ?? "",
    apiKey: process.env.FOUNDRY_API_KEY ?? "",
    model: process.env.FOUNDRY_MODEL ?? "claude-sonnet-4-6",
    // Full transcription URL. If unset, it's derived from FOUNDRY_ENDPOINT by
    // swapping the "/anthropic/" passthrough for the Azure OpenAI audio route.
    transcribeEndpoint: process.env.FOUNDRY_TRANSCRIBE_ENDPOINT ?? "",
    // Azure deployment name of the speech-to-text model (e.g. "whisper").
    transcribeModel: process.env.FOUNDRY_TRANSCRIBE_MODEL ?? "whisper",
  },
  tts: {
    // "groq" (Orpheus, free tier) | "elevenlabs"
    provider: process.env.TTS_PROVIDER ?? "groq",
    voice: process.env.TTS_VOICE ?? "tara",
    groqModel: process.env.GROQ_TTS_MODEL ?? "canopylabs/orpheus-v1-english",
    elevenVoiceId: process.env.ELEVENLABS_VOICE_ID ?? "EXAVITQu4vr4xnSDxMaL", // "Sarah"
  },
} as const;
