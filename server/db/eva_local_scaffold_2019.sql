/* ============================================================================
   EVA — INFERRED DEV SCAFFOLD for local (localdb)\MSSQLLocalDB, database [eva]
   SQL Server 2019 (15.x) LocalDB compatible.

   THIS IS NOT the client deliverable. Columns are inferred from the design doc
   (section 1 + the DDL fragments provided). Reconcile against the real
   Appendix A. Adaptations for LocalDB:
     - Ledger              : omitted (2022 only)
     - Full-Text Search    : omitted (not supported on LocalDB)
     - RLS security policy : omitted (predicate design not provided)
     - Candidates computed : alpha/strategy as PLAIN cols (Gotcha 1 fallback)
     - AgUiEvents          : non-partitioned (A.6 partitioning omitted for dev)
   ============================================================================ */
USE [eva];
GO

/* ---- idempotent teardown (reverse dependency order) --------------------- */
IF OBJECT_ID('dbo.ConversationAudit','U') IS NOT NULL DROP TABLE dbo.ConversationAudit;
IF OBJECT_ID('dbo.AgUiEvents','U')        IS NOT NULL DROP TABLE dbo.AgUiEvents;
IF OBJECT_ID('dbo.ConversationShares','U')IS NOT NULL DROP TABLE dbo.ConversationShares;
IF OBJECT_ID('dbo.TurnRetrieval','U')     IS NOT NULL DROP TABLE dbo.TurnRetrieval;
IF OBJECT_ID('dbo.Messages','U')          IS NOT NULL DROP TABLE dbo.Messages;
GO
IF OBJECT_ID('dbo.Conversations','U') IS NOT NULL
BEGIN
    IF OBJECTPROPERTY(OBJECT_ID('dbo.Conversations'),'TableTemporalType') = 2
        ALTER TABLE dbo.Conversations SET (SYSTEM_VERSIONING = OFF);
    DROP TABLE dbo.Conversations;
END
IF OBJECT_ID('dbo.Conversations_History','U') IS NOT NULL DROP TABLE dbo.Conversations_History;
GO
IF OBJECT_ID('dbo.Candidates','U') IS NOT NULL
BEGIN
    IF OBJECTPROPERTY(OBJECT_ID('dbo.Candidates'),'TableTemporalType') = 2
        ALTER TABLE dbo.Candidates SET (SYSTEM_VERSIONING = OFF);
    DROP TABLE dbo.Candidates;
END
IF OBJECT_ID('dbo.Candidates_History','U') IS NOT NULL DROP TABLE dbo.Candidates_History;
GO
IF OBJECT_ID('dbo.Users','U')          IS NOT NULL DROP TABLE dbo.Users;
IF OBJECT_ID('dbo.AgUiEventType','U')  IS NOT NULL DROP TABLE dbo.AgUiEventType;
GO

/* ---- app role for append-only DENY grants ------------------------------- */
IF DATABASE_PRINCIPAL_ID('app_role') IS NULL EXEC('CREATE ROLE app_role');
GO

/* ---- lookup: AG-UI event types (from the A.6 fragment) ------------------ */
CREATE TABLE dbo.AgUiEventType (
    event_type_id TINYINT      NOT NULL CONSTRAINT PK_AgUiEventType PRIMARY KEY,
    name          NVARCHAR(64) NOT NULL CONSTRAINT UQ_AgUiEventType_Name UNIQUE
);
GO

/* ---- Users (INFERRED columns) ------------------------------------------- */
CREATE TABLE dbo.Users (
    user_id      BIGINT        IDENTITY(1,1) NOT NULL CONSTRAINT PK_Users PRIMARY KEY,
    email        NVARCHAR(256) NOT NULL CONSTRAINT UQ_Users_Email UNIQUE,
    display_name NVARCHAR(128) NULL,
    role         NVARCHAR(32)  NOT NULL
        CONSTRAINT CK_Users_Role CHECK (role IN ('analyst','ic','admin')),
    created_at   DATETIME2(3)  NOT NULL CONSTRAINT DF_Users_Created DEFAULT (SYSUTCDATETIME())
);
GO

