import { CONVERSATION_URL } from "../../lib/env";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

interface Props {
  chatOpen: boolean;
  onToggleChat: () => void;
  /** Global search query — filters the candidate dashboard (see App). */
  search: string;
  onSearch: (q: string) => void;
}

/** Shared top bar — ported from the LightHouse design reference's identical
 *  topbar markup across candidates.html/detail.html/peerandfit.html. */
export function TopBar({ chatOpen, onToggleChat, search, onSearch }: Props) {
  return (
    <div className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <WorkspaceSwitcher />
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="26" height="26" role="img" aria-label="LightHouse">
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
          <span>LightHouse</span>
        </div>
        <div className="search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            placeholder="Search"
            aria-label="Search candidates"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <div className="tb-right">
          <a className="mode-pill" href={CONVERSATION_URL}>
            Eva Assist
          </a>
          <button
            type="button"
            className={`icon-btn rovo-icon${chatOpen ? " active" : ""}`}
            aria-label="LightAssist"
            aria-pressed={chatOpen}
            onClick={onToggleChat}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <button type="button" className="icon-btn" aria-label="Notifications">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
          <button type="button" className="icon-btn" aria-label="Help">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
          <button type="button" className="icon-btn" aria-label="Settings">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <span className="avatar-sm">MM</span>
        </div>
      </div>
    </div>
  );
}
