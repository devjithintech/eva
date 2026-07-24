/**
 * Conversation persistence over the SQL Server connector (getPool()).
 *
 * Write path: ensureConversation() get-or-creates the Conversations row for an
 * AG-UI threadId; appendMessage() atomically allocates the per-thread sequence
 * (via the Conversations.next_sequence allocator) and inserts a Messages row.
 * Read path: loadTurns() rebuilds the LLM context from stored prose;
 * listConversations()/getMessagesByThread() back the /api read endpoints.
 *
 * Candidates remain in data.json — nothing here touches candidate data.
 */
import sql from "mssql";
import { getPool } from "./sqlServer.js";
import { AGUI_EVENT_TYPES, type RecordedEvent } from "./eventTypes.js";
import type { ChatTurn } from "../llm/types.js";

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface StoredMessage {
  sequence: number;
  role: MessageRole;
  content: string | null;
  createdAt: Date;
}

export interface ConversationSummary {
  conversationId: number;
  threadKey: string;
  title: string | null;
  /** First user message — a human-readable label for the sidebar. */
  preview: string | null;
  messageCount: number;
  createdAt: Date;
}

/** Get-or-create the Conversations row for an AG-UI thread; returns its id. */
export async function ensureConversation(threadKey: string): Promise<number> {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("threadKey", sql.NVarChar(64), threadKey)
    .query<{ conversation_id: number }>(`
      DECLARE @id BIGINT =
        (SELECT TOP 1 conversation_id FROM dbo.Conversations WHERE thread_key = @threadKey ORDER BY conversation_id);
      IF @id IS NULL
      BEGIN
        INSERT INTO dbo.Conversations (thread_key) VALUES (@threadKey);
        SET @id = SCOPE_IDENTITY();
      END
      SELECT @id AS conversation_id;
    `);
  return Number(r.recordset[0].conversation_id);
}

/**
 * Append a message, atomically allocating the next per-thread sequence in the
 * same UPDATE (reads the old value into @seq, then increments). Returns the
 * sequence assigned.
 */
export async function appendMessage(
  conversationId: number,
  role: MessageRole,
  content: string | null,
): Promise<number> {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("id", sql.BigInt, conversationId)
    .input("role", sql.NVarChar(16), role)
    .input("content", sql.NVarChar(sql.MAX), content)
    .query<{ seq: number }>(`
      DECLARE @seq BIGINT;
      UPDATE dbo.Conversations
        SET @seq = next_sequence, next_sequence = next_sequence + 1
        WHERE conversation_id = @id;
      INSERT INTO dbo.Messages (conversation_id, sequence, role, content)
        VALUES (@id, @seq, @role, @content);
      SELECT @seq AS seq;
    `);
  return Number(r.recordset[0].seq);
}

/** Allocate the next per-thread sequence without inserting a message (used to
 *  anchor a turn's AG-UI events when the assistant produced no spoken text). */
export async function allocateSequence(conversationId: number): Promise<number> {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("id", sql.BigInt, conversationId)
    .query<{ seq: number }>(`
      DECLARE @seq BIGINT;
      UPDATE dbo.Conversations
        SET @seq = next_sequence, next_sequence = next_sequence + 1
        WHERE conversation_id = @id;
      SELECT @seq AS seq;
    `);
  return Number(r.recordset[0].seq);
}

/** Seed dbo.AgUiEventType (FK target for AgUiEvents) once per process. */
let eventTypesSeeded: Promise<void> | null = null;
function ensureEventTypesSeeded(): Promise<void> {
  if (!eventTypesSeeded) {
    eventTypesSeeded = (async () => {
      const pool = await getPool();
      const rows = Object.entries(AGUI_EVENT_TYPES)
        .map(([name, id]) => `(${id}, '${name}')`)
        .join(", ");
      await pool.request().query(`
        MERGE dbo.AgUiEventType AS tgt
        USING (VALUES ${rows}) AS src(event_type_id, name)
          ON tgt.event_type_id = src.event_type_id
        WHEN NOT MATCHED BY TARGET THEN
          INSERT (event_type_id, name) VALUES (src.event_type_id, src.name);
      `);
    })().catch((err) => {
      eventTypesSeeded = null; // let a later run retry
      throw err;
    });
  }
  return eventTypesSeeded;
}

/** Persist one turn's AG-UI events (structural events + artifact payloads),
 *  ordered by event_sequence, all under the given turn sequence. */
