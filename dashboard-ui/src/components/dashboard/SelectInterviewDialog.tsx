import { useEffect, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  candidateName: string;
  onConfirm: (message: string) => void;
}

/** "Select for interview" confirmation — the optional message is UI-only
 *  (not persisted anywhere), matching the design reference. */
export function SelectInterviewDialog({ open, onClose, candidateName, onConfirm }: Props) {
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (open) setMessage("");
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
      <div className="pref-dialog" role="dialog" aria-modal="true" aria-label="Select for interview">
        <div className="pref-head">
          <div>
            <div className="pref-title">
              Select <span className="hl-name">{candidateName}</span> for interview
            </div>
            <div className="pref-desc">Advance this candidate to the interview round. You can include an optional message.</div>
          </div>
          <button className="pref-x" aria-label="Close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="pref-body">
          <label className="pref-lab" htmlFor="selMsg">
            Message <span className="lab-opt">(optional)</span>
          </label>
          <textarea
            className="pref-ta"
            id="selMsg"
            placeholder="Add context for the hiring team..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <div className="pref-foot">
          <button className="btn cfd-cancel" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn pref-save"
            type="button"
            onClick={() => {
              onConfirm(message);
              onClose();
            }}
          >
            Select
          </button>
        </div>
      </div>
    </div>
  );
}
