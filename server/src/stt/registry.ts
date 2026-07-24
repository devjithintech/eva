import { FoundrySTTProvider } from "./foundry.js";
import type { STTProvider } from "./types.js";

const providers: Record<string, STTProvider> = {
  foundry: new FoundrySTTProvider(),
};

/** The active STT provider, or null if none is configured (client then falls
 *  back to the browser's Web Speech API). */
export function resolveSTT(): STTProvider | null {
  return Object.values(providers).find((p) => p.isConfigured()) ?? null;
}

export function sttStatus() {
  const active = resolveSTT();
  return { enabled: Boolean(active), provider: active?.id ?? null };
}
