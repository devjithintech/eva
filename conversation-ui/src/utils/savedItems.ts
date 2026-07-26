/**
 * Saved-conversation shortcuts shown in the sidebar under "My Notes" and
 * "Office Notebook" — fed by the workspace Save ▾ menu. Persisted in
 * localStorage (per browser) until a real notes backend exists.
 */
export type SaveDest = "notes" | "notebook";

export interface SavedItem {
  threadId: string;
  title: string;
  dest: SaveDest;
  savedAt: number;
}

const KEY = "lh.savedItems";

export function getSavedItems(): SavedItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as SavedItem[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Add (or re-file) a conversation under a destination. Newest first, deduped. */
export function addSavedItem(threadId: string, title: string, dest: SaveDest): SavedItem[] {
  const list = getSavedItems().filter((s) => !(s.threadId === threadId && s.dest === dest));
  list.unshift({ threadId, title, dest, savedAt: Date.now() });
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)));
  } catch {
    /* storage unavailable — keep in-memory only */
  }
  return list;
}
