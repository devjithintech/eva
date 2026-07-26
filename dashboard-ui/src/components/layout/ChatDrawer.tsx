import { useEffect, useRef, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ChatMessage {
  role: "user" | "bot";
  text: string;
  typing?: boolean;
}

const QUICK_QUESTIONS: { icon: "list" | "msg"; label: string }[] = [
  { icon: "list", label: "Summarize" },
  { icon: "msg", label: "What is the very first step I should take today?" },
  { icon: "msg", label: "Can you explain the dashboard in simpler terms?" },
  { icon: "msg", label: "What is the single most important takeaway here?" },
];

const FOLLOW_UPS: [string, string][] = [
  ["Simplify", "Explain this to me as if I am a beginner."],
  ["Summarize", "What is the single most important takeaway here?"],
  ["Condense", "Shorten this response into three punchy bullet points."],
  ["Format", "Convert this information into a step-by-step checklist."],
  ["Tone", "Rewrite this to sound more [professional / casual / persuasive]."],
  ["Audience", "Adapt this message specifically for a [boss / client / friend]."],
  ["Alternatives", "What are three different options or angles to consider?"],
  ["Counterarguments", "What are the most common objections to this point?"],
  ["Variables", "How would this change if I had half the budget?"],
  ["Omissions", "What did you leave out to keep this short?"],
  ["Assumptions", "What are the core assumptions behind your answer?"],
  ["Risks", "What are the main limitations or risks of this?"],
  ["Failures", "In what specific scenario would this advice fail completely?"],
  ["Verification", "What specific keywords should I search to verify this?"],
  ["Action", "What is the very first step I should take today?"],
];

function answerFor(q: string): string {
  const k = q.toLowerCase();
  if (k.includes("summar")) {
    return "The CIA dashboard tracks 57 scored candidate funds moving through Scored → Shortlisted → Interview. Use the filters and factor preferences to narrow the pool, then compare finalists before advancing them.";
  }
  if (k.includes("first step")) {
    return "Start on the Scored tab: sort by Jensen's Alpha, apply any Currency/Region/Strategy filters you care about, and shortlist the candidates that clear your bar.";
  }
  if (k.includes("simpler") || k.includes("dashboard")) {
    return "Each row is one candidate fund. The tabs move funds through your pipeline — Scored, then Shortlisted, then Interview — and Insights above the table shows how the pool breaks down at each stage.";
  }
  if (k.includes("takeaway")) {
    return "The single most important takeaway: use the Selection Zone chart on the Scored tab to spot strong candidates that haven't been shortlisted yet — that's usually where the best next moves are.";
  }
  return "Here's what I found based on the current dashboard view. (Illustrative response.)";
}

const MIC_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}
function MsgIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

/** Decorative "LightAssist" chat drawer — ported from the design reference.
 *  Canned quick-answers only; not wired to a real backend (real chat lives in
 *  the separate conversation-ui app). */
export function ChatDrawer({ open, onClose }: Props) {
  const [view, setView] = useState<"home" | "convo">("home");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [followUps, setFollowUps] = useState<string[][]>([]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    document.body.classList.toggle("chat-open", open);
    if (open) setView("home");
    return () => {
      document.body.classList.remove("chat-open");
    };
  }, [open]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, view]);

  const ask = (q: string) => {
    setView("convo");
    setFollowUps([]);
    setMessages((prev) => [...prev, { role: "user", text: q }, { role: "bot", text: "", typing: true }]);
    setTimeout(() => {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "bot", text: answerFor(q) };
        return next;
      });
      setFollowUps(
        FOLLOW_UPS.slice()
          .sort(() => Math.random() - 0.5)
          .slice(0, 5),
      );
    }, 1400);
  };

  const submit = () => {
    const q = input.trim();
    if (!q) return;
    ask(q);
    setInput("");
  };

  const listen = () => {
    setView("convo");
    setMessages([]);
    setFollowUps([]);
    setListening(true);
    setTimeout(() => {
      setListening(false);
      ask("How's the candidate pool looking today?");
    }, 1900);
  };

  const backHome = () => {
    setView("home");
    setMessages([]);
    setFollowUps([]);
  };

  const autoGrow = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const h = Math.min(ta.scrollHeight, 106);
    ta.style.height = `${h}px`;
    ta.style.overflowY = ta.scrollHeight > 106 ? "auto" : "hidden";
  };

  const pickFollowUp = (text: string) => {
    setInput(text);
    const ta = taRef.current;
    if (!ta) return;
    ta.focus();
    requestAnimationFrame(() => {
      const a = text.indexOf("["),
        z = text.indexOf("]");
      if (a > -1 && z > a) ta.setSelectionRange(a, z + 1);
      else ta.setSelectionRange(text.length, text.length);
      autoGrow();
    });
  };

  return (
    <aside className="chat" aria-label="LightAssist" aria-hidden={!open}>
      <div className="chat-head">
        <button className="chat-close" aria-label="Close" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className="chat-body" ref={bodyRef}>
        {view === "home" ? (
          <div id="chatHome">
            <h2 className="chat-greet">
              Hi Morgan 👋
              <br />
              How can I help?
            </h2>
            <div className="chat-group">
              {QUICK_QUESTIONS.map((q) => (
                <button key={q.label} type="button" className="chat-item" onClick={() => ask(q.label)}>
                  <span className="ci-ic">{q.icon === "list" ? <ListIcon /> : <MsgIcon />}</span>
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div id="chatConvo" className="chat-convo">
            <button className="convo-back" onClick={backHome}>
              ← New question
            </button>
            <div id="convoMsgs">
              {messages.map((m, i) =>
                m.typing ? (
                  <div className="msg bot typing" key={i}>
                    <i /><i /><i />
                  </div>
                ) : (
                  <div className={`msg ${m.role}`} key={i}>
                    {m.text}
                  </div>
                ),
              )}
              {listening && (
                <div className="listening">
                  <span className="mic-pulse">{MIC_ICON}</span>
                  <div className="bars">
                    <i /><i /><i /><i /><i />
                  </div>
                  <div className="lt">Listening…</div>
                </div>
              )}
              {followUps.length > 0 && (
                <div className="fu-block">
                  <div className="fu-hint">Follow-up questions help you dive deeper</div>
                  <div className="fu-chips">
                    {followUps.map(([label, text]) => (
                      <button key={label} type="button" className="sugg-chip" title={text} onClick={() => pickFollowUp(text)}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="chat-input">
        <div className="ctx-row">
          <span className="ctx-chip">c-dashboard.json</span>
          <span className="ctx-chip">c-pool.md</span>
        </div>
        <div className="box">
          <button className={`mic-btn${listening ? " live" : ""}`} aria-label="Voice input" onClick={listen}>
            {MIC_ICON}
          </button>
          <textarea
            ref={taRef}
            rows={1}
            placeholder="Type what you need"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoGrow();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <span className="ci-actions">
            <button className="ci-btn" type="button" aria-label="Attach file">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <button className="ci-btn" type="button" aria-label="Send" onClick={submit}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </span>
        </div>
        <div className="chat-disclaimer">AI can make mistakes. Check important info.</div>
      </div>
    </aside>
  );
}
