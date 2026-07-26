import { useEffect, useRef, useState } from "react";
import type { ChatMessage, RunStatus } from "../../agui/useAguiAgent";
import type { ModelOption } from "../../agui/useModels";
import { ArrowUpRightIcon, ChatBubbleIcon, CloseIcon, StopIcon } from "../common/icons";
import { Collaboration } from "../layout/Collaboration";
import { Composer } from "./Composer";
import { Markdown } from "./Markdown";
import { Waveform } from "./Waveform";

interface Props {
  chat: ChatMessage[];
  status: RunStatus;
  hasArtifacts: boolean;
  onClose: () => void;
  suggestText: string | null;
  onSuggest: () => void;
  listening: boolean;
  speaking: boolean;
  onStopSpeaking: () => void;
  transcript: string;
  draft: string;
  onDraft: (v: string) => void;
  onSend: () => void;
  /** Omitted when voice/audio is disabled — the mic button is then hidden. */
  onMic?: () => void;
  attachments: string[];
  onAttach: () => void;
  onRemoveAttach: (i: number) => void;
  models: ModelOption[];
  selectedModel: string;
  onSelectModel: (id: string) => void;
}

/** Right column: the LightAssist conversation — collaboration head, message
 *  thread, and the composer / voice footer. */
export function ChatPanel(props: Props) {
  const { chat, status } = props;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [genUi, setGenUi] = useState(true);
  const thinking = status === "thinking";
  const voiceUp = props.listening || props.speaking;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat, thinking]);

  return (
    <section className="col-right">
      <div className="chat-head">
        <div className="genui-row">
          <Collaboration />
        </div>
        <button className="chat-close" onClick={props.onClose} aria-label="Close chat" title="Close chat">
          <CloseIcon size={18} stroke="currentColor" />
        </button>
      </div>

      <div ref={scrollRef} className="chat-thread">
        {chat.length === 0 && !thinking && (
          <div style={{ margin: "auto 0", textAlign: "center", color: "var(--muted)", padding: "20px 8px" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>
              Ask about a candidate
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              {props.onMic ? "Type below or tap the mic." : "Type your question below."} The answer streams here and assembles on the canvas.
            </div>
          </div>
        )}

        {chat.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="msg user">
              {m.content}
            </div>
          ) : (
            <div key={m.id}>
              <div className="msg bot"><Markdown text={m.content} /></div>
              {props.hasArtifacts && (
                <div className="msg-ref">
                  <ArrowUpRightIcon size={12} stroke="currentColor" />
                  Assembled on canvas
                </div>
              )}
            </div>
          ),
        )}

        {thinking && (
          <div className="msg bot typing">
            <i /><i /><i />
          </div>
        )}
      </div>

      <div className="chat-foot">
        {props.suggestText && status === "idle" && !voiceUp && (
          <div className="sugg">
            <button className="sugg-chip" onClick={props.onSuggest}>
              <ChatBubbleIcon size={13} stroke="currentColor" />
              {props.suggestText}
            </button>
          </div>
        )}

        <div className="genui-row">
          <span className="lbl">Generative UI</span>
          <label className="tog" title="Assemble views on the canvas">
            <input type="checkbox" checked={genUi} onChange={(e) => setGenUi(e.target.checked)} />
            <span className="tog-track" />
          </label>
        </div>

        {voiceUp ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 13,
              padding: "12px 16px",
              background: "var(--primary-soft)",
              border: "1px solid var(--aline)",
              borderRadius: 14,
            }}
          >
            <Waveform />
            <div style={{ flex: 1, fontSize: 12.5, color: "var(--ink)", lineHeight: 1.4 }}>
              {props.transcript}
              {props.listening && <span style={{ color: "var(--primary)" }}>▋</span>}
            </div>
            {props.speaking ? (
              <button
                onClick={props.onStopSpeaking}
                aria-label="Stop speaking"
                style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, height: 28, padding: "0 10px", border: "none", borderRadius: 9, cursor: "pointer", background: "var(--primary)", color: "#fff", fontSize: 11, fontWeight: 700 }}
              >
                <StopIcon size={13} color="#fff" />
                Stop
              </button>
            ) : (
              <span style={{ fontSize: 11, color: "var(--muted)", flex: "none" }}>Listening…</span>
            )}
          </div>
        ) : (
          <Composer
            variant="chat"
            draft={props.draft}
            onDraft={props.onDraft}
            onSend={props.onSend}
            onMic={props.onMic}
            attachments={props.attachments}
            onAttach={props.onAttach}
            onRemoveAttach={props.onRemoveAttach}
            models={props.models}
            selectedModel={props.selectedModel}
            onSelectModel={props.onSelectModel}
            disabled={status !== "idle"}
          />
        )}

        <div className="chat-disclaimer">AI can make mistakes. Check important info.</div>
      </div>
    </section>
  );
}
