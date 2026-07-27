import { useEffect, useRef, useState } from "react";

interface Props {
  showShortlist: boolean;
  showInterview: boolean;
  onShortlist: () => void;
  onSelectInterview: () => void;
  onShare: () => void;
  onAddNote: () => void;
  onReject: () => void;
}

/** Per-row "⋮" actions menu — the design reference's own kebab menu (Select
 *  for interview / Share this profile / Add a note / Reject Candidate) has
 *  no way to move a candidate into the intermediate "shortlisted" stage —
 *  only straight to "interview" — so the real 3-stage pipeline
 *  (scored → shortlisted → interview) could never actually populate its
 *  Shortlisted tab. "Add to shortlist" fills that gap; the rest match the
 *  reference exactly. */
export function RowActionsMenu({ showShortlist, showInterview, onShortlist, onSelectInterview, onShare, onAddNote, onReject }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || btnRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.right - 224 });
    }
    setOpen((v) => !v);
  };

  const runAndClose = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <>
      <button type="button" ref={btnRef} className="cl-morebtn" aria-label="More actions" aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>
      {open && pos && (
        <div className="kb-menu" ref={menuRef} role="menu" style={{ top: pos.top, left: pos.left }}>
          {showShortlist && (
            <>
              <button type="button" role="menuitem" className="kb-item" onClick={runAndClose(onShortlist)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                Add to shortlist
              </button>
              <hr className="kb-sep" />
            </>
          )}
          {showInterview && (
            <>
              <button type="button" role="menuitem" className="kb-item" onClick={runAndClose(onSelectInterview)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Select for interview
              </button>
              <hr className="kb-sep" />
            </>
          )}
          <button type="button" role="menuitem" className="kb-item" onClick={runAndClose(onShare)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Share this profile
          </button>
          <hr className="kb-sep" />
          <button type="button" role="menuitem" className="kb-item" onClick={runAndClose(onAddNote)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Add a note
          </button>
          <hr className="kb-sep" />
          <button type="button" role="menuitem" className="kb-item danger" onClick={runAndClose(onReject)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            Reject Candidate
          </button>
        </div>
      )}
    </>
  );
}
