import { useMemo, useState } from "react";
import { peerFundKeys, useCandidate, useCandidatePeers, usePeerGroups, useRenderer } from "../api/hooks";
import { RENDERERS_FUND_ID } from "../api/client";
import { firstSection } from "../api/sections";
import type { RunParams } from "../api/types";
import { LoadingState } from "../components/common/LoadingState";
import { ErrorState } from "../components/common/ErrorState";
import { Breadcrumbs } from "../components/layout/Breadcrumbs";
import { CONVERSATION_URL } from "../lib/env";
import { PortfolioAnalysisSection } from "../components/detail/PortfolioAnalysisSection";
import { RiskResearchSection } from "../components/detail/RiskResearchSection";
import { SnapshotView } from "../components/peerfit/SnapshotView";
import { PeerTableView } from "../components/peerfit/PeerTableView";
import { CorrelationsView, type CorrRow } from "../components/peerfit/CorrelationsView";
import { MatrixView } from "../components/peerfit/MatrixView";
import { SimulatorView } from "../components/peerfit/SimulatorView";
import { ConfigureComparisonModal, type ConfigTab } from "../components/peerfit/ConfigureComparisonModal";
import { WindowModal, type AnalysisWindow } from "../components/peerfit/WindowModal";
import { CANDIDATE_FILTER_STORAGE_KEY } from "../components/dashboard/CandidateFilterDialog";
import { PoolDetailModal } from "../components/peerfit/PoolDetailModal";

interface Props {
  id: string;
}

type TopTab = "portfolio" | "risk" | "peerfit";
type SubTab = "snapshot" | "peers" | "correlations" | "matrix" | "simulator";
type ModalName = null | "config" | "window" | "pool";

const TOP_TABS: { key: TopTab; label: string; icon: JSX.Element }[] = [
  {
    key: "portfolio",
    label: "Portfolio analysis",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <circle cx="9" cy="14" r="1.7" />
        <circle cx="13.5" cy="9.5" r="1.7" />
        <circle cx="18" cy="6" r="1.7" />
      </svg>
    ),
  },
  {
    key: "risk",
    label: "Risk research",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 14l3.5-3.5" />
        <path d="M20.5 15.5a8.5 8.5 0 1 0-17 0" />
      </svg>
    ),
  },
  {
    key: "peerfit",
    label: "Peer fit & Simulation",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z" />
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      </svg>
    ),
  },
];

const TABS: { key: SubTab; label: string }[] = [
  { key: "snapshot", label: "Snapshot" },
  { key: "peers", label: "Peer table" },
  { key: "correlations", label: "Correlations" },
  { key: "matrix", label: "Matrix" },
  { key: "simulator", label: "Simulator" },
];

const DEFAULT_WINDOW: AnalysisWindow = { from: "2022-11", to: "2025-11" };
const DEFAULT_BENCHMARK = "S&P 500 TR Index";

/** Benchmark default — the Index filter picked on the candidate dashboard
 *  (persisted per browser-tab session under CANDIDATE_FILTER_STORAGE_KEY),
 *  falling back to the S&P 500 TR default when none is set. "S&P 500" maps
 *  onto the total-return series name the renderers service defaults to. */
function dashboardBenchmark(): string {
  try {
    const raw = sessionStorage.getItem(CANDIDATE_FILTER_STORAGE_KEY);
    const index = raw ? (JSON.parse(raw) as { index?: string | null }).index : null;
    if (!index) return DEFAULT_BENCHMARK;
    return index === "S&P 500" ? DEFAULT_BENCHMARK : index;
  } catch {
    return DEFAULT_BENCHMARK;
  }
}
const DEFAULT_RISK_FREE = "SP T-Bill 0-3M Index TR";
const DEFAULT_PEER_GROUP = "China Onshore Quant MN";

/** Fund key sent to the renderers service — dynamic per selected candidate,
 *  from the candidate record (the candidate list data). Precedence: an
 *  explicit service key stamped on the record
 *  (`subject_fund.analytics_fund_id`), else the record's own
 *  `subject_fund.fund_id`; the configured fund (VITE_RENDERERS_FUND_ID) is a
 *  last resort for records with no fund id at all. */
function rendererFundIdFor(sf: Record<string, unknown>): string {
  if (typeof sf.analytics_fund_id === "string" && sf.analytics_fund_id) return sf.analytics_fund_id;
  if (typeof sf.fund_id === "string" && sf.fund_id) return sf.fund_id;
  return RENDERERS_FUND_ID;
}

