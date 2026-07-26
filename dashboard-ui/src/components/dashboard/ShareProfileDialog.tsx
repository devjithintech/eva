import { useEffect, useState } from "react";

interface Person {
  name: string;
  email: string;
  team: string;
  palette: "p" | "g" | "a";
}

const PEOPLE: Person[] = [
  { name: "Olivia Martin", email: "olivia@lh.com", team: "Hiring Team", palette: "p" },
  { name: "Isabella Nguyen", email: "isabella.nguyen@lh.com", team: "EU Team", palette: "g" },
  { name: "Emma Wilson", email: "emma@example.com", team: "Hiring Team", palette: "a" },
  { name: "Jackson Lee", email: "lee@example.com", team: "Global Team", palette: "p" },
  { name: "William Kim", email: "will@email.com", team: "EU Team", palette: "p" },
  { name: "Noah Patel", email: "noah@lh.com", team: "Global Team", palette: "g" },
  { name: "Sofia Berg", email: "sofia@lh.com", team: "EU Team", palette: "a" },
];
const PALETTE: Record<Person["palette"], [string, string]> = {
  p: ["#ecebfd", "#6c5cf0"],
  g: ["#eef0f3", "#5b6470"],
  a: ["#fdf3dc", "#b7791f"],
};
const TABS = ["All", "Hiring Team", "EU Team", "Global Team"] as const;

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface Props {
  open: boolean;
  onClose: () => void;
  candidateName: string;
}

/** Share-profile dialog — the "people to share with" directory is
 *  illustrative (this app has no real user/org directory), matching the
 *  design reference's own static PEOPLE list. Share just closes the
 *  dialog, same as the reference — nothing is actually sent anywhere. */
export function ShareProfileDialog({ open, onClose, candidateName }: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set([0, 1, 2]));

  useEffect(() => {
    if (open) {
      setTab("All");
      setQuery("");
      setSelected(new Set([0, 1, 2]));
    }
  }, [open]);

  if (!open) return null;

  const filtered = PEOPLE.map((p, i) => ({ p, i }))
    .filter(({ p }) => tab === "All" || p.team === tab)
    .filter(({ p }) => !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.email.toLowerCase().includes(query.toLowerCase()));

  const toggle = (i: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const selectedPeople = [...selected].map((i) => PEOPLE[i]);

  return (
    <div
      className="pref-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pref-dialog" role="dialog" aria-modal="true" aria-label="Share Candidate">
        <div className="pref-head">
          <div>
            <div className="pref-title">Share Candidate</div>
            <div className="pref-desc">Share {candidateName}'s profile and notes with people in your organization</div>
          </div>
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
          <div className="sh-search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" placeholder="Search people..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="sh-list">
            {filtered.length === 0 && <div className="sh-empty">No people match your search.</div>}
            {filtered.map(({ p, i }) => {
              const [bg, fg] = PALETTE[p.palette];
              const on = selected.has(i);
              return (
                <div key={p.email} className={`sh-row${on ? " on" : ""}`} onClick={() => toggle(i)}>
                  <span className="cfd-check" style={on ? { background: "var(--primary)", borderColor: "var(--primary)" } : undefined}>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ opacity: on ? 1 : 0 }}
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className="sh-av" style={{ background: bg, color: fg }}>
                    {initials(p.name)}
                  </span>
                  <div>
                    <div className="sh-nm">{p.name}</div>
                    <div className="sh-em">{p.email}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="pref-foot sh-foot">
          <div className="sh-sel">
            <div className="sh-avs">
              {selectedPeople.slice(0, 4).map((p) => {
                const [bg, fg] = PALETTE[p.palette];
                return (
                  <span key={p.email} className="sh-av" style={{ background: bg, color: fg }}>
                    {initials(p.name)}
                  </span>
                );
              })}
            </div>
            <span>Selected ({selected.size})</span>
          </div>
          <button className="btn pref-save" type="button" disabled={selected.size === 0} onClick={onClose}>
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
