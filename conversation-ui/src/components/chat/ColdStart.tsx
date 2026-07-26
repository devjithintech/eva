import type { KeyboardEvent } from "react";
import { useTheme } from "../../context/ThemeContext";
import type { ModelOption } from "../../agui/useModels";
import type { VoiceOption } from "../../agui/useTTS";
import {
  BellIcon,
  ChevronRightIcon,
  FileIcon,
  HelpIcon,
  MoonIcon,
  PaperclipIcon,
  SendIcon,
  SettingsIcon,
  StopIcon,
  SunIcon,
} from "../common/icons";
import { Orb } from "../common/Orb";
import { ModelSwitcher } from "./ModelSwitcher";
import { VoiceSwitcher } from "./VoiceSwitcher";

interface Props {
  persona: string;
  greetingSub: string;
  onMic: () => void;
  onDashboard: () => void;
  listening: boolean;
  speaking: boolean;
  onStopSpeaking: () => void;
  transcript: string;
  draft: string;
  onDraft: (v: string) => void;
  onSend: () => void;
  attachments: string[];
  onAttach: () => void;
  onRemoveAttach: (i: number) => void;
  models: ModelOption[];
  selectedModel: string;
  onSelectModel: (id: string) => void;
  suggestions: string[];
  onPick: (text: string) => void;
  /** Voice available at all (build kill-switch) — hides the orb when false. */
  voiceAvailable: boolean;
  /** Voice assistant enabled — the tara voice picker only shows when true. */
  voiceEnabled: boolean;
  voices: VoiceOption[];
  voiceKey: string | null;
  onVoice: (key: string) => void;
}

/** Curated launch chips — a bold entity label + the prompt sent on click. */
const CHIPS: { label?: string; text: string; folder?: boolean }[] = [
  // { label: "Folder", text: "Show me who's been added since last quarter", folder: true },
  // { label: "ANDA", text: "How does ANDA Cruise compare to our standard benchmarks?" },
  { text: "Stress-test ANDA Cruise against the S&P" },
  { label: "Anda", text: "Rank managers by Sharpe, trailing five years" },
];

/** Orb-led voice landing (the LightHouse home). Its own clean header, tap the orb
 *  to talk, or type below. Any action drops into the dashboard. */
