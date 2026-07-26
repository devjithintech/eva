import { useMemo, useState } from "react";
import { useCandidateMatrix, useCandidates, usePipeline, useSetStage } from "../api/hooks";
import type { CandidateSummary, Stage } from "../api/types";
import { computeScores } from "../lib/score";
import { Breadcrumbs } from "../components/layout/Breadcrumbs";
import { PipelineTabs, type DashboardTab } from "../components/dashboard/PipelineTabs";
import { AzFilterStrip } from "../components/dashboard/AzFilterStrip";
import { CandidateTable, type TableRow } from "../components/dashboard/CandidateTable";
import { CompareDrawer } from "../components/dashboard/CompareDrawer";
import { InsightsPanel } from "../components/dashboard/InsightsPanel";
import { PreferenceDialog, type PreferenceMetric } from "../components/dashboard/PreferenceDialog";
import { CandidateFilterDialog, EMPTY_FILTER, type CandidateFilterState } from "../components/dashboard/CandidateFilterDialog";
import { LoadingState } from "../components/common/LoadingState";
import { ErrorState } from "../components/common/ErrorState";
import { CONVERSATION_URL } from "../lib/env";

const PREFERENCE_METRICS: PreferenceMetric[] = [
  { key: "cagr", label: "CAGR", min: 0, max: 30, step: 0.5, defaultLo: 8, defaultHi: 25, format: (v) => `${v.toFixed(0)}%` },
  { key: "sharpe", label: "Sharpe", min: 0, max: 4, step: 0.1, defaultLo: 1, defaultHi: 3, format: (v) => v.toFixed(1) },
  { key: "info", label: "Info Ratio", min: 0, max: 3, step: 0.1, defaultLo: 0.5, defaultHi: 2, format: (v) => v.toFixed(1) },
  { key: "beta", label: "Net Beta", min: -0.5, max: 1.5, step: 0.05, defaultLo: 0, defaultHi: 0.6, format: (v) => v.toFixed(2) },
  { key: "maxdd", label: "Max DD", min: -30, max: 0, step: 1, defaultLo: -15, defaultHi: 0, format: (v) => `${v.toFixed(0)}%` },
];

