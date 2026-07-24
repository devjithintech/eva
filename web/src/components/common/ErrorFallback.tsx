import { useState } from "react";
import { AlertTriangleIcon, CopyIcon, RefreshIcon, CheckIcon } from "./icons";

interface Props {
  /** Bold heading. */
  title?: string;
  /** Friendly, reassuring body copy. */
  message?: string;
  /** Raw detail copied by "Copy Logs" (error text, stack, payload…). */
  logs?: string;
  /** Retry handler — hides the "Ask Again" button when omitted. */
  onRetry?: () => void;
  retryLabel?: string;
}

const DEFAULT_MESSAGE =
  "Sorry — we couldn't display this part of the response just now. Something went wrong while putting it together, but it's not your fault. Please try again in a moment, and we'll do our best to get it right.";

/**
 * Graceful failure card shown when a response (or one artifact) can't be
 * rendered. Reassures the user, lets them copy diagnostic logs, and retry.
 */
export function ErrorFallback({
  title = "Unable to process the request",
  message = DEFAULT_MESSAGE,
  logs,
  onRetry,
  retryLabel = "Ask Again",
}: Props) {
  const [copied, setCopied] = useState(false);

  const copyLogs = async () => {
    try {
      await navigator.clipboard.writeText(logs && logs.trim() ? logs : `${title}\n${message}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — nothing else we can do */
    }
  };

  return (
    <div
      role="alert"
      style={{
        background: "var(--rsoft)",
        border: "1px solid var(--rline)",
        borderRadius: 16,
        padding: "20px 22px",
        animation: "assembleIn .35s ease both",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <AlertTriangleIcon size={20} stroke="var(--atext)" />
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--rtext)" }}>{title}</div>
      </div>

      <p style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.55, color: "var(--ink2)" }}>{message}</p>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
        <button
          onClick={copyLogs}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "9px 15px",
            borderRadius: 10,
            border: "1px solid var(--line)",
            background: "var(--panel)",
            color: "var(--ink2)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {copied ? <CheckIcon size={15} stroke="var(--gtext)" /> : <CopyIcon size={15} stroke="currentColor" />}
          {copied ? "Copied" : "Copy Logs"}
        </button>

        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "9px 16px",
              borderRadius: 10,
              border: "1px solid transparent",
              background: "#e11d48",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 8px 20px -10px rgba(225,29,72,.6)",
            }}
          >
            <RefreshIcon size={15} stroke="currentColor" />
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
