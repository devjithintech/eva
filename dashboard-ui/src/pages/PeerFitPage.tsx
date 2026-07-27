import { useMemo, useState } from "react";
import { useCandidate } from "../api/hooks";
import type { RunParams } from "../api/types";
import { LoadingState } from "../components/common/LoadingState";
import { ErrorState } from "../components/common/ErrorState";
import { Breadcrumbs } from "../components/layout/Breadcrumbs";
import { CONVERSATION_URL } from "../lib/env";
import { SnapshotView } from "../components/peerfit/SnapshotView";
import { PeerTableView } from "../components/peerfit/PeerTableView";
import { CorrelationsView } from "../components/peerfit/CorrelationsView";
import { MatrixView } from "../components/peerfit/MatrixView";
import { SimulatorView } from "../components/peerfit/SimulatorView";
import { ConfigureComparisonModal, type ConfigTab } from "../components/peerfit/ConfigureComparisonModal";
import { WindowModal, type AnalysisWindow } from "../components/peerfit/WindowModal";
import { PoolDetailModal } from "../components/peerfit/PoolDetailModal";

interface Props {
  id: string;
}

type SubTab = "snapshot" | "peers" | "correlations" | "matrix" | "simulator";
type ModalName = null | "config" | "window" | "pool";

const TABS: { key: SubTab; label: string }[] = [
  { key: "snapshot", label: "Snapshot" },
  { key: "peers", label: "Peer table" },
  { key: "correlations", label: "Correlations" },
  { key: "matrix", label: "Matrix" },
  { key: "simulator", label: "Simulator" },
];

const DEFAULT_WINDOW: AnalysisWindow = { from: "2022-11", to: "2025-11" };
const DEFAULT_BENCHMARK = "S&P 500 TR";
const DEFAULT_RISK_FREE = "SP TBill 0-3M";
const DEFAULT_PEER_GROUP = "China Onshore Quant MN";

