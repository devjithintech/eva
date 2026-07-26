interface Props {
  open: boolean;
  onClose: () => void;
  candidateName: string;
  onConfirm: () => void;
}

/** Reject-candidate confirmation — matches the design reference exactly. */
export function RejectCandidateDialog({ open, onClose, candidateName, onConfirm }: Props) {
  if (!open) return null;

  return (
    <div
      className="pref-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pref-dialog" role="dialog" aria-modal="true" aria-label="Reject Candidate">
        <div className="pref-head">
          <div>
            <div className="pref-title">Reject Candidate</div>
            <div className="pref-desc">
              This will remove <b className="hl-name">{candidateName}</b> from the shortlist. The sourcing team will be notified.
            </div>
          </div>
          <button className="pref-x" aria-label="Close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="pref-foot">
          <button className="btn cfd-cancel" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn cfd-cancel btn-danger"
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
