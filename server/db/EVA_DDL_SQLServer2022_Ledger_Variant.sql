/* ============================================================================
   EVA — Candidate Profile Conversation Platform
   SQL Server 2022 (16.x) — Ledger Variant of Appendix A DDL

   Purpose: strengthen the immutability guarantee of the append-only audit
   surfaces by moving them from "insert-only by permission" (DENY UPDATE,DELETE)
   to append-only LEDGER tables, which the engine enforces against ALL users
   (including sysadmin) and can cryptographically attest as tamper-evident.

   Baseline reminder: the original Appendix A already targets SQL Server 2016
   SP1+, so it runs on 2022 unchanged. Nothing below is required for the design
   to work on 2022 — it is a 2022-only hardening option (Ledger arrived in 2022).

   Applies to: SQL Server 2022 (16.x), all editions.

   !! DEPLOY TARGET NOTE (added on hand-off): Ledger is a SQL Server 2022
   !! feature. This script will NOT run on SQL Server 2019 or earlier
   !! (including the local (localdb)\MSSQLLocalDB 15.x dev instance). Deploy
   !! only against a genuine 2022 (16.x) instance. This file also depends on
   !! Appendix A objects (dbo.Messages etc.) that are NOT in this file.
   ============================================================================ */


/* ----------------------------------------------------------------------------
   0. PREREQUISITES
   ----------------------------------------------------------------------------
   - The principal creating ledger tables needs the ENABLE LEDGER permission.
   - Ledger tables CANNOT be converted from existing tables. They must be
     CREATEd as ledger tables. This is a fresh-deploy / migrate-and-copy change,
     not an ALTER. Plan a data copy if these tables already hold rows.
   - Append-only ledger tables add two GENERATED ALWAYS columns
     (ledger_start_transaction_id, ledger_start_sequence_number). Declared HIDDEN
     below so the canonical reads in A.10 do not change.
---------------------------------------------------------------------------- */


/* ----------------------------------------------------------------------------
   1. dbo.Messages  —  UNCHANGED (keep exactly as Appendix A.4)
   ----------------------------------------------------------------------------
   Messages carries the FULL-TEXT INDEX on `content` (A.9). Ledger tables cannot
   have full-text indexes, so Messages CANNOT become a ledger table without
   losing FTS. Keep A.4 as written: append-only enforced by
        DENY UPDATE, DELETE ON dbo.Messages TO app_role;
   and full-text searchable. No change.

   (If cryptographic tamper-evidence on the transcript itself later becomes a
   hard requirement, the only path is to split: keep an immutable ledger copy of
   the message text WITHOUT FTS, and a separate FTS-only projection. That doubles
   writes and storage — evaluate against the recordkeeping requirement before
   taking it on. Not recommended unless a regulator specifically requires it.)
---------------------------------------------------------------------------- */


/* ----------------------------------------------------------------------------
   2. dbo.TurnRetrieval  —  APPEND-ONLY LEDGER  (RECOMMENDED)
   ----------------------------------------------------------------------------
   This is the clean win. TurnRetrieval is the "so we can explain" record: the
   evidence of which profile slice each answer ran against, plus (per B.10) the
   per-turn token accounting. It has no full-text index and no partition-switch
   retention, so nothing about it conflicts with Ledger. Making it append-only
   ledger means the "why did the model say X" trail is provably untampered.

   Token-accounting columns from Appendix B.10 are folded in here; they are all
   written once at answer time (insert), which is compatible with append-only.
---------------------------------------------------------------------------- */
CREATE TABLE dbo.TurnRetrieval (
    conversation_id  BIGINT         NOT NULL,
    sequence         BIGINT         NOT NULL,          -- the assistant row this explains

    -- which facets/paths became context, + which component was chosen and why
    retrieval_json   NVARCHAR(MAX)  NOT NULL
        CONSTRAINT CK_Turn_IsJson CHECK (ISJSON(retrieval_json) = 1),
    facet_paths      NVARCHAR(1000) NULL,   -- e.g. '$.fund.history|$.team[*].education'

    -- the profile version this answer ran against (pairs with FOR SYSTEM_TIME AS OF)
    profile_as_of    DATETIME2(7)   NOT NULL,

    -- Appendix B.10: cost is as explainable as the answer (all captured at insert)
    model_id           VARCHAR(32)  NULL,
    input_tokens       INT          NULL,
    output_tokens      INT          NULL,
    cached_read_tokens INT          NULL,
    est_tokens         INT          NULL,
    facet_bytes        INT          NULL,
    provenance_stripped BIT         NULL,
    history_mode       VARCHAR(16)  NULL,   -- 'verbatim' | 'summary'
    latency_ms         INT          NULL,

    captured_at      DATETIME2(3)   NOT NULL CONSTRAINT DF_Turn_Captured DEFAULT (SYSUTCDATETIME()),

    -- Ledger metadata (HIDDEN so A.10 SELECT lists are unaffected).
    -- Omit these two lines to let SQL Server add them automatically (non-hidden).
    ledger_start_transaction_id  BIGINT GENERATED ALWAYS AS TRANSACTION_ID  START HIDDEN NOT NULL,
    ledger_start_sequence_number BIGINT GENERATED ALWAYS AS SEQUENCE_NUMBER START HIDDEN NOT NULL,

    CONSTRAINT PK_TurnRetrieval PRIMARY KEY CLUSTERED (conversation_id, sequence),
    CONSTRAINT FK_Turn_Msg FOREIGN KEY (conversation_id, sequence)
        REFERENCES dbo.Messages(conversation_id, sequence)
)
WITH (LEDGER = ON (APPEND_ONLY = ON, LEDGER_VIEW = dbo.TurnRetrieval_Ledger));
-- NOTE: DENY UPDATE, DELETE is now redundant here — the engine blocks both for
-- everyone, including sysadmin. You may keep it as belt-and-suspenders, but it
-- no longer carries the guarantee; the ledger does.


