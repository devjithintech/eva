import { useEffect, useRef, useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import {
  BellIcon,
  ChatBubbleIcon,
  ChevronRightIcon,
  HelpIcon,
  MicIcon,
  MoonIcon,
  SearchIcon,
  SettingsIcon,
  SunIcon,
} from "../common/icons";

interface Props {
  /** When false the voice toggle is hidden entirely (build kill-switch). */
  voiceAvailable?: boolean;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  chatOpen: boolean;
  onToggleChat: () => void;
  onLogoClick: () => void;
}

const WORKSPACES = [
  { color: "#f7bd2e", title: "Candidate Intelligence Agent (CIA)", sub: "Portfolio manager background evaluation", active: true },
  { color: "#bb5fe0", title: "Portfolio Analysis", sub: "Monitor and review PM portfolio daily" },
  { color: "#5b8def", title: "Portfolio Risk", sub: "Analyzes common risk factors and Alpha" },
  { color: "#86b07f", title: "Portfolio Risk", sub: "Analyzes common risk factors and Alpha" },
];

/** App chrome: workspace switcher, search, CIA pill, and the assistant / voice /
 *  theme toggle cluster. */
export function TopBar({ voiceAvailable = true, voiceEnabled, onToggleVoice, chatOpen, onToggleChat, onLogoClick }: Props) {
  const { isDark, toggle } = useTheme();
  const [wsOpen, setWsOpen] = useState(false);
  const wsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!wsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (wsRef.current && !wsRef.current.contains(e.target as Node)) setWsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [wsOpen]);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <div className="ws-switcher" ref={wsRef}>
            <button
              className={`grid-btn${wsOpen ? " open" : ""}`}
              aria-label="Switch workspace"
              onClick={() => setWsOpen((v) => !v)}
            >
              <span className="grid-ico">
                <i /><i /><i /><i />
              </span>
            </button>
            <div className={`ws-pop${wsOpen ? " open" : ""}`}>
              <div className="ws-pop-title">Switch to other workspace</div>
              {WORKSPACES.map((w, i) => (
                <a key={i} className={`ws-item${w.active ? " active" : ""}`}>
                  <span className="ws-ico" style={{ background: w.color }} />
                  <span className="ws-text">
                    <span className="ws-tt">{w.title}</span>
                    <span className="ws-sub">{w.sub}</span>
                  </span>
                </a>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="brand-logo"
            onClick={onLogoClick}
            aria-label="LightHouse home"
            style={{ border: "none", background: "none", padding: 0, font: "inherit", color: "inherit" }}
          >
            <LighthouseMark />
            <span>LightHouse</span>
          </button>
        </div>

        <div className="tb-search">
          <SearchIcon size={18} stroke="currentColor" />
          <input placeholder="Search candidates, funds, people…" />
        </div>

        <div className="tb-right">
          <a href="#/test" className="mode-pill" title="AG-UI artifact gallery">
            CIA Dashboard
            <ChevronRightIcon size={15} stroke="currentColor" />
          </a>

          <button
            className={`icon-btn${chatOpen ? " active" : ""}`}
            onClick={onToggleChat}
            aria-pressed={chatOpen}
            aria-label="Toggle LightAssist chat"
            title="LightAssist"
          >
            <ChatBubbleIcon size={19} stroke="currentColor" />
          </button>

          {voiceAvailable && (
            <button
              className={`icon-btn${voiceEnabled ? " active" : ""}`}
              onClick={onToggleVoice}
              aria-pressed={voiceEnabled}
              title={voiceEnabled ? "Voice assistant on — click to disable" : "Voice assistant off — click to enable"}
            >
              <MicIcon size={18} stroke="currentColor" />
            </button>
          )}

          <button className="icon-btn" title="Notifications" aria-label="Notifications">
            <BellIcon size={18} stroke="currentColor" />
          </button>

          <button
            className="icon-btn"
            onClick={toggle}
            title="Toggle light / dark"
            aria-label="Toggle light / dark"
          >
            {isDark ? <SunIcon size={18} stroke="#e2ab54" /> : <MoonIcon size={18} stroke="currentColor" />}
          </button>

          <button className="icon-btn" title="Help" aria-label="Help">
            <HelpIcon size={18} stroke="currentColor" />
          </button>

          <button className="icon-btn" title="Settings" aria-label="Settings">
            <SettingsIcon size={18} stroke="currentColor" />
          </button>

          <span className="avatar-sm">MM</span>
        </div>
      </div>
    </header>
  );
}

function LighthouseMark() {
  return (
    <svg width={26} height={26} viewBox="0 0 28 28" style={{ display: "block" }}>
      <defs>
        <clipPath id="lhClip">
          <circle cx="14" cy="14" r="13" />
        </clipPath>
      </defs>
      <g clipPath="url(#lhClip)">
        <rect x="0" y="0" width="28" height="7.45" fill="#98CAEA" />
        <rect x="0" y="8.55" width="28" height="8.9" fill="#6AAAE4" />
        <rect x="0" y="18.55" width="28" height="9.45" fill="#082F57" />
      </g>
    </svg>
  );
}
