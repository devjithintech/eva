import { useEffect, useRef, useState } from "react";
import { ARTIFACT_LABELS } from "../../agui/artifacts";
import type { GeneratedArtifact } from "../../agui/useAguiAgent";
import { SaveIcon, ZapIcon } from "../common/icons";
import { ErrorFallback } from "../common/ErrorFallback";
import { NoViewCard } from "../common/NoViewCard";
import { ArtifactBoundary } from "./ArtifactBoundary";
import { ArtifactRenderer } from "./ArtifactRenderer";
import { Skeleton } from "./Skeleton";

type Mode = "living" | "composed";

interface Props {
  artifacts: GeneratedArtifact[];
  /** True whenever a run is in flight (thinking or streaming) — drives the loader. */
  busy: boolean;
  /** Run-level error message, if the last agent run failed. */
  error?: string | null;
  /** Last run answered in chat but rendered no artifact (out-of-scope / ask-back). */
  noView?: boolean;
  /** Re-run the last request (powers the fallback's "Ask Again"). */
  onRetry?: () => void;
  /** Submit a follow-up prompt (powers the document view's follow-up chips). */
  onFollowup?: (text: string) => void;
  /** Conversation actions behind the More ▾ menu (wired to the DB by App). */
  onDeleteChat?: () => void;
  onArchiveChat?: () => void;
  /** Save the current chat to a sidebar section (My Notes / Office Notebook). */
  onSaveChat?: (dest: "notes" | "notebook") => void;
}

/** Center column: the "Generated workspace" — the live canvas of result cards
 *  the agent assembles. The voice orb lives on the landing, not here. */
export function CanvasPanel({ artifacts, busy, error, noView, onRetry, onFollowup, onDeleteChat, onArchiveChat, onSaveChat }: Props) {
  const [mode, setMode] = useState<Mode>("composed");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [menu, setMenu] = useState<"save" | "more" | null>(null);
  const [saved, setSaved] = useState(false);
  const menusRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Close the header dropdowns on any outside click.
  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) => {
      if (menusRef.current && !menusRef.current.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menu]);

  const saveTo = (dest: "notes" | "notebook") => {
    setMenu(null);
    onSaveChat?.(dest);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  };
  const act = (fn?: () => void) => {
    setMenu(null);
    fn?.();
  };

  useEffect(() => {
    if (artifacts.length) setActiveId(artifacts[artifacts.length - 1].id);
  }, [artifacts.length]);

  useEffect(() => {
    if (mode === "composed") scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    else scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [artifacts.length, activeId, mode, busy]);

  const active = artifacts.find((a) => a.id === activeId) ?? artifacts[artifacts.length - 1];
  const visible = mode === "composed" ? artifacts : active ? [active] : [];
  const empty = !busy && !error && !noView && artifacts.length === 0;

  return (
    <section className="col-center">
      <div className="center-head">
        <span className="lead">
          <ZapIcon size={22} stroke="currentColor" />
        </span>
        <h1>Generated workspace</h1>
        {artifacts.length > 0 && (
          <div className="seg" role="tablist" aria-label="Workspace mode">
            <button className={mode === "living" ? "on" : ""} onClick={() => setMode("living")}>
              Living canvas
            </button>
            <button className={mode === "composed" ? "on" : ""} onClick={() => setMode("composed")}>
              Composed
            </button>
          </div>
        )}
        <div ref={menusRef} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className={`rc-dd${menu === "save" ? " open" : ""}`}>
            <button className="head-btn" onClick={() => setMenu((m) => (m === "save" ? null : "save"))} aria-haspopup="menu" aria-expanded={menu === "save"}>
              <SaveIcon size={16} stroke="currentColor" />
              {saved ? "Saved ✓" : "Save"}
              <span className="rc-caret">▾</span>
            </button>
            <div className="rc-dd-menu" role="menu">
              <button onClick={() => saveTo("notes")}>Save to my notes</button>
              <button onClick={() => saveTo("notebook")}>Save to office notebook</button>
            </div>
          </div>

          <div className={`rc-dd${menu === "more" ? " open" : ""}`}>
            <button
              className="head-btn"
              onClick={() => setMenu((m) => (m === "more" ? null : "more"))}
              aria-haspopup="menu"
              aria-expanded={menu === "more"}
              aria-label="More actions"
              title="More actions"
              style={{ padding: "0 10px" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="1.9" />
                <circle cx="12" cy="12" r="1.9" />
                <circle cx="19" cy="12" r="1.9" />
              </svg>
            </button>
            <div className="rc-dd-menu" role="menu">
              <button onClick={() => act(onArchiveChat)}>Archive</button>
              <button onClick={() => act(onDeleteChat)} style={{ color: "var(--neg)" }}>Delete</button>
            </div>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="center-body">
        <div className="center-inner">
          <div className="fi-eyebrow">Field insights</div>
          <h2 className="fi-title">Candidate Pool Today</h2>

          {mode === "living" && artifacts.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
              {artifacts.map((a) => {
                const on = a.id === active?.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => setActiveId(a.id)}
                    className="sugg-chip"
                    style={
                      on
                        ? { background: "var(--primary-soft)", borderColor: "var(--aline)", color: "var(--primary-d)", fontWeight: 600 }
                        : undefined
                    }
                  >
                    {ARTIFACT_LABELS[a.kind]}
                  </button>
                );
              })}
            </div>
          )}

          {visible.map((a) => (
            <ArtifactBoundary key={a.id} context={`artifact: ${a.kind}\npayload: ${safeJson(a.payload)}`}>
              <ArtifactRenderer payload={a.payload} turn={artifacts.indexOf(a) + 1} tokens={a.tokens} cachedTokens={a.cachedTokens} latencyMs={a.latencyMs} onFollowup={onFollowup} />
            </ArtifactBoundary>
          ))}

          {busy && (
            <div className="rc" style={{ padding: 18 }}>
              <Skeleton />
            </div>
          )}

          {error && !busy && (
            <ErrorFallback logs={error} onRetry={onRetry} />
          )}

          {noView && !error && !busy && <NoViewCard />}

          {empty && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0 40px", textAlign: "center" }}>
              <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-.01em", color: "var(--ink)" }}>
                Your workspace is ready
              </div>
              <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 6, maxWidth: 380, lineHeight: 1.5 }}>
                Ask LightAssist about any candidate in the chat — the exact view assembles here.
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** JSON.stringify that never throws (circular refs → a short marker). */
function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return "[unserializable payload]";
  }
}