/* ----------------------------------------------------------------------------
   3. dbo.AgUiEvents  —  LEDGER OPTION  (READ THE CAVEAT FIRST)
   ----------------------------------------------------------------------------
   You asked for this as append-only ledger too. It is possible, but there is a
   direct conflict with the A.6 retention design that you should decide on:

     * Ledger tables do NOT support SWITCH IN/OUT partition. The A.6 retention
       plan ("90-day fidelity, then drop events but keep payloads" via
       SWITCH PARTITION + MERGE RANGE) becomes impossible.
     * Immutability is the whole point of ledger — you cannot prune old event
       rows at all. Per B.0, the event log is the highest-volume table in the
       system ("event logs will dwarf everything"). Making it permanently
       immutable is a real, compounding storage commitment.

   RECOMMENDATION: keep dbo.AgUiEvents exactly as Appendix A.6 (append-only via
   DENY + partitioned for SWITCH-based retention). Use TurnRetrieval (section 2)
   as your tamper-evident audit spine — it is the record that matters for
   due-diligence integrity. Only take the ledger version below if you are
   willing to give up partition-switch retention and keep every event forever.

   If you do want it: this variant is NON-partitioned (Ledger + partition SWITCH
   don't mix, and without SWITCH the partitioning buys you little here).
---------------------------------------------------------------------------- */
-- CREATE TABLE dbo.AgUiEvents (
--     conversation_id BIGINT        NOT NULL,
--     sequence        BIGINT        NOT NULL,          -- the turn
--     event_sequence  BIGINT        NOT NULL,          -- order WITHIN the turn
--     event_type_id   TINYINT       NOT NULL CONSTRAINT FK_Ev_Type
--                       REFERENCES dbo.AgUiEventType(event_type_id),
--     payload_json    NVARCHAR(MAX) NOT NULL
--         CONSTRAINT CK_Ev_IsJson CHECK (ISJSON(payload_json) = 1),
--     ui_slot         NVARCHAR(64)  NULL,
--     occurred_at     DATETIME2(7)  NOT NULL,
--     ledger_start_transaction_id  BIGINT GENERATED ALWAYS AS TRANSACTION_ID  START HIDDEN NOT NULL,
--     ledger_start_sequence_number BIGINT GENERATED ALWAYS AS SEQUENCE_NUMBER START HIDDEN NOT NULL,
--     CONSTRAINT PK_AgUiEvents PRIMARY KEY CLUSTERED
--         (conversation_id, sequence, event_sequence, occurred_at)
-- )
-- WITH (LEDGER = ON (APPEND_ONLY = ON, LEDGER_VIEW = dbo.AgUiEvents_Ledger));


