import { useEffect, useState } from "react";

export interface NavSection {
  id: string;
  label: string;
}

interface Props {
  sections: NavSection[];
  /** Extra sections tucked behind a collapsible "More" toggle at the bottom
   *  of the nav — matches the design reference, which visually renders one
   *  continuous list with only the tail group collapsible. */
  moreSections?: NavSection[];
}

function NavButton({ s, active, onClick }: { s: NavSection; active: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`nav-item${active ? " active" : ""}`} onClick={onClick}>
      {s.label}
    </button>
  );
}

/** Scrollspy sidebar nav. Uses scrollIntoView + IntersectionObserver rather
 *  than `href="#id"` anchors, since the app's own client-side router already
 *  owns `location.hash` for page routes (`#/candidates/:id`). */
export function SidebarNav({ sections, moreSections = [] }: Props) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const [moreOpen, setMoreOpen] = useState(false);
  const allSections = [...sections, ...moreSections];

  useEffect(() => {
    const els = allSections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (!els.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-140px 0px -65% 0px", threshold: 0 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, moreSections]);

  // Auto-expand "More" if scrollspy lands on one of its sections (e.g. the
  // user scrolls past it without clicking the toggle first).
  useEffect(() => {
    if (moreSections.some((s) => s.id === active)) setMoreOpen(true);
  }, [active, moreSections]);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <aside className="sidebar">
      <nav>
        {sections.map((s) => (
          <NavButton key={s.id} s={s} active={active === s.id} onClick={() => scrollTo(s.id)} />
        ))}
        {moreSections.length > 0 && (
          <div className={`nav-more${moreOpen ? "" : " collapsed"}`}>
            <button type="button" className="nav-group-toggle" onClick={() => setMoreOpen((v) => !v)}>
              <span>More</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <div className="nav-more-items">
              {moreSections.map((s) => (
                <NavButton key={s.id} s={s} active={active === s.id} onClick={() => scrollTo(s.id)} />
              ))}
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}
