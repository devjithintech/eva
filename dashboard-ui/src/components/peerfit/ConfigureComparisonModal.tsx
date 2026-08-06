import { useEffect, useState } from "react";
import { useCandidatePeers, usePeerGroups, usePeerSets } from "../../api/hooks";
import type { CandPeer } from "../../api/types";

export type ConfigTab = "groups" | "custom" | "candidates" | "recent";

/** Subject identity shown pinned at the top of the Candidate peers tab —
 *  mirrors the peer rows' "manager · cand id · fund id" meta line. */
export interface SubjectInfo {
  fund: string;
  manager: string | null;
  candId: string | null;
  fundId: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  peerGroupName: string;
  selectedPeerKeys: Set<string>;
  subject: SubjectInfo;
  onApply: (peerGroupName: string, selectedPeerKeys: Set<string>) => void;
  /** Which tab to land on when the modal opens — e.g. the "Candidates…" link
   *  in PeerTableView and the cohort's "+ Add candidate peers" button both
   *  jump straight to the candidates tab, matching the reference's
   *  `openModal('candpeers')` calls. Defaults to "groups". */
  initialTab?: ConfigTab;
}

/** Reference-mock universe figures ("Names sheet · 3,642 funds · 79 pre-built
 *  groups") — same constants the page footnote cites. */
const UNIVERSE_FUNDS = "3,642";
const UNIVERSE_GROUPS = 79;

/** Fund id shown for a candidate peer, e.g. "C-2026-021::aris" — candidate id
 *  plus the fund's leading word, matching the D1 candidate-port convention. */
const peerFundId = (c: CandPeer) => `${c.id}::${c.fund.split(" ")[0].toLowerCase()}`;

/** "Configure comparison set" modal — tabs for pre-built peer groups (fetched
 *  from `GET /peer_groups`), custom sets from the Names sheet, candidate peers
 *  (`GET /peer_candidates`, toggled into `candidate_peer_set`), and
 *  recent/saved sets (`GET /peer_sets`). Draft state commits only on Apply,
 *  matching CandidateFilterDialog's convention. */
