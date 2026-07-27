import { useState } from "react";

export interface PreferenceMetric {
  key: string;
  label: string;
  /** Optional descriptive line shown under the label (factor preferences use this). */
  sub?: string;
  min: number;
  max: number;
  step: number;
  defaultLo: number;
  defaultHi: number;
  format: (v: number) => string;
  /** Shows a 6M/12M lookback toggle chip next to the label (momentum-style metrics). */
  lookback?: boolean;
}

export type PreferenceRange = { lo: number; hi: number };
export type PreferenceValues = Record<string, PreferenceRange>;

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  metrics: PreferenceMetric[];
  notesPlaceholder: string;
  /** Called with the current lo/hi ranges when the user clicks "Save
   *  preferences" — lets a caller actually use a range (e.g. Alpha driving
   *  the Selection Zone chart) instead of the dialog staying fully
   *  decorative. Optional: dialogs with no live consumer can omit it. */
  onApply?: (values: PreferenceValues) => void;
}

type Range = PreferenceRange;

/** Decorative dual-range slider dialog — mirrors the design reference's
 *  Preferences / Factor preferences modals. Sliders, notes, and lookback
 *  toggles are locally-held UI state only: Save closes the dialog without
 *  altering what the dashboard shows, same as the reference. */
export function PreferenceDialog({ open, onClose, title, description, metrics, notesPlaceholder, onApply }: Props) {
  const defaults = (): Record<string, Range> =>
    Object.fromEntries(metrics.map((m) => [m.key, { lo: m.defaultLo, hi: m.defaultHi }]));

  const [values, setValues] = useState<Record<string, Range>>(defaults);
  const [notes, setNotes] = useState("");
  const [lookback, setLookback] = useState<Record<string, "6M" | "12M">>(
    Object.fromEntries(metrics.filter((m) => m.lookback).map((m) => [m.key, "12M"])),
  );

  if (!open) return null;

  const setLo = (key: string, v: number) =>
    setValues((prev) => {
      const cur = prev[key];
      const lo = Math.min(v, cur.hi);
      return { ...prev, [key]: { ...cur, lo } };
    });
  const setHi = (key: string, v: number) =>
    setValues((prev) => {
      const cur = prev[key];
      const hi = Math.max(v, cur.lo);
      return { ...prev, [key]: { ...cur, hi } };
    });

  const reset = () => {
    setValues(defaults());
    setNotes("");
    setLookback(Object.fromEntries(metrics.filter((m) => m.lookback).map((m) => [m.key, "12M"])));
  };

  return (
    <div
      className="pref-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pref-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <div className="pref-head">
          <div>
            <div className="pref-title">{title}</div>
            <div className="pref-desc">{description}</div>
          </div>
          <button className="pref-x" aria-label="Close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="pref-body">
          <div className="pref-sliders">
            {metrics.map((m) => {
              const { lo, hi } = values[m.key];
              const span = m.max - m.min;
              const leftPct = ((lo - m.min) / span) * 100;
              const widthPct = ((hi - lo) / span) * 100;
              return (
                <div className="pf-row" key={m.key}>
                  <div className="pf-top">
                    <span className="pf-name">
                      {m.label}
                      {m.lookback && (
                        <span className="fp-look">
                          {(["6M", "12M"] as const).map((lb) => (
                            <button
                              key={lb}
                              type="button"
                              className={`fp-chip${lookback[m.key] === lb ? " active" : ""}`}
                              onClick={() => setLookback((prev) => ({ ...prev, [m.key]: lb }))}
                            >
                              {lb}
                            </button>
                          ))}
                        </span>
                      )}
                    </span>
                    <span className="pf-val">
                      {m.format(lo)} – {m.format(hi)}
                    </span>
                  </div>
                  {m.sub && <div className="pf-sub">{m.sub}</div>}
                  <div className="pf-slider">
                    <div className="pf-track" />
                    <div className="pf-fill" style={{ left: `${leftPct}%`, width: `${widthPct}%` }} />
                    <input
                      type="range"
                      className="pf-input"
                      min={m.min}
                      max={m.max}
                      step={m.step}
                      value={lo}
                      onChange={(e) => setLo(m.key, Number(e.target.value))}
                    />
                    <input
                      type="range"
                      className="pf-input"
                      min={m.min}
                      max={m.max}
                      step={m.step}
                      value={hi}
                      onChange={(e) => setHi(m.key, Number(e.target.value))}
                    />
                  </div>
                  <div className="pf-scale">
                    {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                      <span key={t}>{m.format(m.min + span * t)}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="pref-note">
            <label className="pref-lab" htmlFor="pref-notes-ta">
              Custom instructions <span className="pref-hint">MARKDOWN</span>
            </label>
            <textarea
              id="pref-notes-ta"
              className="pref-ta"
              placeholder={notesPlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="pref-foot">
          <button className="btn pref-reset" type="button" onClick={reset}>
            Reset to defaults
          </button>
          <button
            className="btn pref-save"
            type="button"
            onClick={() => {
              onApply?.(values);
              onClose();
            }}
          >
            Save preferences
          </button>
        </div>
      </div>
    </div>
  );
}
