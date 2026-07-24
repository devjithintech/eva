import { useEffect, useRef, useState } from "react";
import { ChevronRightIcon, CopyIcon, DownloadIcon, SaveIcon } from "../../common/icons";
import { Markdown } from "../../chat/Markdown";
import { exportCardDoc, exportCardJpeg, exportCardPdf } from "../../../utils/exportCard";

interface Props {
  title?: string;
  intro?: string;
  keyPoints?: string[];
  callout?: { tone: "tip" | "warning" | "important"; text: string };
  body?: string;
  sections?: { title: string; body: string }[];
  followups?: string[];
  /** Per-turn cost/latency shown in the card meta. */
  tokens?: number;
  cachedTokens?: number;
  latencyMs?: number;
  /** Clicking a follow-up chip sends it as the next question (omitted in the gallery). */
  onFollowup?: (text: string) => void;
}

const CALLOUT_IC = { tip: "💡", warning: "⚠️", important: "❗" } as const;
type Menu = "save" | "download" | null;

/**
 * The LightAssist reply card — the "answer" artifact rendered as a self-contained
 * card matching the `.lacard` mockup: sparkle avatar + cost/latency meta, header
 * actions (Share · Save · Download), body, sections, follow-ups, post-actions.
 */
export function DocumentView({ title, intro, keyPoints, callout, body, sections, followups, tokens, cachedTokens, latencyMs, onFollowup }: Props) {
  const [menu, setMenu] = useState<Menu>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const hdrRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Close any open header dropdown on an outside click.
  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) => {
      if (hdrRef.current && !hdrRef.current.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menu]);

  // "· 612 tokens (+3.3k cached) · 2.4s" when we have the numbers, else a plain label.
  const kfmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
  const metaParts = [
    tokens != null ? `${tokens.toLocaleString()} tokens${cachedTokens ? ` (+${kfmt(cachedTokens)} cached)` : ""}` : null,
    latencyMs != null ? `${(latencyMs / 1000).toFixed(1)}s` : null,
  ].filter(Boolean);
  const meta = metaParts.length ? `· ${metaParts.join(" · ")}` : "· Answer";

  const plainText = () => {
    const lines: string[] = [];
    if (title) lines.push(title, "");
    if (intro) lines.push(intro, "");
    if (keyPoints?.length) lines.push(...keyPoints.map((p) => `• ${p}`), "");
    if (callout) lines.push(`${CALLOUT_IC[callout.tone]} ${callout.text}`, "");
    if (body) lines.push(body, "");
    for (const s of sections ?? []) lines.push(s.title, s.body, "");
    return lines.join("\n").trim();
  };

  const flashCopied = () => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };
  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text);
    flashCopied();
    setMenu(null);
  };

  const share = () => {
    const text = plainText();
    if (navigator.share) void navigator.share({ title: title ?? "LightHouse answer", text }).catch(() => {});
    else copy(text);
  };

  /** Run one of the exporters against the card's DOM (best-effort). */
  const download = (fn: (el: HTMLElement, title: string) => void | Promise<void>) => {
    setMenu(null);
    if (!cardRef.current || exporting) return;
    setExporting(true);
    void Promise.resolve(fn(cardRef.current, title ?? "answer"))
      .catch((err) => console.warn("card export failed:", err))
      .finally(() => setExporting(false));
  };

  return (
    <div className="lacard">
      <div className="card" ref={cardRef}>
        <div className="hdr" ref={hdrRef}>
          <span className="avatar">
            <SparkIcon />
          </span>
          <span className="meta">{meta}</span>
          <div className="actions">
            <button className="hbtn" onClick={share}>
              <ShareIcon />
              Share
            </button>

            <div className={`dd${menu === "save" ? " open" : ""}`}>
              <button className="hbtn" onClick={() => setMenu((m) => (m === "save" ? null : "save"))} aria-haspopup="menu" aria-expanded={menu === "save"}>
                <SaveIcon size={13} stroke="currentColor" />
                Save
                <span className="caret">▾</span>
              </button>
              <div className="dd-menu" role="menu">
                <button onClick={() => setMenu(null)}>Save to workspace</button>
                <button onClick={() => setMenu(null)}>Save as snippet</button>
              </div>
            </div>

            <div className={`dd${menu === "download" ? " open" : ""}`}>
              <button className="hbtn" onClick={() => setMenu((m) => (m === "download" ? null : "download"))} aria-haspopup="menu" aria-expanded={menu === "download"}>
                <DownloadIcon size={13} stroke="currentColor" />
                {exporting ? "Exporting…" : "Download"}
                <span className="caret">▾</span>
              </button>
              <div className="dd-menu" role="menu">
                <button onClick={() => download(exportCardPdf)}>PDF</button>
                <button onClick={() => download(exportCardDoc)}>Doc</button>
                <button onClick={() => download(exportCardJpeg)}>JPEG</button>
              </div>
            </div>
          </div>
        </div>

        <div className="body">
          {title && <div className="title">{title}</div>}
          {intro && <p className="intro">{intro}</p>}

          {keyPoints && keyPoints.length > 0 && (
            <>
              <div className="lbl">Key points</div>
              <ul>
                {keyPoints.map((p, i) => (
                  <li key={i}>
                    <Markdown text={p} />
                  </li>
                ))}
              </ul>
            </>
          )}

          {callout && (
            <div className="callout">
              <span className="ic">{CALLOUT_IC[callout.tone]}</span>
              <p>{callout.text}</p>
            </div>
          )}

          {body && <Markdown text={body} />}
        </div>

        {sections && sections.length > 0 && (
          <div className="sections">
            {sections.map((s, i) => (
              <details key={i}>
                <summary>
                  <span className="chev">
                    <ChevronRightIcon size={11} stroke="currentColor" />
                  </span>
                  {s.title}
                </summary>
                <div className="sect-content">
                  <Markdown text={s.body} />
                </div>
              </details>
            ))}
          </div>
        )}

        {followups && followups.length > 0 && (
          <div className="fups">
            <div className="cap">Suggested follow-ups</div>
            <div className="chips">
              {followups.map((f, i) => (
                <button key={i} className="chip" onClick={() => onFollowup?.(f)} disabled={!onFollowup}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="postactions">
        <button className="iconbtn" data-tip={copied ? "Copied" : "Copy"} onClick={() => copy(plainText())}>
          <CopyIcon size={15} stroke="currentColor" />
        </button>
        <button className="iconbtn" data-tip="Share" onClick={share}>
          <SendIcon />
        </button>
        <button
          className={`iconbtn${vote === "up" ? " active" : ""}`}
          data-tip="Good response"
          aria-pressed={vote === "up"}
          onClick={() => setVote((v) => (v === "up" ? null : "up"))}
        >
          <ThumbIcon />
        </button>
        <button
          className={`iconbtn${vote === "down" ? " active" : ""}`}
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

/* ── small inline glyphs (not in the shared icon set) ────────────────────── */

/** Four-point sparkle used as the assistant avatar. */
function SparkIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c.45 4.1 2.4 6.05 6 6-3.6.45-5.55 2.4-6 6-.45-3.6-2.4-5.55-6-6 4.1-.45 5.55-2.4 6-6z" />
    </svg>
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

function ThumbIcon({ down = false }: { down?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={down ? { transform: "rotate(180deg)" } : undefined}>
      <path d="M7 10v11" />
      <path d="M4 22h12.5a2 2 0 0 0 2-1.7l1.4-9A2 2 0 0 0 18 9h-5.6l.9-4.5a1.6 1.6 0 0 0-3-1L7 10" />
    </svg>
  );
}

/** Arrow-into-doorway "share/send" glyph matching the footer mockup. */
function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}
