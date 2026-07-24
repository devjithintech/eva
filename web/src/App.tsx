import { useCallback, useEffect, useRef, useState } from "react";
import { VOICE_ENABLED } from "./config";
import { apiSend } from "./api/client";
import { fetchConversation, useConversations } from "./api/hooks";
import { addSavedItem, getSavedItems, type SaveDest } from "./utils/savedItems";
import { useAguiAgent } from "./agui/useAguiAgent";
import { useModels } from "./agui/useModels";
import { useVoice } from "./agui/useVoice";
import { ATTACH_SAMPLES, SUGGESTED_QUESTIONS } from "./constants";
import { useTheme } from "./context/ThemeContext";
import { ChatPanel } from "./components/chat/ChatPanel";
import { ColdStart } from "./components/chat/ColdStart";
import { CanvasPanel } from "./components/canvas/CanvasPanel";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";

const PERSONA = "Morgan";
const GREETING = VOICE_ENABLED ? "Tap the orb to start listening" : "Type your question below to begin";
// Spoken only when the user taps the orb to start talking — short and natural.
const SPOKEN_WELCOME = `Good morning, ${PERSONA}. What's on your mind today?`;

// Voice assistant + listener are OFF by default; the preference persists.
const VOICE_PREF_KEY = "lh.voiceEnabled";
const readVoicePref = () => {
  try {
    return localStorage.getItem(VOICE_PREF_KEY) === "true";
  } catch {
    return false;
  }
};

