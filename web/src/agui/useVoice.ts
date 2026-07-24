import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, RunStatus } from "./useAguiAgent";
import { useSpeech } from "./useSpeech";
import { useTTS } from "./useTTS";

interface Options {
  chat: ChatMessage[];
  status: RunStatus;
  submit: (text: string) => void;
}

/**
 * Hands-free voice conversation controller. Composes browser STT + server TTS
 * around the agent:
 *  - listens for a question and submits it,
 *  - speaks the assistant's answer sentence-by-sentence as it streams,
 *  - half-duplex: the mic is paused while speaking (no echo), then resumes.
 */
export function useVoice({ chat, status, submit }: Options) {
  const [voiceMode, setVoiceMode] = useState(false);
  const voiceModeRef = useRef(false);
  voiceModeRef.current = voiceMode;

  const { speak, stop: ttsStop, speaking, speakingText, voices, voiceKey, setVoiceKey } = useTTS();
  const spoken = useRef<{ id: string; len: number }>({ id: "", len: 0 });

  const { supported, listening, interim, start: sttStart, stop: sttStop } = useSpeech((text) => {
    if (voiceModeRef.current) submit(text);
  });

  // Speak the latest assistant message as complete sentences arrive.
  useEffect(() => {
    if (!voiceMode) return;
    const last = [...chat].reverse().find((m) => m.role === "assistant");
    if (!last) return;
    if (spoken.current.id !== last.id) spoken.current = { id: last.id, len: 0 };

    const pending = last.content.slice(spoken.current.len);
    if (!pending) return;

    if (status === "idle") {
      const text = pending.trim();
      if (text) speak(text);
      spoken.current.len = last.content.length;
    } else {
      // Mid-stream: only speak whole sentences; keep the trailing partial.
      const sentences = pending.match(/[^.!?]+[.!?]+(?:\s|$)/g);
      if (sentences && sentences.length) {
        const consumed = sentences.join("");
        const text = consumed.trim();
        if (text) speak(text);
        spoken.current.len += consumed.length;
      }
    }
  }, [chat, status, voiceMode, speak]);

  // Hands-free loop: when idle and not speaking, (re)open the mic.
  useEffect(() => {
    if (voiceMode && supported && status === "idle" && !speaking && !listening) {
      const t = setTimeout(() => sttStart(), 250);
      return () => clearTimeout(t);
    }
  }, [voiceMode, status, speaking, listening, supported, sttStart]);

  const toggle = useCallback(() => {
    setVoiceMode((on) => {
      const next = !on;
      ttsStop(); // cut any in-flight speech (e.g. the welcome) so the mic starts clean
      if (!next) sttStop();
      return next;
    });
  }, [ttsStop, sttStop]);

  return { voiceMode, toggle, supported, listening, interim, speaking, speakingText, speak, stopSpeaking: ttsStop, voices, voiceKey, setVoiceKey };
}
