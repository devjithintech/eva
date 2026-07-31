import { useEffect, useRef, useState } from "react";

interface Workspace {
  key: string;
  title: string;
  subtitle: string;
  color: string;
  /** Real route in this app, or null for a workspace that isn't built here yet. */
  href: string | null;
}

const WORKSPACES: Workspace[] = [
  { key: "eva", title: "EVA Evaluation Assistant", subtitle: "she is very smart", color: "#f7bd2e", href: "#/candidates" },
  { key: "pm-analysis", title: "PM Analysis", subtitle: "Monitor and review PM portfolio daily", color: "#bb5fe0", href: null },
  { key: "portfolio-risk-a", title: "Portfolio Risk", subtitle: "Analyzes common risk factors and Alpha", color: "#5b8def", href: null },
  { key: "portfolio-risk-b", title: "Portfolio Risk", subtitle: "Analyzes common risk factors and Alpha", color: "#86b07f", href: null },
];

const ACTIVE_KEY = "eva";

/** Workspace-switcher grid button + popover in the top bar's brand area —
 *  ported from the design reference's `.ws-switcher`/`.ws-pop` (candidates.html
 *  et al). Only EVA is a real route in this app; the other three are other
 *  LightHouse workspaces not built here, so they close the popover instead of
 *  silently bouncing back to the candidates dashboard. */
export function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="ws-switcher" ref={rootRef}>
      <button
        type="button"
        className={`grid-btn${open ? " open" : ""}`}
        aria-label="Switch workspace"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="grid-ico">
          <i />
          <i />
          <i />
          <i />
        </span>
      </button>
      <div className={`ws-pop${open ? " open" : ""}`}>
        <div className="ws-pop-title">My Workspace</div>
        {WORKSPACES.map((w) => (
          <a
            key={w.key}
            className={`ws-item${w.key === ACTIVE_KEY ? " active" : ""}`}
            href={w.href ?? "#"}
            onClick={(e) => {
              if (!w.href) e.preventDefault();
              setOpen(false);
            }}
          >
            <span className="ws-ico" style={{ background: w.color }} />
            <span className="ws-text">
              <span className="ws-tt">{w.title}</span>
              <span className="ws-sub">{w.subtitle}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
