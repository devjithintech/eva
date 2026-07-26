import { useRef, type KeyboardEvent } from "react";
import type { ModelOption } from "../../agui/useModels";
import { FileIcon, MicIcon, PaperclipIcon, SendIcon } from "../common/icons";
import { ModelSwitcher } from "./ModelSwitcher";

interface Props {
  variant: "cold" | "chat";
  draft: string;
  onDraft: (v: string) => void;
  onSend: () => void;
  onMic?: () => void;
  attachments: string[];
  onAttach: () => void;
  onRemoveAttach: (i: number) => void;
  models: ModelOption[];
  selectedModel: string;
  onSelectModel: (id: string) => void;
  disabled?: boolean;
}

export function Composer({
  variant,
  draft,
  onDraft,
  onSend,
  onMic,
  attachments,
  onAttach,
  onRemoveAttach,
  models,
  selectedModel,
  onSelectModel,
  disabled,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const cold = variant === "cold";
  const hasDraft = draft.trim().length > 0;

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (hasDraft && !disabled) onSend();
    }
  };

  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: cold ? 16 : 18,
        boxShadow: cold ? "0 12px 40px -16px rgba(20,20,40,.22)" : "0 6px 22px -12px rgba(20,20,40,.18)",
        padding: cold ? "13px 15px 11px" : "10px 12px 9px",
      }}
    >
      {attachments.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 10 }}>
          {attachments.map((name, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "5px 9px",
                background: "var(--chip)",
                border: "1px solid var(--line)",
                borderRadius: 9,
                fontSize: 11.5,
                color: "var(--ink2)",
                fontWeight: 600,
              }}
            >
              <FileIcon size={13} stroke="#8b7cf8" />
              {name}
              <button
                onClick={() => onRemoveAttach(i)}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--ink3)", display: "flex", padding: 0, fontSize: 12 }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => onDraft(e.target.value)}
        onKeyDown={onKey}
        placeholder={cold ? "Ask about any candidate…" : "Message LightAssist about any candidate…"}
        rows={1}
        style={{
          display: "block",
          width: "100%",
          border: "none",
          outline: "none",
          resize: "none",
          background: "transparent",
          fontSize: cold ? 16 : 13,
          lineHeight: 1.5,
          color: "var(--ink)",
          minHeight: cold ? 26 : 24,
          maxHeight: cold ? 150 : 130,
          padding: "4px 2px",
          fontFamily: "inherit",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: cold ? 8 : 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: cold ? 5 : 4 }}>
          <button
            onClick={onAttach}
            title="Attach files"
            style={{ width: 34, height: 34, border: "none", background: "transparent", cursor: "pointer", color: "var(--ink3)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <PaperclipIcon size={cold ? 19 : 18} />
          </button>
          <ModelSwitcher models={models} selected={selectedModel} onSelect={onSelectModel} />
          {!cold && onMic && (
            <button
              onClick={onMic}
              title="Voice"
              style={{ width: 34, height: 34, border: "none", borderRadius: 9, cursor: "pointer", background: "#6354f2", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 10px -3px rgba(99,84,242,.5)" }}
            >
              <MicIcon size={16} stroke="#fff" />
            </button>
          )}
        </div>
        {hasDraft && (
          <button
            onClick={() => !disabled && onSend()}
            disabled={disabled}
            style={{
              width: cold ? 38 : 36,
              height: cold ? 38 : 36,
              borderRadius: cold ? 11 : 10,
              border: "none",
              cursor: disabled ? "default" : "pointer",
              background: "#6354f2",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: disabled ? 0.55 : 1,
              animation: "fadeUp .2s ease both",
            }}
          >
            <SendIcon size={cold ? 18 : 17} width={2.2} />
          </button>
        )}
      </div>
    </div>
  );
}
