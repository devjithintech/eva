import { config } from "../config.js";
import { ElevenLabsTTSProvider } from "./elevenlabs.js";
import { GroqTTSProvider } from "./groq.js";
import type { TTSProvider } from "./types.js";

const providers: Record<string, TTSProvider> = {
  groq: new GroqTTSProvider(),
  elevenlabs: new ElevenLabsTTSProvider(),
};

/** Selectable voices per provider. For Groq (Orpheus) the id IS the voice name;
 *  for ElevenLabs the id is the voiceId and label is the human name. */
const VOICES: Record<string, { id: string; label: string }[]> = {
  groq: ["tara", "leah", "jess", "leo", "dan", "mia", "zac", "zoe"].map((v) => ({
    id: v,
    label: v[0].toUpperCase() + v.slice(1),
  })),
  elevenlabs: [
    { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah" },
    { id: "21m00Tcm4TlvDq8ikWAM", label: "Rachel" },
    { id: "pNInz6obpgDQGcFmaJgB", label: "Adam" },
  ],
};

const PROVIDER_LABEL: Record<string, string> = {
  groq: "Orpheus (Groq)",
  elevenlabs: "ElevenLabs",
};

export interface VoiceOption {
  key: string; // `${provider}:${voice}`
  provider: string;
  providerLabel: string;
  voice: string;
  label: string;
}

/** Default provider: the configured choice if its key is present, else the first
 *  configured one, else null (frontend falls back to browser speechSynthesis). */
export function resolveTTS(): TTSProvider | null {
  const preferred = providers[config.tts.provider];
  if (preferred?.isConfigured()) return preferred;
  return Object.values(providers).find((p) => p.isConfigured()) ?? null;
}

/** Provider for an explicit per-request id, falling back to the default. */
export function getProvider(id?: string): TTSProvider | null {
  if (id && providers[id]?.isConfigured()) return providers[id];
  return resolveTTS();
}

function defaultVoiceFor(providerId: string): string {
  return providerId === "elevenlabs" ? config.tts.elevenVoiceId : config.tts.voice;
}

/** Every voice the client may pick right now (only configured providers). */
export function availableVoices(): VoiceOption[] {
  return Object.keys(providers)
    .filter((id) => providers[id].isConfigured())
    .flatMap((id) =>
      (VOICES[id] ?? []).map((v) => ({
        key: `${id}:${v.id}`,
        provider: id,
        providerLabel: PROVIDER_LABEL[id] ?? id,
        voice: v.id,
        label: v.label,
      })),
    );
}

export function ttsStatus() {
  const active = resolveTTS();
  return {
    enabled: Boolean(active),
    default: active ? { provider: active.id, voice: defaultVoiceFor(active.id), key: `${active.id}:${defaultVoiceFor(active.id)}` } : null,
    options: availableVoices(),
  };
}