export function App() {
  const { vars } = useTheme();
  const agent = useAguiAgent();
  const conversations = useConversations();
  const { models, selected, setSelected } = useModels();

  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  // Forced off when the build disables voice; otherwise the persisted pref.
  const [voiceEnabled, setVoiceEnabled] = useState(() => VOICE_ENABLED && readVoicePref());
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  // The app opens on the orb landing (#/); asking a question (typed or spoken)
  // drops into the home/dashboard. The LightHouse logo returns to the landing.
  const [landing, setLanding] = useState(true);

  const setVoice = useCallback((on: boolean) => {
    if (!VOICE_ENABLED) return; // build kill-switch — voice can't be turned on
    setVoiceEnabled(on);
    try {
      localStorage.setItem(VOICE_PREF_KEY, String(on));
    } catch {
      /* storage unavailable — keep the in-memory pref */
    }
  }, []);

  const submit = useCallback(
    (text: string) => {
      agent.send(text, selected);
      setDraft("");
      setAttachments([]);
      setChatOpen(true);
      setLanding(false);
    },
    [agent, selected],
  );

  // Open a saved conversation from the sidebar: pull its transcript + rendered
  // views and load them into the agent (which points the thread at it too).
  const openConversation = useCallback(
    async (threadId: string) => {
      const { messages, events, turns } = await fetchConversation(threadId);
      agent.loadConversation(threadId, messages, events, turns);
      setChatOpen(true);
      setLanding(false);
    },
    [agent],
  );

  // Saved shortcuts (Save ▾ → My Notes / Office Notebook in the sidebar).
  const [savedItems, setSavedItems] = useState(getSavedItems);
  const saveChat = useCallback(
    (dest: SaveDest) => {
      const current = conversations.data?.find((c) => c.threadKey === agent.threadId);
      const title = current?.title ?? current?.preview ?? agent.chat.find((m) => m.role === "user")?.content ?? "Untitled conversation";
      setSavedItems(addSavedItem(agent.threadId, title.slice(0, 80), dest));
    },
    [agent.threadId, agent.chat, conversations.data],
  );

  // Conversation actions for the workspace "More" menu. New unsaved chats have
  // no DB row yet — the calls 404 and we just log; nothing user-facing breaks.
  const archiveChat = useCallback(() => {
    apiSend("POST", `/conversations/${agent.threadId}/archive`)
      .then(() => {
        agent.reset();
        conversations.refresh();
      })
      .catch((err) => console.warn("archive failed:", err));
  }, [agent, conversations]);

  const deleteChat = useCallback(() => {
    if (!window.confirm("Delete this conversation and all its messages? This cannot be undone.")) return;
    apiSend("DELETE", `/conversations/${agent.threadId}`)
      .then(() => {
        agent.reset();
        conversations.refresh();
      })
      .catch((err) => console.warn("delete failed:", err));
  }, [agent, conversations]);

  // Refresh the sidebar list whenever a run completes (a new turn may have
  // created a conversation or changed its preview).
  const refreshConversations = conversations.refresh;
  const prevStatus = useRef(agent.status);
  useEffect(() => {
    if (prevStatus.current !== "idle" && agent.status === "idle") refreshConversations();
    prevStatus.current = agent.status;
  }, [agent.status, refreshConversations]);

  const voice = useVoice({ chat: agent.chat, status: agent.status, submit });

  // Tapping the orb/mic starts voice mode. If voice is disabled, the tap enables
  // it (the user gesture browsers require before audio can play). The first time
  // it's opened on a fresh conversation, greet with a short spoken welcome.
  const greeted = useRef(false);
  const onMic = useCallback(() => {
    if (!VOICE_ENABLED) return; // voice disabled at build — mic is a no-op
    if (!voiceEnabled) setVoice(true);
    setChatOpen(true);
    const turningOn = !voice.voiceMode;
    voice.toggle();
    if (turningOn && !greeted.current && agent.isEmpty) {
      greeted.current = true;
      voice.speak(SPOKEN_WELCOME);
    }
  }, [voice, agent.isEmpty, voiceEnabled, setVoice]);

  // Turning voice off cuts any in-flight speech and exits the hands-free loop.
  useEffect(() => {
    if (voiceEnabled) return;
    voice.stopSpeaking();
    if (voice.voiceMode) voice.toggle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceEnabled]);

  const askedCount = agent.chat.filter((m) => m.role === "user").length;
  const suggestText = SUGGESTED_QUESTIONS[askedCount] ?? null;

  const addAttach = () =>
    setAttachments((a) => [...a, ATTACH_SAMPLES[a.length % ATTACH_SAMPLES.length]]);
  const removeAttach = (i: number) => setAttachments((a) => a.filter((_, idx) => idx !== i));

  // While speaking, show what the assistant is saying; while listening, the STT text.
  const transcript = voice.speaking ? voice.speakingText || "Speaking…" : voice.interim;

  return (
    <div style={{ ...vars, height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg)", color: "var(--ink)" }}>
      {landing ? (
        <ColdStart
          persona={PERSONA}
          greetingSub={GREETING}
          onMic={onMic}
          onDashboard={() => setLanding(false)}
          voiceAvailable={VOICE_ENABLED}
          listening={voice.listening}
          speaking={voice.speaking}
          onStopSpeaking={voice.stopSpeaking}
          transcript={transcript}
          suggestions={SUGGESTED_QUESTIONS}
          onPick={submit}
          voiceEnabled={voiceEnabled}
          voices={voice.voices}
          voiceKey={voice.voiceKey}
          onVoice={voice.setVoiceKey}
          draft={draft}
          onDraft={setDraft}
          onSend={() => draft.trim() && submit(draft)}
          attachments={attachments}
          onAttach={addAttach}
          onRemoveAttach={removeAttach}
          models={models}
          selectedModel={selected}
          onSelectModel={setSelected}
        />
      ) : (
      <>
      <TopBar
        voiceAvailable={VOICE_ENABLED}
        voiceEnabled={voiceEnabled}
        onToggleVoice={() => setVoice(!voiceEnabled)}
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen((v) => !v)}
        onLogoClick={() => setLanding(true)}
      />

      <div className={`home${chatOpen ? "" : " chat-collapsed"}`}>
        <Sidebar
          conversations={conversations.data ?? []}
          activeThreadId={agent.threadId}
          collapsed={sideCollapsed}
          onToggle={() => setSideCollapsed((v) => !v)}
          onNewChat={agent.reset}
          onSelectConversation={openConversation}
          savedItems={savedItems}
        />

        <CanvasPanel
          artifacts={agent.artifacts}
          busy={agent.status !== "idle"}
          error={agent.error}
          noView={agent.noView}
          onRetry={() => agent.retry(selected)}
          onFollowup={submit}
          onArchiveChat={archiveChat}
          onDeleteChat={deleteChat}
          onSaveChat={saveChat}
        />

        <ChatPanel
          chat={agent.chat}
          status={agent.status}
          hasArtifacts={agent.artifacts.length > 0}
          onClose={() => setChatOpen(false)}
          suggestText={suggestText}
          onSuggest={() => suggestText && submit(suggestText)}
          listening={voice.listening}
          speaking={voice.speaking}
          onStopSpeaking={voice.stopSpeaking}
          transcript={transcript}
          onMic={voiceEnabled ? onMic : undefined}
          draft={draft}
          onDraft={setDraft}
          onSend={() => draft.trim() && submit(draft)}
          attachments={attachments}
          onAttach={addAttach}
          onRemoveAttach={removeAttach}
          models={models}
          selectedModel={selected}
          onSelectModel={setSelected}
        />
      </div>
      </>
      )}
    </div>
  );
}
