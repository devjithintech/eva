import { useEffect, useState } from "react";
import type { CandidateSummary } from "../../api/types";

export interface CandidateFilterState {
  currency: string | null;
  /** Decorative only — "Index" isn't a clean facet on real candidate data (free text). */
  index: string | null;
  region: string | null;
  strategy: string[];
}

export const EMPTY_FILTER: CandidateFilterState = { currency: null, index: null, region: null, strategy: [] };

interface Props {
  open: boolean;
  onClose: () => void;
  candidates: CandidateSummary[];
  value: CandidateFilterState;
  onApply: (next: CandidateFilterState) => void;
}

const INDEX_GROUPS: [string, string[]][] = [
  ["United States (US)", ["S&P 500", "Dow Jones Industrial Average (DJIA)", "Nasdaq Composite", "Russell 2000"]],
  ["Europe (EU)", ["EURO STOXX 600", "FTSE 100", "DAX", "CAC 40"]],
  ["Asia", ["KOSPI", "Nikkei 225", "Hang Seng", "CSI 300"]],
];

type TabKey = "Currency" | "Index" | "Region" | "Strategy";
const TABS: TabKey[] = ["Currency", "Index", "Region", "Strategy"];

/** Count distinct values across candidates, sorted most-common first. */
function frequencyRanked(values: (string | null)[]): string[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
}

/** Candidate Filter modal. Currency/Region/Strategy facets are real — derived
 *  from `GET /candidates` classification data and actually narrow the table
 *  (see `CandidatesPage`'s filter logic). "Index" is decorative: the backing
 *  field (stated benchmark) is free text, not a clean filterable facet. */
export function CandidateFilterDialog({ open, onClose, candidates, value, onApply }: Props) {
  const [tab, setTab] = useState<TabKey>("Currency");
  const [draft, setDraft] = useState<CandidateFilterState>(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  if (!open) return null;

  const currencies = frequencyRanked(candidates.map((c) => c.currency));
  const regions = frequencyRanked(candidates.flatMap((c) => c.regions));
  const strategies = frequencyRanked(candidates.map((c) => c.strategy));

  const toggleStrategy = (s: string) =>
    setDraft((d) => ({
      ...d,
      strategy: d.strategy.includes(s) ? d.strategy.filter((x) => x !== s) : [...d.strategy, s],
    }));

  return (
    <div
      className="pref-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pref-dialog" role="dialog" aria-modal="true" aria-label="Candidate Filter">
        <div className="pref-head">
          <div className="pref-title">Candidate Filter</div>
          <button className="pref-x" aria-label="Close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="pref-body">
          <div className="cfd-tabs">
            {TABS.map((t) => (
              <button key={t} type="button" className={`cfd-tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
          </div>

          {tab === "Currency" && (
            <div className="cfd-panel">
              {currencies.length === 0 && <div className="cfd-empty">No currency data available.</div>}
              {currencies.map((cur) => (
                <label className="cfd-opt" key={cur}>
                  <input
                    type="radio"
                    name="cfd-currency"
                    checked={draft.currency === cur}
                    onChange={() => setDraft((d) => ({ ...d, currency: cur }))}
                  />
                  <span className="cfd-radio" />
                  <span>{cur}</span>
                </label>
              ))}
            </div>
          )}

          {tab === "Index" && (
            <div className="cfd-panel">
              {INDEX_GROUPS.map(([group, opts]) => (
                <div key={group}>
                  <div className="cfd-ghead">{group}</div>
                  {opts.map((opt) => (
                    <label className="cfd-opt" key={opt}>
                      <input
                        type="radio"
                        name="cfd-index"
                        checked={draft.index === opt}
                        onChange={() => setDraft((d) => ({ ...d, index: opt }))}
                      />
                      <span className="cfd-radio" />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          )}

          {tab === "Region" && (
            <div className="cfd-panel">
              {regions.length === 0 && <div className="cfd-empty">No region data available.</div>}
              {regions.map((r) => (
                <label className="cfd-opt" key={r}>
                  <input
                    type="radio"
                    name="cfd-region"
                    checked={draft.region === r}
                    onChange={() => setDraft((d) => ({ ...d, region: r }))}
                  />
                  <span className="cfd-radio" />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          )}

          {tab === "Strategy" && (
            <div className="cfd-panel">
              {strategies.length === 0 && <div className="cfd-empty">No strategy data available.</div>}
              {strategies.map((s) => (
                <label className="cfd-opt" key={s}>
                  <input type="checkbox" checked={draft.strategy.includes(s)} onChange={() => toggleStrategy(s)} />
                  <span className="cfd-check">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span>{s}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="pref-foot cfd-foot">
          <button className="btn cfd-cancel" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn pref-save"
            type="button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
}
