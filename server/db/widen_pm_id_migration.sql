/* ============================================================================
   EVA — widen dbo.Candidates.pm_id VARCHAR(32) → VARCHAR(64)

   Prerequisite for candidate_analytics_ddl.sql. The simple ALTER COLUMN in
   that script can't run here because pm_id is:
     1. referenced by FK_Conv_Cand (dbo.Conversations.candidate_pm_id)
     2. the clustered primary key of dbo.Candidates
     3. a column of a SYSTEM_VERSIONED temporal table (dbo.Candidates_History)

   So: drop FK → versioning OFF → drop PK → widen main + history columns →
   re-add PK → versioning ON (same history table, infinite retention) →
   widen the referencing Conversations column → re-add FK. All-or-nothing
   inside one transaction.
   ============================================================================ */
USE [eva];
GO
IF COL_LENGTH('dbo.Candidates', 'pm_id') >= 64
BEGIN
    PRINT 'pm_id already >= VARCHAR(64) — nothing to do.';
    SET NOEXEC ON;  -- skip the rest of the script
END
GO
BEGIN TRY
    BEGIN TRAN;

    ALTER TABLE dbo.Conversations DROP CONSTRAINT FK_Conv_Cand;

    ALTER TABLE dbo.Candidates SET (SYSTEM_VERSIONING = OFF);
    ALTER TABLE dbo.Candidates DROP CONSTRAINT PK_Candidates;

    ALTER TABLE dbo.Candidates         ALTER COLUMN pm_id VARCHAR(64) NOT NULL;
    ALTER TABLE dbo.Candidates_History ALTER COLUMN pm_id VARCHAR(64) NOT NULL;

    ALTER TABLE dbo.Candidates ADD CONSTRAINT PK_Candidates PRIMARY KEY CLUSTERED (pm_id);
    ALTER TABLE dbo.Candidates SET (SYSTEM_VERSIONING = ON (
        HISTORY_TABLE = dbo.Candidates_History, DATA_CONSISTENCY_CHECK = ON));

    -- Conversations is also temporal, but widening a varchar that isn't part
    -- of its PK propagates to Conversations_History without toggling anything.
    ALTER TABLE dbo.Conversations ALTER COLUMN candidate_pm_id VARCHAR(64) NULL;

    ALTER TABLE dbo.Conversations ADD CONSTRAINT FK_Conv_Cand
        FOREIGN KEY (candidate_pm_id) REFERENCES dbo.Candidates(pm_id);

    COMMIT;
    PRINT 'pm_id widened to VARCHAR(64); PK, FK and system versioning restored.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    THROW;
END CATCH
GO
SET NOEXEC OFF;
GO