/* ---- Candidates: JSON profile + temporal (INFERRED cols; computed->plain) */
CREATE TABLE dbo.Candidates (
    pm_id        VARCHAR(32)   NOT NULL CONSTRAINT PK_Candidates PRIMARY KEY,
    name         NVARCHAR(200) NOT NULL,
    profile_json NVARCHAR(MAX) NOT NULL
        CONSTRAINT CK_Candidates_IsJson CHECK (ISJSON(profile_json) = 1),
    alpha        DECIMAL(9,4)  NULL,   -- Gotcha 1: loader-written, not AS...PERSISTED
    strategy     NVARCHAR(64)  NULL,   -- Gotcha 1: loader-written
    valid_from   DATETIME2(7)  GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    valid_to     DATETIME2(7)  GENERATED ALWAYS AS ROW END   HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (valid_from, valid_to)
) WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.Candidates_History));
GO

/* ---- Conversations: temporal + IDENTITY + per-thread seq allocator ------ */
CREATE TABLE dbo.Conversations (
    conversation_id BIGINT       IDENTITY(1,1) NOT NULL CONSTRAINT PK_Conversations PRIMARY KEY,
    thread_key      NVARCHAR(64) NOT NULL,
    user_id         BIGINT       NULL CONSTRAINT FK_Conv_User REFERENCES dbo.Users(user_id),
    candidate_pm_id VARCHAR(32)  NULL CONSTRAINT FK_Conv_Cand REFERENCES dbo.Candidates(pm_id),
    title           NVARCHAR(200) NULL,
    next_sequence   BIGINT       NOT NULL CONSTRAINT DF_Conv_NextSeq DEFAULT (1),  -- UPDATE..OUTPUT allocator
    archived_at     DATETIME2(3) NULL,                                             -- soft archive (hidden from lists)
    created_at      DATETIME2(3) NOT NULL CONSTRAINT DF_Conv_Created DEFAULT (SYSUTCDATETIME()),
    valid_from      DATETIME2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    valid_to        DATETIME2(7) GENERATED ALWAYS AS ROW END   HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (valid_from, valid_to)
) WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.Conversations_History));
GO

/* ---- Messages: clustered PK (conversation_id, sequence); NO FTS locally -- */
CREATE TABLE dbo.Messages (
    conversation_id BIGINT        NOT NULL,
    sequence        BIGINT        NOT NULL,
    role            NVARCHAR(16)  NOT NULL
        CONSTRAINT CK_Msg_Role CHECK (role IN ('user','assistant','system','tool')),
    content         NVARCHAR(MAX) NULL,
    created_at      DATETIME2(3)  NOT NULL CONSTRAINT DF_Msg_Created DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Messages PRIMARY KEY CLUSTERED (conversation_id, sequence),
    CONSTRAINT FK_Msg_Conv FOREIGN KEY (conversation_id) REFERENCES dbo.Conversations(conversation_id)
);
GO
DENY UPDATE, DELETE ON dbo.Messages TO app_role;   -- append-only by permission
-- NOTE: A.9 Full-Text index on content OMITTED — LocalDB has no FTS.
GO

/* ---- TurnRetrieval: recreated WITH the real FK to Messages -------------- */
CREATE TABLE dbo.TurnRetrieval (
    conversation_id  BIGINT         NOT NULL,
    sequence         BIGINT         NOT NULL,
    retrieval_json   NVARCHAR(MAX)  NOT NULL
        CONSTRAINT CK_Turn_IsJson CHECK (ISJSON(retrieval_json) = 1),
    facet_paths      NVARCHAR(1000) NULL,
    profile_as_of    DATETIME2(7)   NOT NULL,
    model_id           VARCHAR(32)  NULL,
    input_tokens       INT          NULL,
    output_tokens      INT          NULL,
    cached_read_tokens INT          NULL,
    est_tokens         INT          NULL,
    facet_bytes        INT          NULL,
    provenance_stripped BIT         NULL,
    history_mode       VARCHAR(16)  NULL,
    latency_ms         INT          NULL,
    captured_at      DATETIME2(3)   NOT NULL CONSTRAINT DF_Turn_Captured DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_TurnRetrieval PRIMARY KEY CLUSTERED (conversation_id, sequence),
    CONSTRAINT FK_Turn_Msg FOREIGN KEY (conversation_id, sequence)
        REFERENCES dbo.Messages(conversation_id, sequence)
);
GO
DENY UPDATE, DELETE ON dbo.TurnRetrieval TO app_role;  -- Ledger's stand-in on 2019
GO