export function ConfigureComparisonModal({ open, onClose, peerGroupName, selectedPeerKeys, subject, onApply, initialTab = "groups" }: Props) {
  const [tab, setTab] = useState<ConfigTab>(initialTab);
  const [draftGroup, setDraftGroup] = useState(peerGroupName);
  const [draftPeers, setDraftPeers] = useState<Set<string>>(selectedPeerKeys);
  const [query, setQuery] = useState("");
  const [customNames, setCustomNames] = useState("");

  const peerGroups = usePeerGroups();
  const candidatePeers = useCandidatePeers();
  const peerSets = usePeerSets();

  useEffect(() => {
    if (open) {
      setDraftGroup(peerGroupName);
      setDraftPeers(selectedPeerKeys);
      setTab(initialTab);
      setQuery("");
    }
  }, [open, peerGroupName, selectedPeerKeys, initialTab]);

  if (!open) return null;

  const groups = peerGroups.data ?? [];
  const candPeers = candidatePeers.data ?? [];
  const savedSets = peerSets.data ?? [];
  const recentGroups = groups.slice(0, 2);
  const queueCount = candPeers.length + 1; // + subject

  const q = query.trim().toLowerCase();
  const visiblePeers = q
    ? candPeers.filter((c) =>
        [c.fund, c.cand, c.id, c.short, peerFundId(c)].some((f) => f.toLowerCase().includes(q)),
      )
    : candPeers;
  const subjectVisible =
    !q || [subject.fund, subject.manager ?? "", subject.candId ?? "", subject.fundId ?? ""].some((f) => f.toLowerCase().includes(q));

  const draftGroupCount =
    groups.find((g) => g.name === draftGroup)?.count ?? savedSets.find((s) => s.name === draftGroup)?.members.length ?? null;

  const subjectMeta =
    [subject.manager, subject.candId ? `cand ${subject.candId}` : null, subject.fundId ? `fund ${subject.fundId}` : null]
      .filter(Boolean)
      .join(" · ") || "Always included";

  const customCount = customNames.split("\n").map((l) => l.trim()).filter(Boolean).length;

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
      <div className="modal wide" role="dialog" aria-modal="true" aria-label="Configure comparison set">
        <div className="modal-head">
          <div className="modal-title">
            Configure comparison set
            <small>{UNIVERSE_FUNDS} funds · {UNIVERSE_GROUPS} groups · {queueCount} candidates in queue</small>
          </div>
          <button className="modal-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-tabs">
          <button type="button" className={`modal-tab${tab === "groups" ? " active" : ""}`} onClick={() => setTab("groups")}>
            Pre-built groups (PeerDefs)
          </button>
          <button type="button" className={`modal-tab${tab === "custom" ? " active" : ""}`} onClick={() => setTab("custom")}>
            Custom from Names
          </button>
          <button type="button" className={`modal-tab${tab === "candidates" ? " active" : ""}`} onClick={() => setTab("candidates")}>
            Candidate peers (D1)
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

          {tab === "custom" && (
            <div className="modal-content" style={{ padding: "16px 20px" }}>
              <div className="pl-sh">Build a custom set from the Names sheet</div>
              <textarea
                className="custom-names-ta"
                placeholder={"Paste fund names — one per line…"}
                value={customNames}
                onChange={(e) => setCustomNames(e.target.value)}
                rows={9}
              />
              <div className="win-note" style={{ marginTop: 12 }}>
                <strong>{customCount}</strong> name{customCount === 1 ? "" : "s"} entered. Custom sets resolve by exact
                name against the Names sheet ({UNIVERSE_FUNDS} funds) on Apply — unmatched rows are ignored. Saved sets
                appear under Recent &amp; saved.
              </div>
            </div>
          )}

          {tab === "candidates" && (
            <div className="modal-content">
              <div className="cand-search">
                <input
                  type="search"
                  placeholder="Search prospective candidates by name, fund, or candidate id…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search prospective candidates"
                />
                <span className="cand-search-count">{queueCount} in evaluation queue</span>
              </div>
              <div className="cand-list">
                {subjectVisible && (
                  <div className="cand-pick subject">
                    <div>
                      <div className="cp-name">
                        {subject.fund} <span className="ctag" style={{ background: "var(--primary)" }}>SUBJECT</span>
                      </div>
                      <div className="cp-meta">{subjectMeta}</div>
                    </div>
                    <span className="cp-dot" aria-hidden="true" />
                  </div>
                )}
                {visiblePeers.map((c) => {
                  const on = draftPeers.has(c.key);
                  return (
                    <div key={c.key} className={`cand-pick${on ? " on" : ""}`} onClick={() => toggleCand(c.key)}>
                      <div>
                        <div className="cp-name">{c.fund}</div>
                        <div className="cp-meta">
                          {c.cand} · cand {c.id} · fund {peerFundId(c)} · Sharpe {(c.ret / c.vol).toFixed(2)} · max corr {c.corr.toFixed(2)}
                        </div>
                      </div>
                      <span className={`cp-check${on ? " on" : ""}`} role="checkbox" aria-checked={on} aria-label={`Include ${c.fund}`} />
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: "14px 18px", fontSize: 12.5, color: "var(--muted)", borderTop: "1px solid var(--line)", lineHeight: 1.55 }}>
                Candidate peers are added by candidate id + fund id — the same inputs as the main pipeline. Their
                returns are pulled from the D1 candidate port and merged into every Peer-fit panel (tagged in teal).
                Statistics report both the established-peer set and the combined cohort.
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
            Active selection: <strong>{draftGroup}</strong>
            {draftGroupCount != null && <> · <b>{draftGroupCount}</b> funds</>} · <b>{draftPeers.size}</b> candidate peer{draftPeers.size === 1 ? "" : "s"}
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
