import { useEffect, useRef, useState } from "react";
import type { VoiceOption } from "../../agui/useTTS";
import { CheckIcon, ChevronDownIcon } from "../common/icons";

interface Props {
  voices: VoiceOption[];
  selected: string | null;
  onSelect: (key: string) => void;
}

/** Runtime voice/provider picker (Orpheus voices, ElevenLabs, …). */
export function VoiceSwitcher({ voices, selected, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = voices.find((v) => v.key === selected) ?? voices[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!voices.length) return null;

  // group by provider for the menu
  const groups = voices.reduce<Record<string, VoiceOption[]>>((acc, v) => {
    (acc[v.providerLabel] ??= []).push(v);
    return acc;
  }, {});

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Voice"
        style={{ display: "flex", alignItems: "center", gap: 6, height: 32, padding: "0 10px", border: "1px solid var(--line)", background: "var(--panel)", borderRadius: 9, cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "var(--ink2)" }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6fb0e8" strokeWidth="2" strokeLinecap="round">
          <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
        </svg>
        {current?.label ?? "Voice"}
        <ChevronDownIcon size={13} width={2.2} />
      </button>

      {open && (
        <div style={{ position: "absolute", bottom: 40, right: 0, width: 230, maxHeight: 300, overflowY: "auto", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, boxShadow: "0 18px 50px -16px rgba(20,20,40,.30)", padding: 6, zIndex: 60, animation: "fadeUp .18s ease both" }}>
          {Object.entries(groups).map(([provider, opts]) => (
            <div key={provider}>
              <div style={{ fontFamily: "var(--mono, monospace)", fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink3)", padding: "8px 10px 4px" }}>
                {provider}
              </div>
              {opts.map((v) => {
                const active = v.key === selected;
                return (
                  <button
                    key={v.key}
                    onClick={() => {
                      onSelect(v.key);
                      setOpen(false);
                    }}
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", border: "none", background: active ? "var(--asoft)" : "transparent", borderRadius: 10, padding: "8px 10px", cursor: "pointer" }}
                  >
                    <span style={{ flex: 1, textAlign: "left", fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{v.label}</span>
                    {active && <CheckIcon size={13} width={3} stroke="#6354f2" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
