import { InfoIcon } from "./icons";

interface Props {
  /** Optional heading override. */
  title?: string;
  /** Optional body override. */
  message?: string;
}

const DEFAULT_MESSAGE =
  "I answered that one in the chat — there's no fund view to display for it. Try asking about a candidate's profile, a comparison, trailing returns, analyst flags, or a scorecard.";

/**
 * Calm, non-error placeholder shown in the workspace when the assistant replied
 * in chat but produced no artifact (an out-of-scope question, or an ask-back).
 * Deliberately NOT the red error fallback — nothing failed here.
 */
export function NoViewCard({ title = "Nothing to show on the canvas", message = DEFAULT_MESSAGE }: Props) {
  return (
    <div
      style={{
        background: "var(--panel2)",
        border: "1px solid var(--line)",
        borderRadius: 16,
        padding: "20px 22px",
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        animation: "assembleIn .35s ease both",
      }}
    >
      <span
        style={{
          flex: "none",
          width: 34,
          height: 34,
          borderRadius: 10,
          display: "grid",
          placeItems: "center",
          background: "var(--primary-soft)",
          color: "var(--primary-d)",
        }}
      >
        <InfoIcon size={18} stroke="currentColor" />
      </span>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{title}</div>
        <p style={{ margin: "6px 0 0", fontSize: 13.5, lineHeight: 1.55, color: "var(--muted)" }}>{message}</p>
      </div>
    </div>
  );
}
