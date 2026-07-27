import { useEffect, useState } from "react";
import { useCandidatePeers, usePeerGroups, usePeerSets } from "../../api/hooks";

export type ConfigTab = "groups" | "candidates" | "recent";

interface Props {
  open: boolean;
  onClose: () => void;
  peerGroupName: string;
  selectedPeerKeys: Set<string>;
  onApply: (peerGroupName: string, selectedPeerKeys: Set<string>) => void;
  /** Which tab to land on when the modal opens — e.g. the "Candidates…" link
   *  in PeerTableView and the cohort's "+ Add candidate peers" button both
   *  jump straight to the candidates tab, matching the reference's
   *  `openModal('candpeers')` calls. Defaults to "groups". */
  initialTab?: ConfigTab;
}

/** "Configure comparison set" modal — tabs for peer groups (fetched from
 *  `GET /peer_groups`), candidate peers (`GET /peer_candidates`, toggled into
 *  `candidate_peer_set`), and recent/saved sets (`GET /peer_sets`). Draft
 *  state commits only on Apply, matching CandidateFilterDialog's convention. */
export function ConfigureComparisonModal({ open, onClose, peerGroupName, selectedPeerKeys, onApply, initialTab = "groups" }: Props) {
  const [tab, setTab] = useState<ConfigTab>(initialTab);
  const [draftGroup, setDraftGroup] = useState(peerGroupName);
  const [draftPeers, setDraftPeers] = useState<Set<string>>(selectedPeerKeys);

  const peerGroups = usePeerGroups();
  const candidatePeers = useCandidatePeers();
  const peerSets = usePeerSets();

  useEffect(() => {
    if (open) {
      setDraftGroup(peerGroupName);
      setDraftPeers(selectedPeerKeys);
      setTab(initialTab);
    }
  }, [open, peerGroupName, selectedPeerKeys, initialTab]);

  if (!open) return null;

  const groups = peerGroups.data ?? [];
  const candPeers = candidatePeers.data ?? [];
  const savedSets = peerSets.data ?? [];
  const recentGroups = groups.slice(0, 2);

  const toggleCand = (key: string) =>
    setDraftPeers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label="Configure comparison set">
        <div className="modal-head">
          <div className="modal-title">
            Configure comparison set
            <small>{groups.length} peer groups · {candPeers.length} candidates in queue</small>
          </div>
          <button className="modal-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-tabs">
          <button type="button" className={`modal-tab${tab === "groups" ? " active" : ""}`} onClick={() => setTab("groups")}>
            Peer groups
          </button>
          <button type="button" className={`modal-tab${tab === "candidates" ? " active" : ""}`} onClick={() => setTab("candidates")}>
            Candidate peers
          </button>
          <button type="button" className={`modal-tab${tab === "recent" ? " active" : ""}`} onClick={() => setTab("recent")}>
            Recent &amp; saved
          </button>
        </div>
        <div className="modal-body">
          {tab === "groups" && (
            <div className="modal-content">
              <div className="pg-list">
                {groups.map((g) => (
                  <div
                    key={g.name}
                    className={`pg-card${g.name === draftGroup ? " selected" : ""}`}
                    onClick={() => setDraftGroup(g.name)}
                  >
                    <div>
                      <div className="pg-card-name">{g.name}</div>
                      <div className="pg-card-meta">{g.count} funds · {g.source}</div>
                    </div>
                    <span className="pg-card-cnt">{g.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "candidates" && (
            <div className="modal-content">
              <div className="cand-list">
                <div className="cand-pick subject">
                  <div>
                    <div className="cp-name">
                      Subject <span className="ctag" style={{ background: "var(--primary)" }}>SUBJECT</span>
                    </div>
                    <div className="cp-meta">Always included</div>
                  </div>
                  <div className="cp-box" style={{ color: "var(--primary)" }}>●</div>
                </div>
                {candPeers.map((c) => {
                  const on = draftPeers.has(c.key);
                  return (
                    <div key={c.key} className={`cand-pick${on ? " on" : ""}`} onClick={() => toggleCand(c.key)}>
                      <div>
                        <div className="cp-name">{c.fund}</div>
                        <div className="cp-meta">
                          {c.cand} · Sharpe {(c.ret / c.vol).toFixed(2)} · max corr {c.corr.toFixed(2)}
                        </div>
                      </div>
                      <div className="cp-box">{on ? "☑" : "☐"}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: "14px 18px", fontSize: 12.5, color: "var(--muted)", borderTop: "1px solid var(--line)", lineHeight: 1.55 }}>
                Candidate peers are other prospective candidates in this evaluation queue. Selecting them adds a
                cohort comparison to the Snapshot tab and includes them in the Simulator, Peer table, and Matrix.
              </div>
            </div>
          )}

          {tab === "recent" && (
            <div className="modal-content" style={{ padding: "16px 20px" }}>
              <div className="pl-sh">Recent peer groups</div>
              <div className="pg-list single">
                {recentGroups.map((g) => (
                  <div key={g.name} className="pg-card" onClick={() => { setDraftGroup(g.name); setTab("groups"); }}>
                    <div>
                      <div className="pg-card-name">{g.name}</div>
                      <div className="pg-card-meta">{g.count} funds · {g.source}</div>
                    </div>
                    <span className="pg-card-cnt">{g.count}</span>
                  </div>
                ))}
              </div>
              <div className="pl-sh" style={{ marginTop: 18 }}>Saved custom sets</div>
              <div className="pg-list single">
                {savedSets.map((s) => (
                  <div key={s.id} className="pg-card" onClick={() => { setDraftGroup(s.name); setTab("groups"); }}>
                    <div>
                      <div className="pg-card-name">{s.name}</div>
                      <div className="pg-card-meta">Custom · {s.members.length} funds</div>
                    </div>
                    <span className="pg-card-cnt">{s.members.length}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="modal-foot">
          <div className="modal-foot-info">
            Active selection: <strong>{draftGroup}</strong> · <strong>{draftPeers.size}</strong> candidate peer{draftPeers.size === 1 ? "" : "s"}
          </div>
          <div className="modal-foot-actions">
            <button className="pl-action-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              className="pl-action-btn primary"
              onClick={() => {
                onApply(draftGroup, draftPeers);
                onClose();
              }}
            >
              Apply &amp; recompute
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
