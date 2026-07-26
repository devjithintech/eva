import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ArtifactKind, ArtifactPayload } from "../../agui/artifacts";
import { exportCardDoc, exportCardJpeg, exportCardPdf } from "../../utils/exportCard";
import {
  AlertTriangleIcon,
  AwardIcon,
  BarsIcon,
  CompareIcon,
  CopyIcon,
  DownloadIcon,
  FileIcon,
  GridIcon,
  InfoIcon,
  SaveIcon,
  ScatterIcon,
  TargetIcon,
  TrendUpIcon,
} from "../common/icons";

/** Per-kind card icon for the result-card header. */
const KIND_ICON: Record<ArtifactKind, React.ComponentType<{ size?: number; stroke?: string }>> = {
  opportunity_map: ScatterIcon,
  candidate_pool: BarsIcon,
  comparison: CompareIcon,
  returns: TrendUpIcon,
  benchmark_correlation: GridIcon,
  characteristics: InfoIcon,
  analyst_flags: AlertTriangleIcon,
  scorecard: AwardIcon,
  analysis: TargetIcon,
  document: FileIcon,
};

interface Props {
  kind: ArtifactKind;
  title: string;
  /** 1-based conversation turn this view was assembled from. */
  turn?: number;
  /** Per-turn cost + latency (shown in the header meta once wired). */
  tokens?: number;
  cachedTokens?: number;
  latencyMs?: number;
  /** Optional badge count shown next to the actions (e.g. flag count). */
  count?: number;
  children: ReactNode;
}

type Menu = "save" | "download" | null;

/**
 * The shared "result card" chrome every data artifact renders inside: header
 * with a kind icon, title, a cost/latency meta line, and labeled Share / Save /
 * Download actions — matching the LightAssist card header.
 */
export function ResultCard({ kind, title, turn, tokens, cachedTokens, latencyMs, count, children }: Props) {
  const [menu, setMenu] = useState<Menu>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const actsRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const Icon = KIND_ICON[kind] ?? InfoIcon;

  /** Run one of the exporters against this card's DOM (best-effort). */
  const download = (fn: (el: HTMLElement, title: string) => void | Promise<void>) => {
    setMenu(null);
    if (!cardRef.current || exporting) return;
    setExporting(true);
    void Promise.resolve(fn(cardRef.current, title))
      .catch((err) => console.warn("card export failed:", err))
      .finally(() => setExporting(false));
  };

  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) => {
      if (actsRef.current && !actsRef.current.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menu]);

  // Mockup header meta: "· 612 tokens (+3.3k cached) · 2.4s" (falls back to the
  // turn marker only when a turn has no usage — non-usage providers / old history).
  const kfmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
  const metaParts = [
    tokens != null ? `${tokens.toLocaleString()} tokens${cachedTokens ? ` (+${kfmt(cachedTokens)} cached)` : ""}` : null,
    latencyMs != null ? `${(latencyMs / 1000).toFixed(1)}s` : null,
  ].filter(Boolean);
  const meta = metaParts.length ? `· ${metaParts.join(" · ")}` : turn ? `· from turn ${turn}` : "· assembled on canvas";

  const copyTitle = () => {
    void navigator.clipboard?.writeText(title);
    setCopied(true);
    setMenu(null);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const share = () => {
    if (navigator.share) void navigator.share({ title, text: title }).catch(() => {});
    else copyTitle();
  };

  return (
    <div className="rc-wrap">
      <div className="rc" ref={cardRef}>
      <div className="rc-head">
        {/* Mockup header: round avatar + "· N tokens · Xs" meta — the title lives in the body. */}
        <span className="rc-ic rc-avatar">
          <Icon size={15} stroke="currentColor" />
        </span>
        <span className="rc-meta">{copied ? "Copied" : meta}</span>
        <div className="rc-acts" ref={actsRef}>
          {count != null && count > 0 && <span className="rc-cnt">{count}</span>}

          <button className="rc-hbtn" onClick={share}>
            <ShareIcon />
            Share
          </button>

          <div className={`rc-dd${menu === "save" ? " open" : ""}`}>
            <button className="rc-hbtn" onClick={() => setMenu((m) => (m === "save" ? null : "save"))} aria-haspopup="menu" aria-expanded={menu === "save"}>
              <SaveIcon size={13} stroke="currentColor" />
              Save
              <span className="rc-caret">▾</span>
            </button>
            <div className="rc-dd-menu" role="menu">
              <button onClick={() => setMenu(null)}>Save to workspace</button>
              <button onClick={() => setMenu(null)}>Pin to canvas</button>
            </div>
          </div>

          <div className={`rc-dd${menu === "download" ? " open" : ""}`}>
            <button className="rc-hbtn" onClick={() => setMenu((m) => (m === "download" ? null : "download"))} aria-haspopup="menu" aria-expanded={menu === "download"}>
              <DownloadIcon size={13} stroke="currentColor" />
              {exporting ? "Exporting…" : "Download"}
              <span className="rc-caret">▾</span>
            </button>
            <div className="rc-dd-menu" role="menu">
              <button onClick={() => download(exportCardPdf)}>PDF</button>
              <button onClick={() => download(exportCardDoc)}>Doc</button>
              <button onClick={() => download(exportCardJpeg)}>JPEG</button>
            </div>
          </div>
        </div>
      </div>
      <div className="rc-body">
        <div className="rc-title">{title}</div>
        {children}
      </div>
      </div>

      <div className="rc-foot">
        <button className="rc-fbtn" data-tip={copied ? "Copied" : "Copy"} onClick={copyTitle}>
          <CopyIcon size={15} stroke="currentColor" />
        </button>
        <button className="rc-fbtn" data-tip="Share" onClick={share}>
          <SendIcon />
        </button>
        <button
          className={`rc-fbtn${vote === "up" ? " active" : ""}`}
          data-tip="Good response"
          aria-pressed={vote === "up"}
          onClick={() => setVote((v) => (v === "up" ? null : "up"))}
        >
          <ThumbIcon />
        </button>
        <button
          className={`rc-fbtn${vote === "down" ? " active" : ""}`}
          data-tip="Bad response"
          aria-pressed={vote === "down"}
          onClick={() => setVote((v) => (v === "down" ? null : "down"))}
        >
          <ThumbIcon down />
        </button>
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M12 3v13" />
      <path d="M8 7l4-4 4 4" />
    </svg>
  );
}

/** Arrow-into-doorway "share/send" glyph for the footer. */
function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}

function ThumbIcon({ down = false }: { down?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={down ? { transform: "rotate(180deg)" } : undefined}>
      <path d="M7 10v11" />
      <path d="M4 22h12.5a2 2 0 0 0 2-1.7l1.4-9A2 2 0 0 0 18 9h-5.6l.9-4.5a1.6 1.6 0 0 0-3-1L7 10" />
    </svg>
  );
}

/** Human title for a payload — most carry `title`; characteristics uses the candidate name. */
export function artifactTitle(payload: ArtifactPayload): string {
  if (payload.kind === "characteristics") return payload.candidate.name;
  if (payload.kind === "document") return payload.title ?? "Answer";
  return payload.title;
}
