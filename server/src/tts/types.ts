/** Provider-agnostic text-to-speech contract (mirrors the LLM provider design). */
export interface TTSResult {
  audio: Buffer;
  contentType: string;
}

export interface TTSProvider {
  readonly id: string;
  isConfigured(): boolean;
  synthesize(text: string, voice?: string): Promise<TTSResult>;
}