/* ----------------------------------------------------------------------------
   4. TAMPER-EVIDENCE: DIGEST STORAGE + VERIFICATION
   ----------------------------------------------------------------------------
   Ledger tables only deliver an external, provable guarantee once the database
   digest is stored somewhere the DBA cannot silently rewrite.

   Option A (recommended for a regulated firm): automatic digest storage to an
   Azure Storage immutable (WORM) blob:

       ALTER DATABASE [EVA]
         SET LEDGER_DIGEST_STORAGE_ENDPOINT =
             N'https://<account>.blob.core.windows.net/<container>';

   Option B (fully on-prem): generate a digest on a schedule and persist it to a
   trusted, append-only location outside this database:

       EXEC sys.sp_generate_database_ledger_digest;   -- returns block # + hash

   Verify the whole ledger at any time (fails loudly if any row was altered):

       EXEC sys.sp_verify_database_ledger @digest_json;   -- pass stored digest(s)

   Per-table forensic view of who inserted what, in transaction order:

       SELECT * FROM dbo.TurnRetrieval_Ledger ORDER BY ledger_sequence_number;
---------------------------------------------------------------------------- */


/* ----------------------------------------------------------------------------
   5. ROW-LEVEL SECURITY  —  no change needed
   ----------------------------------------------------------------------------
   The A.8 security policy filter predicate on dbo.TurnRetrieval continues to
   apply to the ledger table unchanged. Ledger governs immutability; RLS governs
   visibility — they are orthogonal and compose cleanly. If you migrate
   TurnRetrieval via drop-and-recreate, re-add its predicate to the policy after
   recreating the table.
---------------------------------------------------------------------------- */


/* ----------------------------------------------------------------------------
   6. dbo.ConversationAudit  —  APPEND-ONLY LEDGER  (tamper-evident audit trail)
   ----------------------------------------------------------------------------
   Records who did what to each conversation: created, viewed, appended, shared,
   revoked. Built as an append-only LEDGER table so the trail is insert-only and
   cryptographically tamper-evident — even a DBA cannot silently rewrite it,
   which is the posture a fund's recordkeeping wants.

   Prerequisite: the creating principal needs the ENABLE LEDGER permission.
   Kept FK-free by design so the trail survives row deletes elsewhere.

   2019 fallback: the plain-table + DENY UPDATE,DELETE version (no ledger cols,
   no WITH (LEDGER = ON ...)) lives in eva_local_scaffold_2019.sql.
---------------------------------------------------------------------------- */
CREATE TABLE dbo.ConversationAudit (
    audit_id              BIGINT IDENTITY(1,1) NOT NULL,
    conversation_id       BIGINT       NOT NULL,
    actor_user_id         BIGINT       NOT NULL,   -- who performed the action
    action                VARCHAR(24)  NOT NULL    -- created | viewed | appended | shared | revoked
        CONSTRAINT CK_Audit_Action
        CHECK (action IN ('created','viewed','appended','shared','revoked')),
    target_principal_id   BIGINT       NULL,        -- for shared/revoked: who was granted
    target_principal_type VARCHAR(8)   NULL         -- 'user' | 'group'
        CONSTRAINT CK_Audit_PType
        CHECK (target_principal_type IS NULL OR target_principal_type IN ('user','group')),
    permission            VARCHAR(16)  NULL,         -- for shared: read | read_append
    detail_json           NVARCHAR(MAX) NULL
        CONSTRAINT CK_Audit_IsJson
        CHECK (detail_json IS NULL OR ISJSON(detail_json) = 1),
    occurred_at           DATETIME2(3) NOT NULL
        CONSTRAINT DF_Audit_At DEFAULT (SYSUTCDATETIME()),

    -- Ledger metadata (HIDDEN so ordinary SELECTs are unaffected).
    ledger_start_transaction_id  BIGINT GENERATED ALWAYS AS TRANSACTION_ID  START HIDDEN NOT NULL,
    ledger_start_sequence_number BIGINT GENERATED ALWAYS AS SEQUENCE_NUMBER START HIDDEN NOT NULL,

    -- Clustered on (conversation_id, audit_id) so per-thread audit reads are a
    -- single sequential range scan.
    CONSTRAINT PK_ConversationAudit PRIMARY KEY CLUSTERED (conversation_id, audit_id)
)
WITH (LEDGER = ON (APPEND_ONLY = ON, LEDGER_VIEW = dbo.ConversationAudit_Ledger));
-- NOTE: DENY UPDATE, DELETE is redundant here — the engine blocks both for
-- everyone, including sysadmin. The ledger carries the guarantee.
