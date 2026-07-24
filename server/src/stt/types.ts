/** Provider-agnostic speech-to-text contract (mirrors the TTS provider design). */
export interface STTProvider {
  readonly id: string;
  isConfigured(): boolean;
  /** Transcribe one audio clip. `contentType` is the clip's MIME type. */
  transcribe(audio: Buffer, contentType: string): Promise<string>;
}