export async function insertEvents(
  conversationId: number,
  sequence: number,
  events: RecordedEvent[],
): Promise<void> {
  if (!events.length) return;
  await ensureEventTypesSeeded();
  const pool = await getPool();
  // One INSERT per event: the msnodesqlv8 driver mis-binds a named parameter
  // reused across multiple VALUES tuples, so we avoid reuse entirely.
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    await pool
      .request()
      .input("id", sql.BigInt, conversationId)
      .input("seq", sql.BigInt, sequence)
      .input("es", sql.BigInt, i)
      .input("t", sql.TinyInt, AGUI_EVENT_TYPES[e.name])
      .input("slot", sql.NVarChar(64), e.uiSlot ?? null)
      .input("p", sql.NVarChar(sql.MAX), JSON.stringify(e.payload ?? {}))
      .query(`
        INSERT INTO dbo.AgUiEvents
          (conversation_id, sequence, event_sequence, event_type_id, payload_json, ui_slot, occurred_at)
        VALUES (@id, @seq, @es, @t, @p, @slot, SYSUTCDATETIME());
      `);
  }
}

/** Persist per-turn cost/latency to TurnRetrieval (B.10). Requires the assistant
 *  Messages row at this sequence to already exist (FK). Best-effort caller. */
export async function insertTurnRetrieval(
  conversationId: number,
  sequence: number,
  m: { modelId?: string; inputTokens?: number; outputTokens?: number; cachedReadTokens?: number; latencyMs?: number; retrievalJson?: string },
): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input("id", sql.BigInt, conversationId)
    .input("seq", sql.BigInt, sequence)
    .input("rj", sql.NVarChar(sql.MAX), m.retrievalJson ?? "{}")
    .input("model", sql.VarChar(32), m.modelId ?? null)
    .input("intok", sql.Int, m.inputTokens ?? null)
    .input("outtok", sql.Int, m.outputTokens ?? null)
    .input("cache", sql.Int, m.cachedReadTokens ?? null)
    .input("lat", sql.Int, m.latencyMs ?? null)
    .query(`
      INSERT INTO dbo.TurnRetrieval
        (conversation_id, sequence, retrieval_json, profile_as_of, model_id,
         input_tokens, output_tokens, cached_read_tokens, latency_ms, captured_at)
      VALUES (@id, @seq, @rj, SYSUTCDATETIME(), @model, @intok, @outtok, @cache, @lat, SYSUTCDATETIME());
    `);
}

export interface TurnMeta {
  sequence: number;
  tokens: number | null;
  latencyMs: number | null;
  modelId: string | null;
}

/** Per-turn tokens/latency for a thread — used to restore card meta on load. */
export async function getTurnMetaByThread(threadKey: string): Promise<TurnMeta[]> {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("threadKey", sql.NVarChar(64), threadKey)
    .query<{ sequence: number; tokens: number | null; latency_ms: number | null; model_id: string | null }>(`
      SELECT t.sequence,
             CASE WHEN t.input_tokens IS NULL AND t.output_tokens IS NULL THEN NULL
                  ELSE ISNULL(t.input_tokens,0) + ISNULL(t.output_tokens,0) END AS tokens,
             t.latency_ms, t.model_id
      FROM dbo.TurnRetrieval t
      JOIN dbo.Conversations c ON c.conversation_id = t.conversation_id
      WHERE c.thread_key = @threadKey;
    `);
  return r.recordset.map((row) => ({
    sequence: Number(row.sequence),
    tokens: row.tokens == null ? null : Number(row.tokens),
    latencyMs: row.latency_ms == null ? null : Number(row.latency_ms),
    modelId: row.model_id,
  }));
}

/** Prior turns for the LLM context — user/assistant prose only, in order. */
export async function loadTurns(conversationId: number): Promise<ChatTurn[]> {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("id", sql.BigInt, conversationId)
    .query<{ role: MessageRole; content: string }>(`
      SELECT role, content FROM dbo.Messages
      WHERE conversation_id = @id
        AND role IN ('user','assistant')
        AND content IS NOT NULL AND LEN(content) > 0
      ORDER BY sequence;
    `);
  return r.recordset
    .filter((row) => row.role === "user" || row.role === "assistant")
    .map((row) => ({ role: row.role as ChatTurn["role"], content: row.content }));
}