function fmtWindow(w: AnalysisWindow): string {
  const [fy, fm] = w.from.split("-");
  const [ty, tm] = w.to.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[Number(fm) - 1]}-${fy.slice(2)} – ${months[Number(tm) - 1]}-${ty.slice(2)}`;
}

/** "2022-11" → "2022-11-30" — the renderers service anchors window bounds on
 *  month-end dates (monthly return series are dated at month end). */
function monthEnd(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
}

export function PeerFitPage({ id }: Props) {
  const { data: rec, loading, error } = useCandidate(id);
  const [topTab, setTopTab] = useState<TopTab>("peerfit");
  const [tab, setTab] = useState<SubTab>("snapshot");
  const [openModal, setOpenModal] = useState<ModalName>(null);
  const [configTab, setConfigTab] = useState<ConfigTab>("groups");
  const openConfig = (initial: ConfigTab = "groups") => {
    setConfigTab(initial);
    setOpenModal("config");
  };

  const [win, setWin] = useState<AnalysisWindow>(DEFAULT_WINDOW);
  // Resolved once per mount — what the benchmark chip resets back to.
  const defaultBenchmark = useMemo(dashboardBenchmark, []);
  const [benchmark, setBenchmark] = useState(defaultBenchmark);
  const [riskFree, setRiskFree] = useState(DEFAULT_RISK_FREE);
  // No peer-group filter by default (null) — the renderers service then uses
  // its default established universe. A chip appears once a group is picked
  // in the configure dialog; its × clears back to the unfiltered default.
  const [peerGroup, setPeerGroup] = useState<string | null>(null);
  const [selectedPeerKeys, setSelectedPeerKeys] = useState<Set<string>>(new Set());

  const { data: peerRoster } = useCandidatePeers();
  const params: RunParams = useMemo(
    () => ({
      benchmark,
      risk_free: riskFree,
      window_start: monthEnd(win.from),
      window_end: monthEnd(win.to),
      datasets: ["lh_internal", "bloomberg"],
      ...(peerGroup ? { peer_group: peerGroup } : {}),
      ...(selectedPeerKeys.size ? { candidate_peer_set: peerFundKeys(selectedPeerKeys, peerRoster) } : {}),
    }),
    [benchmark, riskFree, win, peerGroup, selectedPeerKeys, peerRoster],
  );

  // Fetched at page level (not inside CorrelationsView) so the Correlations
  // subtab badge shows its pair count without a duplicate request. Skipped
  // (null) until the candidate record resolves the renderer fund key.
  const fundId = rec ? rendererFundIdFor(firstSection(rec, "subject_fund")) : null;
  const corr = useRenderer<CorrRow>("D1-7", fundId, params);
  const { data: peerGroups } = usePeerGroups();

  if (loading) return <div className="container"><LoadingState label="Loading candidate…" /></div>;
  if (error || !rec) return <div className="container"><ErrorState message={error ?? "Candidate not found"} /></div>;

  // Subject identity for the config modal's Candidate-peers tab — manager ·
  // cand id · fund id, mirroring the peer rows' meta line.
  const mgr = firstSection(rec, "manager");
  const sf = firstSection(rec, "subject_fund");
  const subject = {
    fund: (typeof sf.fund_name === "string" && sf.fund_name) || rec.name,
    manager: typeof mgr.pm_name === "string" ? mgr.pm_name : null,
    candId: rec.pm_id ?? rec.id ?? null,
    fundId: typeof sf.fund_id === "string" ? sf.fund_id : null,
  };
  // Non-null now that `rec` is guarded — the id every renderer call uses.
  const rendererId = rendererFundIdFor(sf);

  const resetAll = () => {
    setWin(DEFAULT_WINDOW);
    setBenchmark(defaultBenchmark);
    setRiskFree(DEFAULT_RISK_FREE);
    setPeerGroup(null);
    setSelectedPeerKeys(new Set());
  };

  return (
    <div className="container cf-wrap">
      <Breadcrumbs
        items={[
          { label: "Home", href: CONVERSATION_URL },
          { label: "Candidates & Funds", href: "#/" },
          { label: rec.name, href: `#/candidates/${id}` },
          { label: "Candidate Analytics" },
        ]}
      />
      <div className="pf-head">
        <div className="pf-title">
          <h1>Candidate Analytics</h1>
          <span className="pf-sub">from {rec.name}</span>
        </div>
      </div>

      <div className="top-tabs">
        {TOP_TABS.map((t) => (
          <button key={t.key} type="button" className={`top-tab${topTab === t.key ? " active" : ""}`} onClick={() => setTopTab(t.key)}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {topTab === "portfolio" && <PortfolioAnalysisSection id={rendererId} />}
      {topTab === "risk" && <RiskResearchSection id={rendererId} />}
      {topTab === "peerfit" && (
        <>
          <div className="fchips">
            <button className="fchip" onClick={() => openConfig("groups")} title="Click to change benchmark">
              Benchmark : <span>{benchmark}</span>
              <span
                className="fchip-x"
                onClick={(e) => {
                  e.stopPropagation();
                  setBenchmark(defaultBenchmark);
                }}
                title="Remove"
                aria-label="Remove benchmark filter"
              >
                ×
              </span>
            </button>
            {peerGroup != null && (
              <button className="fchip" onClick={() => openConfig("groups")} title="Established peer universe — click to configure">
                Peer Universe : <span>{peerGroup}</span>
                <span
                  className="fchip-x"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPeerGroup(null);
                  }}
                  title="Remove"
                  aria-label="Remove peer universe filter"
                >
                  ×
                </span>
              </button>
            )}
            {selectedPeerKeys.size > 0 && (
              <button className="fchip" onClick={() => openConfig("candidates")} title="Candidate peers — click to configure">
                Candidate peers : <span className="pg-card-cnt">{selectedPeerKeys.size}</span>
                <span
                  className="fchip-x"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPeerKeys(new Set());
                  }}
                  title="Remove"
                  aria-label="Remove candidate peers filter"
                >
                  ×
                </span>
              </button>
            )}
            {riskFree !== DEFAULT_RISK_FREE && (
              <button className="fchip" onClick={() => openConfig("groups")} title="Click to change risk-free rate">
                Risk-free : <span>{riskFree}</span>
                <span
                  className="fchip-x"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRiskFree(DEFAULT_RISK_FREE);
                  }}
                  title="Remove"
                  aria-label="Remove risk-free filter"
                >
                  ×
                </span>
              </button>
            )}
            <button className="fchips-reset" onClick={resetAll}>
              Reset
            </button>
            <div className="fchips-actions">
              <button className="btn" onClick={() => setOpenModal("window")} title="Analysis window">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {fmtWindow(win)}
              </button>
              <button className="btn btn-ico" onClick={() => openConfig("groups")} title="Benchmark & risk-free" aria-label="Benchmark & risk-free">
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
            </div>
          </div>

          <div className="pl-subtabs">
            {TABS.map((t) => {
              const peerGroupCount = peerGroup ? peerGroups?.find((g) => g.name === peerGroup)?.count : undefined;
              const badge: number | undefined =
                t.key === "peers"
                  ? peerGroupCount != null
                    ? peerGroupCount + selectedPeerKeys.size
                    : undefined
                  : t.key === "correlations" && corr.data
                    ? corr.data.rows.length + selectedPeerKeys.size
                    : undefined;
              return (
                <button
                  key={t.key}
                  type="button"
                  className={`pl-subtab${tab === t.key ? " active" : ""}`}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                  {badge != null && <span className="pl-num">{badge}</span>}
                </button>
              );
            })}
          </div>

          {tab === "snapshot" && (
            <SnapshotView id={rendererId} candidateName={rec.name} params={params} selectedPeerKeys={selectedPeerKeys} onAddPeers={() => openConfig("candidates")} />
          )}
          {tab === "peers" && <PeerTableView id={rendererId} candidateName={rec.name} params={params} onOpenCandidates={() => openConfig("candidates")} />}
          {tab === "correlations" && (
            <CorrelationsView id={rendererId} candidateName={rec.name} params={params} corr={corr} onOpenCandidates={() => openConfig("candidates")} />
          )}
          {tab === "matrix" && <MatrixView id={rendererId} candidateName={rec.name} params={params} onOpenCandidates={() => openConfig("candidates")} />}
          {tab === "simulator" && (
            <SimulatorView id={rendererId} candidateName={rec.name} params={params} selectedPeerKeys={selectedPeerKeys} onOpenPoolDetail={() => setOpenModal("pool")} />
          )}

          <p className="pf-footnote">
            Methodology · Correlations computed from monthly returns over the configured window. Beta and Jensen's alpha
            regressed against the selected benchmark with risk-free = SP T-Bill 0–3M TR. Peer universe configurable via
            the "Configure" dialog (Names sheet · 3,642 funds · 79 pre-built groups). Candidate peers are other
            prospective candidates (by candidate id · fund id), merged into every panel and tagged in teal; statistics
            report both the established-peer set and the combined cohort. ENS = 1 / Σ wᵢ². Penalty triggered if max PM
            correlation ≥ 0.60.
          </p>
        </>
      )}

      <ConfigureComparisonModal
        open={openModal === "config"}
        onClose={() => setOpenModal(null)}
        peerGroupName={peerGroup ?? DEFAULT_PEER_GROUP}
        selectedPeerKeys={selectedPeerKeys}
        subject={subject}
        initialTab={configTab}
        onApply={(group, peers) => {
          setPeerGroup(group);
          setSelectedPeerKeys(peers);
        }}
      />
      <WindowModal open={openModal === "window"} onClose={() => setOpenModal(null)} value={win} onApply={setWin} />
      <PoolDetailModal open={openModal === "pool"} onClose={() => setOpenModal(null)} id={rendererId} params={params} />
    </div>
  );
}
