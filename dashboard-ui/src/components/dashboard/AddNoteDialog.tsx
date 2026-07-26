import { useEffect, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

/** "Add a note" dialog — matches the design reference exactly: the note is
 *  UI-only (not persisted anywhere), Add just closes the dialog. */
export function AddNoteDialog({ open, onClose }: Props) {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) setNote("");
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="pref-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pref-dialog" role="dialog" aria-modal="true" aria-label="Add a note">
        <div className="pref-head">
          <div>
            <div className="pref-title">Add a note</div>
            <div className="pref-desc">Add a short feedback or notes about the candidate</div>
          </div>
          <button className="pref-x" aria-label="Close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="pref-body">
          <textarea className="pref-ta" placeholder="Leave a comment" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="note-hint">Added notes can be seen by other team members</div>
        </div>
        <div className="pref-foot">
          <button className="btn pref-save" type="button" disabled={!note.trim()} onClick={onClose}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