const SIZE_LABELS = ["Micro", "Small", "Mid", "Large", "Mega"];
const FACTOR_METRICS: PreferenceMetric[] = [
  { key: "value", label: "Value", sub: "Price-to-earnings vs peers · lower = cheaper", min: 0, max: 50, step: 1, defaultLo: 8, defaultHi: 18, format: (v) => `${v.toFixed(0)}×` },
  { key: "momentum", label: "Momentum", sub: "Trailing return · winners keep winning", min: -20, max: 80, step: 1, defaultLo: 5, defaultHi: 40, format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}%`, lookback: true },
  { key: "minvol", label: "Min Volatility", sub: "Annualised standard deviation · lower = steadier", min: 0, max: 40, step: 0.5, defaultLo: 5, defaultHi: 15, format: (v) => `${v.toFixed(0)}%` },
  { key: "quality", label: "Quality", sub: "Return on equity · profitability, low leverage", min: 0, max: 40, step: 1, defaultLo: 12, defaultHi: 30, format: (v) => `${v.toFixed(0)}%` },
  { key: "size", label: "Size", sub: "Market-cap bucket · Micro <$300M → Mega >$200B", min: 0, max: 4, step: 1, defaultLo: 1, defaultHi: 3, format: (v) => SIZE_LABELS[Math.round(v)] },
];

export function CandidatesPage() {
  const matrix = useCandidateMatrix(true);
  const candidates = useCandidates();
  const pipeline = usePipeline();
  const { setStage } = useSetStage();

  const [tab, setTab] = useState<DashboardTab>("scored");
  const [az, setAz] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [view, setView] = useState<"dashboard" | "compare">("dashboard");
  const [prefOpen, setPrefOpen] = useState(false);
  const [factorOpen, setFactorOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filter, setFilter] = useState<CandidateFilterState>(EMPTY_FILTER);

  const nameToId = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of candidates.data ?? []) m.set(c.name, c.id);
    return m;
  }, [candidates.data]);

  const flagCountByName = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of candidates.data ?? []) m.set(c.name, c.flagCount);
    return m;
  }, [candidates.data]);

  const summaryByName = useMemo(() => {
    const m = new Map<string, CandidateSummary>();
    for (const c of candidates.data ?? []) m.set(c.name, c);
    return m;
  }, [candidates.data]);

  const scores = useMemo(() => (matrix.data ? computeScores(matrix.data.rows) : new Map<string, number>()), [matrix.data]);

  const filterActive = filter.currency != null || filter.region != null || filter.strategy.length > 0;

  const rows: TableRow[] = useMemo(() => {
    if (!matrix.data || !pipeline.data) return [];
    return matrix.data.rows
      .map((r) => {
        const id = nameToId.get(r.name);
        if (!id) return null;
        const stage: Stage = pipeline.data!.stages[id] ?? "scored";
        return { ...r, id, stage, flagCount: flagCountByName.get(r.name) ?? 0 };
      })
      .filter((r): r is TableRow => r !== null)
      .filter((r) => (az ? r.name.trim().toUpperCase().startsWith(az) : true))
      .filter((r) => {
        if (tab === "scored") return r.stage !== "rejected";
        if (tab === "shortlisted") return r.stage === "shortlisted" || r.stage === "interview";
        return r.stage === "interview";
      })
      .filter((r) => {
        if (!filterActive) return true;
        const summary = summaryByName.get(r.name);
        if (!summary) return false;
        if (filter.currency && summary.currency !== filter.currency) return false;
        if (filter.region && !summary.regions.includes(filter.region)) return false;
        if (filter.strategy.length > 0 && !filter.strategy.includes(summary.strategy)) return false;
        return true;
      });
  }, [matrix.data, pipeline.data, nameToId, flagCountByName, summaryByName, filter, filterActive, az, tab]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const advance = async (id: string) => {
    await setStage(id, "interview");
    pipeline.refresh();
  };
  const reject = async (id: string) => {
    await setStage(id, "rejected");
    pipeline.refresh();
  };

  if (view === "compare") {
    return <CompareDrawer ids={Array.from(selected)} onBack={() => setView("dashboard")} />;
  }

  return (
    <div className="container cf-wrap">
      <Breadcrumbs items={[{ label: "Home", href: CONVERSATION_URL }, { label: "Candidates & Funds" }]} />

      <div className="dash-head">
        <div className="dash-title">
          <h1>Dashboard</h1>
          <span className="dash-sub">Pre-selection</span>
        </div>
        <div className="dash-actions">
          <button
            className={`btn${compareMode ? " primary" : ""}`}
            onClick={() => {
              setCompareMode((v) => !v);
              setSelected(new Set());
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" />
            </svg>
            Compare
          </button>
          <button type="button" className="btn btn-ico" title="Factor preferences" aria-label="Factor preferences" onClick={() => setFactorOpen(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </button>
          <button type="button" className="btn btn-ico" title="Preferences" aria-label="Preferences" onClick={() => setPrefOpen(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
          </button>
          {compareMode && (
            <button className="btn primary" disabled={selected.size < 2} onClick={() => setView("compare")}>
              View comparison ({selected.size})
            </button>
          )}
        </div>
      </div>

      <PipelineTabs pipeline={pipeline.data} active={tab} onChange={setTab} />

      <InsightsPanel tab={tab} />

      <div className="cl-caprow">
        <p className="cl-cap">
          <b>{tab === "scored" ? "Scored" : tab === "shortlisted" ? "Shortlisted" : "Selected for Interview"}</b> ·{" "}
          {rows.length} candidate{rows.length === 1 ? "" : "s"}
        </p>
        <button type="button" className="btn btn-ico" title="Filter" aria-label="Filter" onClick={() => setFilterOpen(true)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
        </button>
      </div>

      {filterActive && (
        <div className="flt-row">
          {filter.currency && (
            <span className="flt-pill">
              <span>Currency : {filter.currency}</span>
              <button className="flt-x" aria-label="Remove currency filter" onClick={() => setFilter((f) => ({ ...f, currency: null }))}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </span>
          )}
          {filter.region && (
            <span className="flt-pill">
              <span>Region : {filter.region}</span>
              <button className="flt-x" aria-label="Remove region filter" onClick={() => setFilter((f) => ({ ...f, region: null }))}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </span>
          )}
          {filter.strategy.length > 0 && (
            <span className="flt-pill">
              <span>Strategy : {filter.strategy.join(", ")}</span>
              <button className="flt-x" aria-label="Remove strategy filter" onClick={() => setFilter((f) => ({ ...f, strategy: [] }))}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </span>
          )}
        </div>
      )}

      {tab === "scored" && <AzFilterStrip active={az} onChange={setAz} />}

      {(matrix.loading || pipeline.loading || candidates.loading) && <LoadingState label="Loading candidates…" />}
      {(matrix.error || pipeline.error || candidates.error) && (
        <ErrorState message={matrix.error ?? pipeline.error ?? candidates.error ?? "Failed to load"} />
      )}

      {!matrix.loading && !pipeline.loading && !candidates.loading && (
        <CandidateTable
          rows={rows}
          scores={scores}
          compareMode={compareMode}
          selected={selected}
          onToggleSelect={toggleSelect}
          onAdvance={advance}
          onReject={reject}
        />
      )}

      <PreferenceDialog
        open={prefOpen}
        onClose={() => setPrefOpen(false)}
        title="Default preferences"
        description="Set target ranges to pre-filter and rank the scored pool. Applied to new sessions."
        metrics={PREFERENCE_METRICS}
        notesPlaceholder={"e.g. Prioritise managers with consistent alpha across regimes.\nDown-weight funds with high turnover or crowded positioning."}
      />
      <PreferenceDialog
        open={factorOpen}
        onClose={() => setFactorOpen(false)}
        title="Factor preferences"
        description="Set factor screens used to pre-rank the scored pool, based on the five core investment factors. Applied to new sessions."
        metrics={FACTOR_METRICS}
        notesPlaceholder={"e.g. Blend Value and Quality for core sleeves.\nCap the Momentum sleeve at 20% of book during high-vol regimes."}
      />
      <CandidateFilterDialog
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        candidates={candidates.data ?? []}
        value={filter}
        onApply={setFilter}
      />
    </div>
  );
}
