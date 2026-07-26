import { useEffect, useState } from "react";

export interface AnalysisWindow {
  from: string;
  to: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  value: AnalysisWindow;
  onApply: (next: AnalysisWindow) => void;
}

const WIN_MIN = "2022-11";
const WIN_MAX = "2025-11";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shift(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  let total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  return `${ny}-${String(nm + 1).padStart(2, "0")}`;
}
function fmt(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MONTHS[Number(m) - 1]}-${y.slice(2)}`;
}
function obsCount(f: string, t: string): number {
  const [fy, fm] = f.split("-").map(Number);
  const [ty, tm] = t.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

/** Analysis window modal — date-range presets + custom month range. Display
 *  only: the reference itself doesn't actually re-chart anything off this,
 *  consistent with the rest of this illustrative page. */
export function WindowModal({ open, onClose, value, onApply }: Props) {
  const [draft, setDraft] = useState<AnalysisWindow>(value);
  const [preset, setPreset] = useState<string | null>("full");

  useEffect(() => {
    if (open) {
      setDraft(value);
      setPreset(value.from === WIN_MIN && value.to === WIN_MAX ? "full" : null);
    }
  }, [open, value]);

  if (!open) return null;

  const applyPreset = (kind: "full" | 24 | 12 | "ytd") => {
    setPreset(String(kind));
    const from = kind === "full" ? WIN_MIN : kind === "ytd" ? "2024-12" : shift(WIN_MAX, -kind);
    setDraft({ from, to: WIN_MAX });
  };

  const invalid = !draft.from || !draft.to || draft.from >= draft.to;

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal narrow" role="dialog" aria-modal="true" aria-label="Analysis window">
        <div className="modal-head">
          <div className="modal-title">
            Analysis window
            <small>MONTHLY RETURNS · {fmt(WIN_MIN)} – {fmt(WIN_MAX)} AVAILABLE</small>
          </div>
          <button className="modal-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="win-body">
          <div>
            <div className="win-label">Presets</div>
            <div className="win-presets">
              <button type="button" className={`win-chip${preset === "full" ? " active" : ""}`} onClick={() => applyPreset("full")}>
                Full history
              </button>
              <button type="button" className={`win-chip${preset === "24" ? " active" : ""}`} onClick={() => applyPreset(24)}>
                Last 24M
              </button>
              <button type="button" className={`win-chip${preset === "12" ? " active" : ""}`} onClick={() => applyPreset(12)}>
                Last 12M
              </button>
              <button type="button" className={`win-chip${preset === "ytd" ? " active" : ""}`} onClick={() => applyPreset("ytd")}>
                YTD 2025
              </button>
            </div>
          </div>
          <div>
            <div className="win-label">Custom range</div>
            <div className="win-range">
              <div className="win-field">
                <input
                  type="month"
                  aria-label="Window start month"
                  value={draft.from}
                  min={WIN_MIN}
                  max={WIN_MAX}
                  onChange={(e) => {
                    setPreset(null);
                    setDraft((d) => ({ ...d, from: e.target.value }));
                  }}
                />
              </div>
              <div className="win-field">
                <input
                  type="month"
                  aria-label="Window end month"
                  value={draft.to}
                  min={WIN_MIN}
                  max={WIN_MAX}
                  onChange={(e) => {
                    setPreset(null);
                    setDraft((d) => ({ ...d, to: e.target.value }));
                  }}
                />
              </div>
            </div>
          </div>
          <div className={`win-note${invalid ? " err" : ""}`}>
            {invalid ? (
              "Start month must be on or before end month."
            ) : (
              <>
                <strong>{obsCount(draft.from, draft.to)} monthly obs</strong> · {fmt(draft.from)} – {fmt(draft.to)}
              </>
            )}
          </div>
        </div>
        <div className="modal-foot">
          <div className="modal-foot-info">All stats recompute over the selected window.</div>
          <div className="modal-foot-actions">
            <button className="pl-action-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              className="pl-action-btn primary"
              disabled={invalid}
              onClick={() => {
                onApply(draft);
                onClose();
              }}
            >
              Apply window
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
