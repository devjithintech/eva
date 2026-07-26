import { useCallback, useEffect, useRef, useState } from "react";

const TTS_URL = import.meta.env.VITE_TTS_URL ?? "/tts";

export interface VoiceOption {
  key: string; // `${provider}:${voice}`
  provider: string;
  providerLabel: string;
  voice: string;
  label: string;
}

/**
 * Speech-out. Queues text chunks (sentences) and plays them in order so the
 * assistant starts talking as soon as the first sentence streams in. The active
 * voice/provider is chosen at runtime (Orpheus voices, ElevenLabs, …) and sent
 * per request. Falls back to the browser's speechSynthesis if the server has no
 * provider or a call fails.
 */
export function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const [speakingText, setSpeakingText] = useState("");
  const [serverTTS, setServerTTS] = useState(true);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [voiceKey, setVoiceKey] = useState<string | null>(null);

  const queue = useRef<string[]>([]);
  const audio = useRef<HTMLAudioElement | null>(null);
  const playing = useRef(false);
  const stopped = useRef(false);
  const onDone = useRef<(() => void) | null>(null);
  const sel = useRef<VoiceOption | null>(null);

  useEffect(() => {
    fetch("/tts/status")
      .then((r) => r.json())
      .then((s: { enabled?: boolean; default?: { key: string }; options?: VoiceOption[] }) => {
        setServerTTS(Boolean(s.enabled));
        setVoices(s.options ?? []);
        setVoiceKey((cur) => cur ?? s.default?.key ?? s.options?.[0]?.key ?? null);
      })
      .catch(() => setServerTTS(false));
    return () => {
      audio.current?.pause();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  // Keep a ref of the resolved selection for use inside the play loop.
  useEffect(() => {
    sel.current = voices.find((v) => v.key === voiceKey) ?? null;
  }, [voices, voiceKey]);

  const playBrowser = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        if (!("speechSynthesis" in window)) return resolve();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.02;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        window.speechSynthesis.speak(u);
      }),
    [],
  );

  const playServer = useCallback(async (text: string) => {
    const res = await fetch(TTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: sel.current?.voice, provider: sel.current?.provider }),
    });
    if (!res.ok) throw new Error(`tts ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const el = audio.current ?? (audio.current = new Audio());
    el.src = url;
    await new Promise<void>((resolve) => {
      el.onended = () => resolve();
      el.onerror = () => resolve();
      void el.play().catch(() => resolve());
    });
    URL.revokeObjectURL(url);
  }, []);

  const pump = useCallback(async () => {
    if (playing.current) return;
    playing.current = true;
    setSpeaking(true);
    while (queue.current.length && !stopped.current) {
      const text = queue.current.shift()!;
      setSpeakingText(text);
      try {
        if (serverTTS) await playServer(text);
        else await playBrowser(text);
      } catch {
        setServerTTS(false);
        await playBrowser(text);
      }
    }
    playing.current = false;
    setSpeaking(false);
    setSpeakingText("");
    if (!queue.current.length) onDone.current?.();
  }, [serverTTS, playServer, playBrowser]);

  const speak = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t) return;
      stopped.current = false;
      queue.current.push(t);
      void pump();
    },
    [pump],
  );

  const stop = useCallback(() => {
    stopped.current = true;
    queue.current = [];
    audio.current?.pause();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    playing.current = false;
    setSpeaking(false);
    setSpeakingText("");
  }, []);

  const setOnDone = useCallback((cb: (() => void) | null) => {
    onDone.current = cb;
  }, []);

  return { speak, stop, speaking, speakingText, setOnDone, voices, voiceKey, setVoiceKey };
}