/* ---- ConversationShares: thin key table + covering index ---------------- */
CREATE TABLE dbo.ConversationShares (
    share_id            BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ConversationShares PRIMARY KEY,
    conversation_id     BIGINT NOT NULL CONSTRAINT FK_Share_Conv REFERENCES dbo.Conversations(conversation_id),
    shared_with_user_id BIGINT NOT NULL CONSTRAINT FK_Share_User REFERENCES dbo.Users(user_id),
    created_at          DATETIME2(3) NOT NULL CONSTRAINT DF_Share_Created DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT UQ_Share UNIQUE (conversation_id, shared_with_user_id)
);
GO
CREATE INDEX IX_Share_User ON dbo.ConversationShares(shared_with_user_id) INCLUDE (conversation_id);
GO

/* ---- AgUiEvents: non-partitioned dev scaffold (A.6 partitioning omitted) - */
CREATE TABLE dbo.AgUiEvents (
    conversation_id BIGINT        NOT NULL,
    sequence        BIGINT        NOT NULL,
    event_sequence  BIGINT        NOT NULL,
    event_type_id   TINYINT       NOT NULL
        CONSTRAINT FK_Ev_Type REFERENCES dbo.AgUiEventType(event_type_id),
    payload_json    NVARCHAR(MAX) NOT NULL
        CONSTRAINT CK_Ev_IsJson CHECK (ISJSON(payload_json) = 1),
    ui_slot         NVARCHAR(64)  NULL,
    occurred_at     DATETIME2(7)  NOT NULL CONSTRAINT DF_Ev_Occurred DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_AgUiEvents PRIMARY KEY CLUSTERED
        (conversation_id, sequence, event_sequence, occurred_at)
);
GO
DENY UPDATE, DELETE ON dbo.AgUiEvents TO app_role;
GO

/* ---- ConversationAudit: tamper-evident audit trail --------------------------
   FALLBACK variant for 2019 LocalDB: Ledger (LEDGER = ON + the two GENERATED
   ALWAYS ledger columns) is a 2022-only feature, so here it is a plain table
   with append-only enforced by permission. The engine-enforced Ledger version
   is the deliverable in EVA_DDL_SQLServer2022_Ledger_Variant.sql. Kept FK-free
   by design so the trail survives row deletes elsewhere.
---------------------------------------------------------------------------- */
CREATE TABLE dbo.ConversationAudit (
    audit_id              BIGINT IDENTITY(1,1) NOT NULL,
    conversation_id       BIGINT       NOT NULL,
    actor_user_id         BIGINT       NOT NULL,   -- who performed the action
    action                VARCHAR(24)  NOT NULL    -- created | viewed | appended | shared | revoked
        CONSTRAINT CK_Audit_Action CHECK (action IN ('created','viewed','appended','shared','revoked')),
    target_principal_id   BIGINT       NULL,       -- for shared/revoked: who was granted
    target_principal_type VARCHAR(8)   NULL        -- 'user' | 'group'
        CONSTRAINT CK_Audit_PType CHECK (target_principal_type IS NULL OR target_principal_type IN ('user','group')),
    permission            VARCHAR(16)  NULL,        -- for shared: read | read_append
    detail_json           NVARCHAR(MAX) NULL
        CONSTRAINT CK_Audit_IsJson CHECK (detail_json IS NULL OR ISJSON(detail_json) = 1),
    occurred_at           DATETIME2(3) NOT NULL CONSTRAINT DF_Audit_At DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_ConversationAudit PRIMARY KEY CLUSTERED (conversation_id, audit_id)
);
GO
DENY UPDATE, DELETE ON dbo.ConversationAudit TO app_role;  -- Ledger's stand-in on 2019
GO