function fmtWindow(w: AnalysisWindow): string {
  const [fy, fm] = w.from.split("-");
  const [ty, tm] = w.to.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[Number(fm) - 1]}-${fy.slice(2)} – ${months[Number(tm) - 1]}-${ty.slice(2)}`;
}

export function PeerFitPage({ id }: Props) {
  const { data: rec, loading, error } = useCandidate(id);
  const [tab, setTab] = useState<SubTab>("snapshot");
  const [openModal, setOpenModal] = useState<ModalName>(null);
  const [configTab, setConfigTab] = useState<ConfigTab>("groups");
  const openConfig = (initial: ConfigTab = "groups") => {
    setConfigTab(initial);
    setOpenModal("config");
  };

  const [win, setWin] = useState<AnalysisWindow>(DEFAULT_WINDOW);
  const [benchmark, setBenchmark] = useState(DEFAULT_BENCHMARK);
  const [riskFree, setRiskFree] = useState(DEFAULT_RISK_FREE);
  const [peerGroup, setPeerGroup] = useState(DEFAULT_PEER_GROUP);
  const [peerUniverseOn, setPeerUniverseOn] = useState(true);
  const [selectedPeerKeys, setSelectedPeerKeys] = useState<Set<string>>(new Set());

  const params: RunParams = useMemo(
    () => ({
      benchmark,
      risk_free: riskFree,
      window_start: `${win.from}-01`,
      window_end: `${win.to}-01`,
      ...(peerUniverseOn ? { peer_group: peerGroup } : { include_peer_universe: false }),
      ...(selectedPeerKeys.size ? { candidate_peer_set: Array.from(selectedPeerKeys) } : {}),
    }),
    [benchmark, riskFree, win, peerUniverseOn, peerGroup, selectedPeerKeys],
  );

  if (loading) return <div className="container"><LoadingState label="Loading candidate…" /></div>;
  if (error || !rec) return <div className="container"><ErrorState message={error ?? "Candidate not found"} /></div>;

  const resetAll = () => {
    setWin(DEFAULT_WINDOW);
    setBenchmark(DEFAULT_BENCHMARK);
    setRiskFree(DEFAULT_RISK_FREE);
    setPeerGroup(DEFAULT_PEER_GROUP);
    setPeerUniverseOn(true);
    setSelectedPeerKeys(new Set());
  };

  return (
    <div className="container">
      <Breadcrumbs
        items={[
          { label: "Home", href: CONVERSATION_URL },
          { label: "Candidates & Funds", href: "#/" },
          { label: rec.name, href: `#/candidates/${id}` },
          { label: "Peer fit & Sim" },
        ]}
      />
      <div className="pf-head">
        <div className="pf-title">
          <h1>Peer fit &amp; Simulator</h1>
          <span className="pf-sub">{rec.name}</span>
        </div>
        <div className="hero-actions">
          <button className="btn" onClick={() => setOpenModal("window")} title="Analysis window">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {fmtWindow(win)}
          </button>
          <button className="btn btn-ico" onClick={() => openConfig("groups")} title="Benchmark &amp; risk-free" aria-label="Benchmark &amp; risk-free">
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
          <button className="btn btn-ico" onClick={() => openConfig("groups")} title="Configure comparison set" aria-label="Configure comparison set">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
          </button>
        </div>
      </div>

      <div className="fchips">
        <button className="fchip" onClick={() => openConfig("groups")} title="Click to change benchmark">
          Benchmark : <span>{benchmark}</span>
          <span
            className="fchip-x"
            onClick={(e) => {
              e.stopPropagation();
              setBenchmark(DEFAULT_BENCHMARK);
            }}
            title="Remove"
            aria-label="Remove benchmark filter"
          >
            ×
          </span>
        </button>
        {peerUniverseOn && (
          <button className="fchip" onClick={() => openConfig("groups")} title="Established peer universe — click to configure">
            Peer Universe : <span>{peerGroup}</span>
            <span
              className="fchip-x"
              onClick={(e) => {
                e.stopPropagation();
                setPeerUniverseOn(false);
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
        <button className="fchips-reset" onClick={resetAll}>
          Reset
        </button>
      </div>

      <div className="mock-banner">
        <span>⚠️</span>
        <span>
          Figures here are illustrative — <code>data.json</code> has no pairwise peer return series to correlate, so
          this tab's panels are backed by a mock dataset server-side (see <code>server/src/data/peerfit.ts</code>),
          served through the same <code>/api/renderers/:label</code> contract as the rest of the dossier.
        </span>
      </div>

      <div className="pl-subtabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`pl-subtab${tab === t.key ? " active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "snapshot" && (
        <SnapshotView id={id} candidateName={rec.name} params={params} selectedPeerKeys={selectedPeerKeys} onAddPeers={() => openConfig("candidates")} />
      )}
      {tab === "peers" && <PeerTableView id={id} candidateName={rec.name} params={params} onOpenCandidates={() => openConfig("candidates")} />}
      {tab === "correlations" && <CorrelationsView id={id} candidateName={rec.name} params={params} />}
      {tab === "matrix" && <MatrixView id={id} candidateName={rec.name} params={params} />}
      {tab === "simulator" && (
        <SimulatorView id={id} candidateName={rec.name} params={params} selectedPeerKeys={selectedPeerKeys} onOpenPoolDetail={() => setOpenModal("pool")} />
      )}

      <p className="pf-footnote">
        Methodology · Correlations computed from monthly returns over the configured window. Beta and Jensen's alpha
        regressed against the selected benchmark with risk-free = SP T-Bill 0–3M TR. Peer universe configurable via
        the "Configure" dialog (Names sheet · 3,642 funds · 79 pre-built groups). Candidate peers are other
        prospective candidates (by candidate id · fund id), merged into every panel and tagged in teal; statistics
        report both the established-peer set and the combined cohort. ENS = 1 / Σ wᵢ². Penalty triggered if max PM
        correlation ≥ 0.60.
      </p>

      <ConfigureComparisonModal
        open={openModal === "config"}
        onClose={() => setOpenModal(null)}
        peerGroupName={peerGroup}
        selectedPeerKeys={selectedPeerKeys}
        initialTab={configTab}
        onApply={(group, peers) => {
          setPeerGroup(group);
          setPeerUniverseOn(true);
          setSelectedPeerKeys(peers);
        }}
      />
      <WindowModal open={openModal === "window"} onClose={() => setOpenModal(null)} value={win} onApply={setWin} />
      <PoolDetailModal open={openModal === "pool"} onClose={() => setOpenModal(null)} id={id} params={params} />
    </div>
  );
}
