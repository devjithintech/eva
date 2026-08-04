/* ============================================================================
   EVA — Candidate Analytics tables
   SQL Server 2019+ (matches eva_local_scaffold_2019.sql conventions)

   Purpose: land `server/data/candidate_analytics.csv` in the database. The
   CSV mixes three different grains in one flat row, so it normalizes into
   two tables instead of one:

     dbo.Funds                    — dimension: one row per fund (identity:
                                     which candidate runs it, its name/strategy)
     dbo.CandidateAnalyticsSnapshot — fact: one row per (fund, as_of) analytics
                                     run (sharpe, alpha, drawdown, etc.)

   Why split: the CSV carries `as_of`, `n_obs`, `run_status` — this is the
   output of a periodic recompute, not a static attribute. A fund gets a new
   analytics row every time the job reruns; its name/strategy/candidate don't
   change on every run. Collapsing both into one table would either duplicate
   the identity columns on every run or lose history on upsert.

   Relationship confirmed against server/data/data.json: a candidate (pm_id)
   can run more than one fund (`is_multi_fund_manager` + `funds[]`), and each
   entry in that `funds[]` array carries exactly {fund_id, candidate_id,
   candidate_name, fund_name, strategy, aum, aum_currency} — the same
   identity columns the CSV has. So Funds.candidate_pm_id is many-to-one
   against dbo.Candidates(pm_id), not one-to-one.

   PREREQUISITE — dbo.Candidates.pm_id is too narrow for real data:
   eva_local_scaffold_2019.sql declares `pm_id VARCHAR(32)`. Real pm_ids in
   data.json run up to 49 chars (e.g. 'edge-capital-investment-management-
   crypt-4b25831c'), and fund_ids up to 88 chars. Widen pm_id before adding
   the FK below, or every real candidate with a long id will fail to insert.
   ============================================================================ */
USE [eva];
GO

/* ---- 0. prerequisite: widen dbo.Candidates.pm_id (VARCHAR(32) is too small) */
IF COL_LENGTH('dbo.Candidates', 'pm_id') IS NOT NULL
   AND COL_LENGTH('dbo.Candidates', 'pm_id') < 64
BEGIN
    ALTER TABLE dbo.Candidates ALTER COLUMN pm_id VARCHAR(64) NOT NULL;
END
GO

/* ---- idempotent teardown (reverse dependency order) ---------------------- */
IF OBJECT_ID('dbo.CandidateAnalyticsSnapshot','U') IS NOT NULL DROP TABLE dbo.CandidateAnalyticsSnapshot;
IF OBJECT_ID('dbo.Funds','U') IS NOT NULL DROP TABLE dbo.Funds;
GO

/* ----------------------------------------------------------------------------
   1. dbo.Funds — one row per fund, keyed on the CSV's `fund_id`.
   ----------------------------------------------------------------------------
   `strategy` is stored here (not in the snapshot) because it's a
   classification, not a per-run measurement — same treatment as
   dbo.Candidates.strategy in the 2019 scaffold. Re-classification is rare and
   should overwrite in place, not spawn per-run duplicates.
---------------------------------------------------------------------------- */
CREATE TABLE dbo.Funds (
    fund_id          VARCHAR(160)  NOT NULL CONSTRAINT PK_Funds PRIMARY KEY,
    candidate_pm_id  VARCHAR(64)   NOT NULL CONSTRAINT FK_Funds_Candidate
                          REFERENCES dbo.Candidates(pm_id),
    fund_name        NVARCHAR(300) NOT NULL,
    strategy         VARCHAR(64)   NULL,   -- e.g. 'market_neutral_equity', 'credit', 'statistical_arbitrage'
    created_at       DATETIME2(3)  NOT NULL CONSTRAINT DF_Funds_Created DEFAULT (SYSUTCDATETIME())
);
GO
CREATE INDEX IX_Funds_Candidate ON dbo.Funds(candidate_pm_id);
GO

/* ----------------------------------------------------------------------------
   2. dbo.CandidateAnalyticsSnapshot — one row per fund per analytics run.
   ----------------------------------------------------------------------------
   `candidate_id`/`candidate_name`/`fund_name` from the CSV are dropped here —
   they're pure denormalization of dbo.Funds / dbo.Candidates and are joined,
   not stored twice. Everything below is either a run-bookkeeping column or an
   actual computed metric for that run.

   Ratio/percentage metrics use FLOAT (not DECIMAL) because the source values
   are full float64 precision from a Python/numpy computation (e.g.
   -0.03653558268740489) — DECIMAL would force an arbitrary rounding point
   the source data doesn't have.

   `run_status` values are INFERRED from a single observed value
   ('completed') — widen the CHECK list as new statuses show up in real runs.
---------------------------------------------------------------------------- */
CREATE TABLE dbo.CandidateAnalyticsSnapshot (
    fund_id                     VARCHAR(160)  NOT NULL CONSTRAINT FK_Snap_Fund
                                     REFERENCES dbo.Funds(fund_id),
    as_of                       DATE          NOT NULL,   -- the run date this snapshot represents

    -- run bookkeeping
    run_status                  VARCHAR(24)   NOT NULL
        CONSTRAINT CK_Snap_RunStatus
        CHECK (run_status IN ('completed', 'failed', 'insufficient_history', 'skipped')),
    sufficient_history           BIT          NOT NULL,
    n_obs                        INT          NULL,       -- # of observations (months) in this run's window
    period_first                 DATE         NULL,       -- CSV `first`
    period_last                  DATE         NULL,       -- CSV `last`

    -- size at time of run (fluctuates run to run — not a Funds-level attribute)
    aum                           DECIMAL(18,2) NULL,

    -- return / skill
    sharpe                        FLOAT NULL,
    annualised_return             FLOAT NULL,
    annualised_alpha              FLOAT NULL,
    jensen_alpha                  FLOAT NULL,
    information_ratio             FLOAT NULL,
    ytd_return                    FLOAT NULL,
    hit_rate_monthly              FLOAT NULL,
    best_month                    FLOAT NULL,
    worst_month                   FLOAT NULL,

    -- risk / drawdown
    max_drawdown                  FLOAT NULL,
    annualised_vol                FLOAT NULL,
    dd_vol_ratio                  FLOAT NULL,
    var_95                        FLOAT NULL,
    predicted_vol_ann             FLOAT NULL,
    factor_risk_pct               FLOAT NULL,
    specific_risk_pct             FLOAT NULL,

    -- benchmark relative
    beta_benchmark                 FLOAT NULL,
    tracking_error                 FLOAT NULL,
    regression_fit_r2              FLOAT NULL,
    avg_fund_correlation           FLOAT NULL,

    -- exposure / concentration / liquidity
    gross_exposure                 FLOAT NULL,
    net_exposure                   FLOAT NULL,
    single_name_concentration      FLOAT NULL,
    top5_concentration_pct         FLOAT NULL,
    top10_concentration_pct        FLOAT NULL,
    weighted_days_to_liquidate     FLOAT NULL,

    -- ETL bookkeeping
    loaded_at                      DATETIME2(3) NOT NULL CONSTRAINT DF_Snap_Loaded DEFAULT (SYSUTCDATETIME()),

    CONSTRAINT PK_CandidateAnalyticsSnapshot PRIMARY KEY CLUSTERED (fund_id, as_of)
);
GO
CREATE INDEX IX_Snap_AsOf ON dbo.CandidateAnalyticsSnapshot(as_of);
GO
