/**
 * Per-thread session state: the candidate currently "in focus". Lets follow-up
 * questions that don't name a candidate reuse the last one, and lets the agent
 * ask back when there's none. Keyed by AG-UI threadId; in-memory for now.
 */
const selected = new Map<string, string>();

export function getSelectedCandidate(threadId?: string): string | undefined {
  return threadId ? selected.get(threadId) : undefined;
}

export function setSelectedCandidate(threadId: string | undefined, name: string): void {
  if (threadId) selected.set(threadId, name);
}
