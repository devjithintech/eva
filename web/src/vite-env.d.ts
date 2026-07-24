/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AGENT_URL?: string;
  readonly VITE_MODELS_URL?: string;
  readonly VITE_TTS_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
