import { useEffect, useRef, useState } from "react";
import type { ModelOption } from "../../agui/useModels";
import { AiDot, CheckIcon, ChevronDownIcon } from "../common/icons";

interface Props {
  models: ModelOption[];
  selected: string;
  onSelect: (id: string) => void;
}

/** Dropdown that picks the backend model. Selection is forwarded to the agent. */
export function ModelSwitcher({ models, selected, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = models.find((m) => m.id === selected) ?? models[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          height: 32,
          padding: "0 10px",
          border: "1px solid var(--line)",
          background: "var(--panel)",
          borderRadius: 9,
          cursor: "pointer",
          fontSize: 12.5,
          fontWeight: 600,
          color: "var(--ink2)",
        }}
      >
        <AiDot size={7} />
        {current?.label ?? "Model"}
        <ChevronDownIcon size={13} width={2.2} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: 0,
            width: 262,
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: 14,
            boxShadow: "0 18px 50px -16px rgba(20,20,40,.30)",
            padding: 6,
            zIndex: 60,
            animation: "fadeUp .18s ease both",
          }}
        >
          {models.map((m) => {
            const active = m.id === selected;
            return (
              <button
                key={m.id}
                onClick={() => {
                  onSelect(m.id);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  border: "none",
                  background: active ? "var(--asoft)" : "transparent",
                  borderRadius: 10,
                  padding: "8px 10px",
                  cursor: "pointer",
                }}
              >
                <span style={{ flex: 1, textAlign: "left" }}>
                  <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>
                    {m.label}
                  </span>
                  <span style={{ display: "block", fontSize: 10.5, color: "var(--ink3)" }}>{m.sub}</span>
                </span>
                {active && <CheckIcon size={13} width={3} stroke="#6354f2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
