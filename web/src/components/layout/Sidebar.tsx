import type { ConversationSummary } from "../../api/types";
import type { SavedItem } from "../../utils/savedItems";
import { BarsIcon, ChatBubbleIcon, CollapseIcon, PlusIcon, SaveIcon } from "../common/icons";

interface Props {
  conversations: ConversationSummary[];
  activeThreadId: string;
  collapsed: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  onSelectConversation: (threadId: string) => void;
  /** Saved shortcuts (from the workspace Save ▾ menu), shown under My Notes / Office Notebook. */
  savedItems?: SavedItem[];
}

/** Bucket saved conversations under Today / Yesterday / an absolute date, keeping
 *  the server's newest-first order. */
function groupByDay(items: ConversationSummary[]): { label: string; items: ConversationSummary[] }[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 86_400_000;
  const order: string[] = [];
  const groups = new Map<string, ConversationSummary[]>();
  for (const c of items) {
    const t = new Date(c.createdAt).getTime();
    const label =
      t >= startOfToday
        ? "Today"
        : t >= startOfToday - dayMs
          ? "Yesterday"
          : new Date(c.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    if (!groups.has(label)) {
      groups.set(label, []);
      order.push(label);
    }
    groups.get(label)!.push(c);
  }
  return order.map((label) => ({ label, items: groups.get(label)! }));
}

const labelFor = (c: ConversationSummary) => c.title ?? c.preview ?? "Untitled conversation";

/** Left column: new-chat + collapse, conversations (DB-backed), saved shortcuts. */
export function Sidebar({ conversations, activeThreadId, collapsed, onToggle, onNewChat, onSelectConversation, savedItems = [] }: Props) {
  const groups = groupByDay(conversations);
  const activeIsSaved = conversations.some((c) => c.threadKey === activeThreadId);
  const notes = savedItems.filter((s) => s.dest === "notes");
  const notebook = savedItems.filter((s) => s.dest === "notebook");

  return (
    <aside className={`col-left${collapsed ? " collapsed" : ""}`}>
      <div className="side-head">
        <button className="new-chat" onClick={onNewChat}>
          <PlusIcon size={16} stroke="currentColor" />
          <span>Start new chat</span>
        </button>
        <button
          className="side-collapse"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="ico-collapse">
            <CollapseIcon size={18} stroke="currentColor" />
          </span>
          <span className="ico-expand">
            <BarsIcon size={18} stroke="currentColor" />
          </span>
        </button>
      </div>

      <div>
        {/* A brand-new chat isn't persisted until its first turn — show it here. */}
        {!activeIsSaved && (
          <>
            <div className="side-label">Current</div>
            <a className="chat-link active">
              <ChatBubbleIcon size={16} stroke="currentColor" />
              <span>New conversation</span>
            </a>
          </>
        )}

        {groups.map((g) => (
          <div key={g.label}>
            <div className="side-label">{g.label}</div>
            {g.items.map((c) => (
              <a
                key={c.threadKey}
                className={`chat-link${c.threadKey === activeThreadId ? " active" : ""}`}
                style={{ cursor: "pointer" }}
                title={labelFor(c)}
                onClick={() => onSelectConversation(c.threadKey)}
              >
                <ChatBubbleIcon size={16} stroke="currentColor" />
                <span>{labelFor(c)}</span>
              </a>
            ))}
          </div>
        ))}

        {notes.length > 0 && (
          <div className="saved-list">
            <div className="side-label">My Notes</div>
            {notes.map((s) => (
              <a
                key={`${s.dest}-${s.threadId}`}
                className="nav-item"
                style={{ cursor: "pointer" }}
                title={s.title}
                onClick={() => onSelectConversation(s.threadId)}
              >
                <SaveIcon size={16} stroke="currentColor" />
                <span>{s.title}</span>
              </a>
            ))}
          </div>
        )}

        {notebook.length > 0 && (
          <div className="saved-list">
            <div className="side-label">Office Notebook</div>
            {notebook.map((s) => (
              <a
                key={`${s.dest}-${s.threadId}`}
                className="nav-item"
                style={{ cursor: "pointer" }}
                title={s.title}
                onClick={() => onSelectConversation(s.threadId)}
              >
                <SaveIcon size={16} stroke="currentColor" />
                <span>{s.title}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
