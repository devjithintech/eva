import { useEffect, useRef, useState } from "react";
import { TEAM_MEMBERS, YOU } from "../../constants";
import { LeaveIcon, UserPlusIcon, VideoIcon } from "../common/icons";

/** Presence avatars + invite popover + live-evaluation call timer (UI demo). */
export function Collaboration() {
  const [present, setPresent] = useState<Record<string, boolean>>({});
  const [invite, setInvite] = useState(false);
  const [call, setCall] = useState(false);
  const [secs, setSecs] = useState(0);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!call) return;
    setSecs(0);
    const iv = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [call]);

  useEffect(() => {
    if (!invite) return;
    const onDown = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setInvite(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [invite]);

  const presentMembers = [YOU, ...TEAM_MEMBERS.filter((m) => present[m.id])];
  const mmss = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
      {call && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, height: 34, padding: "0 12px", border: "1px solid var(--gline)", background: "var(--gsoft)", borderRadius: 17 }}>
          <span style={{ position: "relative", width: 8, height: 8, flex: "none" }}>
            <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#16a34a" }} />
            <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#16a34a", animation: "micPulse 2s ease-out infinite" }} />
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gtext)", fontVariantNumeric: "tabular-nums" }}>{mmss}</span>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center" }}>
        {presentMembers.map((m, i) => (
          <div
            key={m.name}
            title={m.name}
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              color: "#fff",
              background: m.color,
              marginLeft: i > 0 ? -9 : 0,
              border: `2px solid ${call ? "#16a34a" : "var(--panel)"}`,
              position: "relative",
              zIndex: 10 - i,
            }}
          >
            {m.init}
          </div>
        ))}
      </div>

      <div ref={popRef} style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <button
          onClick={() => setInvite((v) => !v)}
          title="Add team member"
          style={{ width: 31, height: 31, borderRadius: "50%", border: "1.5px dashed var(--aline)", background: "transparent", color: "#6354f2", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <UserPlusIcon size={16} />
        </button>
        {invite && (
          <div style={{ position: "absolute", top: 44, right: 0, width: 286, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, boxShadow: "0 18px 50px -16px rgba(20,20,40,.30)", padding: 15, zIndex: 60, animation: "fadeUp .2s ease both" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 3 }}>Evaluate together</div>
            <div style={{ fontSize: 11.5, color: "var(--ink3)", marginBottom: 13, lineHeight: 1.45 }}>
              Invite colleagues to review this candidate with you in real time.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {TEAM_MEMBERS.map((t) => {
                const on = !!present[t.id];
                return (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flex: "none", background: t.color }}>
                      {t.init}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{t.name}</div>
                      <div style={{ fontSize: 10.5, color: "var(--ink3)" }}>{t.role}</div>
                    </div>
                    <button
                      onClick={() => setPresent((p) => ({ ...p, [t.id]: !p[t.id] }))}
                      style={{
                        border: on ? "1px solid var(--gline)" : "1px solid var(--aline)",
                        background: on ? "var(--gsoft)" : "var(--asoft)",
                        color: on ? "var(--gtext)" : "var(--acc)",
                        borderRadius: 8,
                        fontSize: 11.5,
                        fontWeight: 700,
                        padding: "5px 12px",
                        cursor: "pointer",
                        flex: "none",
                      }}
                    >
                      {on ? "Added" : "Add"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {call ? (
        <button onClick={() => setCall(false)} style={{ display: "flex", alignItems: "center", gap: 7, height: 31, padding: "0 13px", border: "none", borderRadius: 8, background: "var(--rsoft)", color: "var(--rtext)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <LeaveIcon size={15} />
          Leave
        </button>
      ) : (
        <button onClick={() => setCall(true)} style={{ display: "flex", alignItems: "center", gap: 7, height: 31, padding: "0 13px", border: "none", borderRadius: 8, background: "#6354f2", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 3px 10px -3px rgba(99,84,242,.5)" }}>
          <VideoIcon size={15} />
          Evaluate live
        </button>
      )}
    </div>
  );
}
