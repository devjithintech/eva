import { useCallback, useEffect, useRef, useState } from "react";

const TRANSCRIBE_URL = import.meta.env.VITE_TRANSCRIBE_URL ?? "/transcribe";
const STATUS_URL = import.meta.env.VITE_TRANSCRIBE_STATUS_URL ?? "/transcribe/status";

// Voice-activity thresholds for the server-STT capture loop. RMS is measured on
// the time-domain waveform in [-1, 1]; speech sits well above room noise.
const START_RMS = 0.02; // onset: begin counting once the mic hears speech
const SILENCE_MS = 1100; // stop this long after the last voiced frame
const NO_SPEECH_MS = 8000; // give up if nothing is said
const MAX_MS = 20000; // hard cap on a single utterance
const MIN_BYTES = 1400; // ignore clips too short to be real speech

// ── Browser Web Speech API (fallback when server STT isn't configured) ──────
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [i: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onstart: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function pickMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  const MR = window.MediaRecorder;
  if (MR?.isTypeSupported) {
    for (const t of candidates) if (MR.isTypeSupported(t)) return t;
  }
  return "";
}

const hasMediaRecorder = () =>
  typeof window !== "undefined" &&
  typeof window.MediaRecorder !== "undefined" &&
  Boolean(navigator.mediaDevices?.getUserMedia);

/**
 * Speech-in. Prefers server-side transcription (Azure Foundry Whisper): records
 * one utterance in the browser, detects its end with a lightweight voice-activity
 * loop, and POSTs the audio to /transcribe. Falls back to the browser's Web
 * Speech API when the server has no STT provider, or if the mic/transcription
 * fails. `listening` drives the orb affordance; `interim` carries live words
 * (browser path only) and is kept empty during server capture so the pulsing
 * "listening" dots show. onFinal is called with the final transcript.
 */
export function useSpeech(onFinal: (text: string) => void) {
  const [serverSTT, setServerSTT] = useState(false);
  const supported = hasMediaRecorder() || Boolean(getSpeechCtor());
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const finalCb = useRef(onFinal);
  finalCb.current = onFinal;

  // Learn whether server STT is available (mirrors the TTS status probe).
  useEffect(() => {
    let alive = true;
    fetch(STATUS_URL)
      .then((r) => r.json())
      .then((s: { enabled?: boolean }) => {
        if (alive) setServerSTT(Boolean(s.enabled));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // ── Server capture state ──────────────────────────────────────────────────
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const raf = useRef<number | null>(null);
  const chunks = useRef<Blob[]>([]);
  const active = useRef(false);
  const submitted = useRef(false); // did VAD decide this utterance is real?

  // ── Browser fallback state ──────────────────────────────────────────────────
  const rec = useRef<SpeechRecognitionLike | null>(null);

  const teardownCapture = useCallback(() => {
    if (raf.current != null) cancelAnimationFrame(raf.current);
    raf.current = null;
    try {
      if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
    } catch {
      /* already stopped */
    }
    recorder.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    void audioCtx.current?.close().catch(() => {});
    audioCtx.current = null;
    active.current = false;
  }, []);

  const startBrowser = useCallback(() => {
    const Ctor = getSpeechCtor();
    if (!Ctor || rec.current) return;
    const r = new Ctor();
    r.lang = "en-US";
    r.continuous = false;
    r.interimResults = true;
    let finalText = "";
    r.onstart = () => {
      setListening(true);
      setInterim("");
    };
    r.onresult = (e) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interimText += res[0].transcript;
      }
      setInterim(finalText + interimText);
    };
    r.onerror = () => {};
    r.onend = () => {
      setListening(false);
      setInterim("");
      rec.current = null;
      const t = finalText.trim();
      if (t) finalCb.current(t);
    };
    rec.current = r;
    try {
      r.start();
    } catch {
      rec.current = null;
      setListening(false);
    }
  }, []);

  const startServer = useCallback(async () => {
    if (active.current) return;
    active.current = true;
    submitted.current = false;
    chunks.current = [];
    // Light up the orb immediately, before the (async) mic grab, so the click
    // gives instant feedback. interim stays empty → the pulsing dots show.
    setInterim("");
    setListening(true);

    let mediaStream: MediaStream;
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      // No mic / permission denied → fall back to the browser recognizer.
      active.current = false;
      setListening(false);
      setServerSTT(false);
      startBrowser();
      return;
    }
    stream.current = mediaStream;

    const mimeType = pickMimeType();
    const mr = new MediaRecorder(mediaStream, mimeType ? { mimeType } : undefined);
    recorder.current = mr;
    chunks.current = [];
    mr.ondataavailable = (e) => {
      if (e.data.size) chunks.current.push(e.data);
    };
    mr.onstop = async () => {
      const wasSpeech = submitted.current;
      const blob = new Blob(chunks.current, { type: mr.mimeType || "audio/webm" });
      chunks.current = [];
      teardownCapture();
      if (!wasSpeech || blob.size < MIN_BYTES) {
        setListening(false);
        setInterim("");
        return;
      }
      // Keep the orb lit while we transcribe so it reads as "working".
      try {
        const res = await fetch(TRANSCRIBE_URL, {
          method: "POST",
          headers: { "Content-Type": blob.type || "audio/webm" },
          body: blob,
        });
        if (!res.ok) throw new Error(`transcribe ${res.status}`);
        const { text } = (await res.json()) as { text?: string };
        setListening(false);
        setInterim("");
        const t = (text ?? "").trim();
        if (t) finalCb.current(t);
      } catch {
        // Server transcription failed — use the browser recognizer next time.
        setServerSTT(false);
        setListening(false);
        setInterim("");
      }
    };

    // Voice-activity detection off the live waveform.
    const ctx = new AudioContext();
    audioCtx.current = ctx;
    const srcNode = ctx.createMediaStreamSource(mediaStream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    srcNode.connect(analyser);
    const buf = new Float32Array(analyser.fftSize);

    const t0 = performance.now();
    let speechStarted = false;
    let lastVoice = t0;

    const tick = () => {
      if (!active.current || mr.state !== "recording") return;
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      const now = performance.now();

      if (rms > START_RMS) {
        lastVoice = now;
        if (!speechStarted) {
          speechStarted = true;
          submitted.current = true;
        }
      }

      const idle = now - lastVoice;
      const done =
        (speechStarted && idle > SILENCE_MS) ||
        (!speechStarted && now - t0 > NO_SPEECH_MS) ||
        now - t0 > MAX_MS;

      if (done) {
        try {
          mr.stop();
        } catch {
          /* ignore */
        }
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };

    mr.start();
    raf.current = requestAnimationFrame(tick);
  }, [teardownCapture, startBrowser]);

  const start = useCallback(() => {
    if (serverSTT && hasMediaRecorder()) void startServer();
    else startBrowser();
  }, [serverSTT, startServer, startBrowser]);

  const stop = useCallback(() => {
    // Abort without submitting — used when the user turns voice mode off.
    if (active.current) {
      submitted.current = false;
      teardownCapture();
    }
    setListening(false);
    setInterim("");
    rec.current?.abort();
  }, [teardownCapture]);

  useEffect(
    () => () => {
      teardownCapture();
      rec.current?.abort();
    },
    [teardownCapture],
  );

  return { supported, listening, interim, start, stop };
}
