/**
 * BFF response types — mirror `server/src/bff/types.ts` + the Renderer API
 * catalog. Backed by `server/data/data.json`. Keep in sync with the server.
 */

/** Lightweight candidate entry for lists. */
export interface CandidateSummary {
  id: string;
  name: string;
  pmId: string | null;
  fundName: string | null;
  flagCount: number;
}

/** Full candidate profile — loose; ~20 analysis sections whose shapes evolve. */
export interface CandidateRecord {
  id: string;
  name: string;
  pm_id?: string;
  subject_fund?: { fund_name?: string; [key: string]: unknown };
  analyst_flags?: unknown[];
  [key: string]: unknown;
}

/** One row of the candidate comparison matrix. Metrics are nullable. */
export interface MatrixRow {
  name: string;
  cagr: number | null;
  sharpe: number | null;
  alpha: number | null;
  dd: number | null;
  you?: boolean;
}

/** Candidate comparison matrix payload (same shape as the candidate_pool artifact). */
export interface CandidateMatrix {
  title: string;
  rows: MatrixRow[];
}

/** One plotted candidate on the opportunity scatter. */
export interface OppPoint {
  name: string;
  cagr: number;
  dd: number;
  stage: "scored" | "shortlisted" | "interview";
}

/** Opportunity map payload (mirrors the opportunity_map artifact). */
export interface OpportunityMapData {
  title: string;
  funnel: { scored: number; shortlisted: number; interview: number };
  pool: { candidates: number; funds: number };
  points: OppPoint[];
}

/** A renderer in the catalog. */
export interface Renderer {
  label: string;
  description: string;
}

/** A saved custom peer set. */
export interface PeerSet {
  id: string;
  name: string;
  members: string[];
}

/** A persisted conversation, for the sidebar list. */
export interface ConversationSummary {
  conversationId: number;
  threadKey: string;
  title: string | null;
  preview: string | null;
  messageCount: number;
  createdAt: string;
}

/** One stored message in a conversation transcript. */
export interface StoredMessage {
  sequence: number;
  role: "user" | "assistant" | "system" | "tool";
  content: string | null;
  createdAt: string;
}

/** One stored AG-UI event (rendered UI + payload) in a conversation. */
export interface StoredEvent {
  sequence: number;
  eventSequence: number;
  type: string;
  uiSlot: string | null;
  payload: unknown;
  occurredAt: string;
}

/** Per-turn cost/latency (from TurnRetrieval) — restores card meta on load. */
export interface TurnMeta {
  sequence: number;
  tokens: number | null;
  latencyMs: number | null;
  modelId: string | null;
}