export function ColdStart(props: Props) {
  const { isDark, toggle } = useTheme();
  const { listening, speaking, transcript } = props;
  const hasDraft = props.draft.trim().length > 0;

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (hasDraft) props.onSend();
    }
  };

  return (
    <>
      <header className="ls-topbar">
        <div className="ls-brand">
          <LighthouseMark />
          <span>LightHouse</span>
        </div>
        <div className="ls-top-right">
          <button className="ls-dash-btn" onClick={props.onDashboard}>
            CIA Dashboard
            <ChevronRightIcon size={15} stroke="currentColor" />
          </button>
          <button className="icon-btn" title="Notifications" aria-label="Notifications">
            <BellIcon size={19} stroke="currentColor" />
          </button>
          <button className="icon-btn" title="Help" aria-label="Help">
            <HelpIcon size={19} stroke="currentColor" />
          </button>
          <button className="icon-btn" onClick={toggle} title="Toggle light / dark" aria-label="Toggle light / dark">
            {isDark ? <SunIcon size={19} stroke="#e2ab54" /> : <MoonIcon size={19} stroke="currentColor" />}
          </button>
          <button className="icon-btn" title="Settings" aria-label="Settings">
            <SettingsIcon size={19} stroke="currentColor" />
          </button>
          <span className="ls-avatar">MM</span>
        </div>
      </header>

      <main className="ls" style={{ animation: "fadeUp .5s ease both" }}>
        <h1 className="ls-greet">
          Good morning, {props.persona}.
          <br />
          What&rsquo;s on your mind today?
        </h1>
        <p className="ls-sub">{speaking ? "Speaking…" : listening ? "Listening…" : props.greetingSub}</p>

        <div className="ls-orb-block">
          <div className={`ls-orb-stage${listening || speaking ? " on" : ""}`}>
            <button
              className={`ls-orb-btn${listening || speaking ? " on" : ""}`}
              onClick={props.onMic}
              disabled={!props.voiceAvailable}
              aria-pressed={listening || speaking}
              aria-label={!props.voiceAvailable ? "Voice assistant disabled" : listening ? "Stop listening" : "Start listening"}
              title={props.voiceAvailable ? undefined : "Voice assistant is disabled"}
              style={props.voiceAvailable ? undefined : { opacity: 0.4, filter: "grayscale(0.5)", cursor: "not-allowed" }}
            >
              <span className="ls-rings">
                <i /><i /><i />
              </span>
              <span className="ls-orb">
                <Orb />
                <span className="ls-rim" />
                <span className="ls-gloss" />
              </span>
            </button>
            <span className="ls-halo" />
          </div>

          <div className="ls-spoken">
            {transcript ? (
              <span>{transcript}</span>
            ) : listening ? (
              <span className="ls-elip"><i /><i /><i /></span>
            ) : null}
          </div>

          {speaking && (
            <button
              onClick={props.onStopSpeaking}
              aria-label="Stop speaking"
              style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 4, padding: "7px 14px", border: "1px solid var(--line)", borderRadius: 999, cursor: "pointer", background: "var(--panel)", color: "var(--ink2)", fontSize: 12.5, fontWeight: 600, boxShadow: "0 4px 14px -8px rgba(20,20,40,.3)" }}
            >
              <StopIcon size={13} />
              Stop
            </button>
          )}
        </div>

        <div className="ls-composer">
          {props.attachments.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 8 }}>
              {props.attachments.map((name, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 9px", background: "var(--chip)", border: "1px solid var(--line)", borderRadius: 9, fontSize: 11.5, color: "var(--ink2)", fontWeight: 600 }}>
                  <FileIcon size={13} stroke="var(--primary)" />
                  {name}
                  <button onClick={() => props.onRemoveAttach(i)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--ink3)", padding: 0, fontSize: 12 }}>✕</button>
                </span>
              ))}
            </div>
          )}
          <textarea
            value={props.draft}
            onChange={(e) => props.onDraft(e.target.value)}
            onKeyDown={onKey}
            rows={2}
            placeholder="How can I help you today?"
          />
          <div className="ls-row">
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <button className="ls-cr-btn" title="Attach files" onClick={props.onAttach}>
                <PaperclipIcon size={18} />
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {props.voiceEnabled && <VoiceSwitcher voices={props.voices} selected={props.voiceKey} onSelect={props.onVoice} />}
              <ModelSwitcher models={props.models} selected={props.selectedModel} onSelect={props.onSelectModel} />
              {hasDraft && (
                <button className="ls-send" onClick={props.onSend} aria-label="Send">
                  <SendIcon size={17} width={2.2} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="ls-chips">
          {CHIPS.map((c) => (
            <button key={c.text} className="ls-chip" onClick={() => props.onPick(c.text)}>
              {c.folder ? <FolderIcon /> : <ChatIcon />}
              {c.label && <b>{c.label}</b>}
              <span className="chip-d">{c.text}</span>
            </button>
          ))}
        </div>
      </main>
    </>
  );
}

function LighthouseMark() {
  return (
    <svg width={24} height={24} viewBox="0 0 28 28">
      <defs>
        <clipPath id="lhLand">
          <circle cx="14" cy="14" r="13" />
        </clipPath>
      </defs>
      <g clipPath="url(#lhLand)">
        <rect width="28" height="7.45" fill="#98CAEA" />
        <rect y="8.55" width="28" height="8.9" fill="#6AAAE4" />
        <rect y="18.55" width="28" height="9.45" fill="#082F57" />
      </g>
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}