/** All conversations, newest first — for the read API. */
export async function listConversations(): Promise<ConversationSummary[]> {
  const pool = await getPool();
  const r = await pool.request().query<{
    conversation_id: number;
    thread_key: string;
    title: string | null;
    preview: string | null;
    message_count: number;
    created_at: Date;
  }>(`
      SELECT c.conversation_id, c.thread_key, c.title, c.created_at,
             (SELECT COUNT(*) FROM dbo.Messages m WHERE m.conversation_id = c.conversation_id) AS message_count,
             (SELECT TOP 1 m2.content FROM dbo.Messages m2
                WHERE m2.conversation_id = c.conversation_id AND m2.role = 'user'
                ORDER BY m2.sequence) AS preview
      FROM dbo.Conversations c
      WHERE c.archived_at IS NULL
        AND EXISTS (SELECT 1 FROM dbo.Messages m3 WHERE m3.conversation_id = c.conversation_id)
      ORDER BY c.conversation_id DESC;
    `);
  return r.recordset.map((row) => ({
    conversationId: Number(row.conversation_id),
    threadKey: row.thread_key,
    title: row.title,
    preview: row.preview,
    messageCount: Number(row.message_count),
    createdAt: row.created_at,
  }));
}

/** Rename a conversation (sets Conversations.title). Returns true if it existed. */
export async function renameConversation(threadKey: string, title: string): Promise<boolean> {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("threadKey", sql.NVarChar(64), threadKey)
    .input("title", sql.NVarChar(200), title)
    .query("UPDATE dbo.Conversations SET title = @title WHERE thread_key = @threadKey;");
  return (r.rowsAffected[0] ?? 0) > 0;
}

/** Soft-archive a conversation — hidden from lists, data retained. */
export async function archiveConversation(threadKey: string): Promise<boolean> {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("threadKey", sql.NVarChar(64), threadKey)
    .query("UPDATE dbo.Conversations SET archived_at = SYSUTCDATETIME() WHERE thread_key = @threadKey AND archived_at IS NULL;");
  return (r.rowsAffected[0] ?? 0) > 0;
}

/** Hard-delete a conversation and everything under it (FK order). */
export async function deleteConversation(threadKey: string): Promise<boolean> {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("threadKey", sql.NVarChar(64), threadKey)
    .query(`
      DECLARE @id BIGINT = (SELECT TOP 1 conversation_id FROM dbo.Conversations WHERE thread_key = @threadKey);
      IF @id IS NOT NULL
      BEGIN
        DELETE FROM dbo.TurnRetrieval WHERE conversation_id = @id;
        DELETE FROM dbo.AgUiEvents WHERE conversation_id = @id;
        DELETE FROM dbo.Messages WHERE conversation_id = @id;
        DELETE FROM dbo.Conversations WHERE conversation_id = @id;
      END
      SELECT CASE WHEN @id IS NULL THEN 0 ELSE 1 END AS existed;
    `);
  return Number(r.recordset[0]?.existed ?? 0) === 1;
}

export interface StoredEvent {
  sequence: number;
  eventSequence: number;
  type: string;
  uiSlot: string | null;
  payload: unknown;
  occurredAt: Date;
}

/** Stored AG-UI events for one thread (type name resolved), in order. */
export async function getEventsByThread(threadKey: string): Promise<StoredEvent[]> {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("threadKey", sql.NVarChar(64), threadKey)
    .query<{ sequence: number; event_sequence: number; type: string; ui_slot: string | null; payload_json: string; occurred_at: Date }>(`
      SELECT e.sequence, e.event_sequence, t.name AS type, e.ui_slot, e.payload_json, e.occurred_at
      FROM dbo.AgUiEvents e
      JOIN dbo.Conversations c ON c.conversation_id = e.conversation_id
      JOIN dbo.AgUiEventType t ON t.event_type_id = e.event_type_id
      WHERE c.thread_key = @threadKey
      ORDER BY e.sequence, e.event_sequence;
    `);
  return r.recordset.map((row) => ({
    sequence: Number(row.sequence),
    eventSequence: Number(row.event_sequence),
    type: row.type,
    uiSlot: row.ui_slot,
    payload: safeJson(row.payload_json),
    occurredAt: row.occurred_at,
  }));
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/** Full message history for one thread — for the read API. */
export async function getMessagesByThread(threadKey: string): Promise<StoredMessage[]> {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("threadKey", sql.NVarChar(64), threadKey)
    .query<{ sequence: number; role: MessageRole; content: string | null; created_at: Date }>(`
      SELECT m.sequence, m.role, m.content, m.created_at
      FROM dbo.Messages m
      JOIN dbo.Conversations c ON c.conversation_id = m.conversation_id
      WHERE c.thread_key = @threadKey
      ORDER BY m.sequence;
    `);
  return r.recordset.map((row) => ({
    sequence: Number(row.sequence),
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  }));
}
