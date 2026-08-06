/* ============================================================================
   EVA — Candidate Analytics tables (v3 — sourced from data.json)
   SQL Server 2019+ (matches eva_local_scaffold_2019.sql conventions)

   v3 fixes over v2, all verified against the full data.json (157 candidates):

   1. GRAIN FIX — every analytics section in data.json hangs off the
      CANDIDATE, not off a fund. None of the 2,237 scoped entries
      (return_skill/downside_distribution/benchmark_activeness/exposure)
      carries a fund_id — the only fund pointer is the free-text `fund_ref`.
      v2 keyed everything `fund_id NOT NULL`, which is unloadable for 7 of
      157 candidates (1 has no funds[] at all; 6 have a subject_fund.fund_id
      that doesn't exist in funds[]). v3 anchors all seven section tables on
      `candidate_pm_id NOT NULL` (the true source grain) and keeps `fund_id`
      as a NULLABLE FK the loader fills when the candidate's subject fund
      resolves to a dbo.Funds row.

   2. TYPE FIXES (source values that cannot be FLOAT):
        exposure.long_short_ratio        — '100/0', '50/50', '311/291', 1, 2
                                            -> NVARCHAR(20), loader stringifies
        risk_framework.var_confidence_level — free text ('95%, 10-day', ...)
                                            -> NVARCHAR(120)

   3. LENGTH FIXES (observed max > v2 column):
        net_exposure_target       72  > 40  -> NVARCHAR(100) (one raw number
                                               70 exists — loader stringifies)
        gross_exposure_target     69  > 40  -> NVARCHAR(100)
        max_drawdown_period       59  > 40  -> NVARCHAR(80)
        statistics_period_detail  266 > 200 -> NVARCHAR(300)

   4. NEW TABLES for data v2 silently dropped:
        dbo.FundReturnSeries      — funds[].returns: monthly/quarterly/annual
                                    return points, net/gross/unspecified.
                                    244 of 291 funds have real data (~21.9k
                                    points). Dates are clean ISO; no duplicate
                                    dates within a (fund,frequency,basis)
                                    series, so the natural composite PK holds.
        dbo.FundPortfolioPosition — funds[].portfolio: position rows
                                    (instrument, market_value, currency) for
                                    41 funds (~100.8k rows).

   Still intentionally NOT modeled (lossless copy lives in
   dbo.Candidates.profile_json): subject_fund (aum_native_mn,
   is_multi_fund_manager, subject_rationale, sibling_funds), and the ~14
   non-analytics sections (classification, manager, fees, terms_redemption,
   operations_compliance, market_views, consistency, sustainability,
   analyst_flags, factors, volatility_greeks, vehicle_experience,
   executive_summary, strategy description). funds[].candidate_name is a
   pure denormalization of dbo.Candidates and is joined, not stored.

   Fields verified 100%-NULL in current data but kept for the future:
   treynor/sterling/omega/appraisal ratios, semi_variance, ulcer_index,
   historical/analytical_var_95_pct, batting_average_up/down,
   excess/active/real_return_pct, geometric_mean_monthly_pct,
   arithmetic_mean_annualized_pct, portfolio_liquidity_score.

   Approximate mapping from the old CSV metric names (v1), for anyone porting
   a query (semantics differ in places — noted):
     sharpe                     -> FundReturnSkill.sharpe_ratio
     annualised_return          -> FundReturnSkill.annualized_return_pct / cagr_pct
     annualised_alpha           -> FundReturnSkill.alpha_annualized_pct
     information_ratio          -> FundReturnSkill.information_ratio
     best_month / worst_month   -> FundDownsideDistribution.best_month_pct / worst_month_pct
     max_drawdown               -> FundDownsideDistribution.max_drawdown_pct
     annualised_vol              -> FundDownsideDistribution.volatility_pct
     hit_rate_monthly            -> FundDownsideDistribution.positive_months_pct (related, not identical)
     var_95                      -> FundDownsideDistribution.historical_var_95_pct / analytical_var_95_pct
                                     (risk_framework.stated_var_pct is the manager's self-reported LIMIT, not a measurement)
     beta_benchmark               -> FundBenchmarkActiveness.beta
     tracking_error                -> FundBenchmarkActiveness.tracking_error_pct
     regression_fit_r2             -> FundBenchmarkActiveness.r_squared
     avg_fund_correlation          -> FundBenchmarkActiveness.market_correlation (correlation to ITS OWN benchmark, not peer funds)
     gross_exposure / net_exposure -> FundExposure.gross/net_exposure_current_pct
     single_name_concentration     -> FundHoldings.max_single_position_pct
     top5/top10_concentration_pct  -> FundHoldings.top_5/top_10_concentration_pct
     weighted_days_to_liquidate    -> FundLiquidity.weighted_days_to_liquidate
     jensen_alpha, ytd_return, dd_vol_ratio, predicted_vol_ann,
     factor_risk_pct, specific_risk_pct, n_obs, run_status,
     sufficient_history, as_of                -> NOT in data.json, dropped.

   PREREQUISITE — dbo.Candidates.pm_id is too narrow for real data:
   eva_local_scaffold_2019.sql declares `pm_id VARCHAR(32)`. Real pm_ids run
   up to 49 chars. Widen it before the FKs below, or long ids fail to insert.
   (If pm_id is still 32 AND is the PK of a system-versioned temporal table,
   the simple ALTER below can't run — use widen_pm_id_migration.sql instead,
   which drops/restores the PK, FK and versioning around the widen.)
   ============================================================================ */
USE [eva];
GO
-- Filtered indexes (IX_*_Fund ... WHERE fund_id IS NOT NULL) require this ON;
-- sqlcmd sets it OFF by default.
SET QUOTED_IDENTIFIER ON;
GO

/* ---- 0. prerequisite: widen dbo.Candidates.pm_id (VARCHAR(32) is too small) */
IF COL_LENGTH('dbo.Candidates', 'pm_id') IS NOT NULL
   AND COL_LENGTH('dbo.Candidates', 'pm_id') < 64
BEGIN
    ALTER TABLE dbo.Candidates ALTER COLUMN pm_id VARCHAR(64) NOT NULL;
END
GO

/* ---- idempotent teardown (reverse dependency order) ---------------------- */
IF OBJECT_ID('dbo.FundPortfolioPosition','U')   IS NOT NULL DROP TABLE dbo.FundPortfolioPosition;
IF OBJECT_ID('dbo.FundReturnSeries','U')        IS NOT NULL DROP TABLE dbo.FundReturnSeries;
IF OBJECT_ID('dbo.FundRiskFramework','U')       IS NOT NULL DROP TABLE dbo.FundRiskFramework;
IF OBJECT_ID('dbo.FundLiquidity','U')           IS NOT NULL DROP TABLE dbo.FundLiquidity;
IF OBJECT_ID('dbo.FundHoldings','U')            IS NOT NULL DROP TABLE dbo.FundHoldings;
IF OBJECT_ID('dbo.FundExposure','U')            IS NOT NULL DROP TABLE dbo.FundExposure;
IF OBJECT_ID('dbo.FundBenchmarkActiveness','U') IS NOT NULL DROP TABLE dbo.FundBenchmarkActiveness;
IF OBJECT_ID('dbo.FundDownsideDistribution','U')IS NOT NULL DROP TABLE dbo.FundDownsideDistribution;
IF OBJECT_ID('dbo.FundReturnSkill','U')         IS NOT NULL DROP TABLE dbo.FundReturnSkill;
IF OBJECT_ID('dbo.CandidateAnalyticsSnapshot','U') IS NOT NULL DROP TABLE dbo.CandidateAnalyticsSnapshot; -- v1, dropped
IF OBJECT_ID('dbo.Funds','U') IS NOT NULL DROP TABLE dbo.Funds;
GO

/* ----------------------------------------------------------------------------
   1. dbo.Funds — one row per fund_id, sourced from each candidate's `funds[]`
      array in data.json (subject fund + siblings; confirmed many-to-one
      against dbo.Candidates, 291 rows, all fund_ids distinct).
   ----------------------------------------------------------------------------
   `strategy` here is FREE TEXT (up to 145 chars observed) — NOT the short
   classification.strategy_family enum that dbo.Candidates.strategy holds.
---------------------------------------------------------------------------- */
CREATE TABLE dbo.Funds (
    fund_id          VARCHAR(160)  NOT NULL CONSTRAINT PK_Funds PRIMARY KEY,
    candidate_pm_id  VARCHAR(64)   NOT NULL CONSTRAINT FK_Funds_Candidate REFERENCES dbo.Candidates(pm_id),
    fund_name        NVARCHAR(200) NOT NULL,
    strategy         NVARCHAR(300) NULL,
    aum              DECIMAL(18,2) NULL,
    aum_currency     VARCHAR(3)    NULL,
    source           VARCHAR(16)   NULL,   -- e.g. 'd1' (ingest batch/source tag)
    submitted_at     DATETIME2(3)  NULL,
    created_at       DATETIME2(3)  NOT NULL CONSTRAINT DF_Funds_Created DEFAULT (SYSUTCDATETIME())
);
GO
CREATE INDEX IX_Funds_Candidate ON dbo.Funds(candidate_pm_id);
GO

/* ----------------------------------------------------------------------------
   Shared shape across the four "scoped snapshot" sections below
   (return_skill, downside_distribution, benchmark_activeness, exposure):

   - Anchored on candidate_pm_id (NOT NULL) — the grain the source actually
     has. fund_id is a NULLABLE convenience FK: the loader sets it to the
     candidate's subject fund when that fund exists in dbo.Funds, else NULL.
   - Each candidate reports MULTIPLE entries (different source documents,
     share classes, fund_refs), so a surrogate IDENTITY PK is used —
     period_end/share_class are frequently NULL and can't form a natural key.
   - `fund_ref` is free text (262 distinct values, up to 79 chars: 'subject',
     sibling fund names, or labels like 'Live Trading US only 2018-2024') —
     deliberately NOT an FK.
---------------------------------------------------------------------------- */

/* ---- 2. dbo.FundReturnSkill — data.json `return_skill[]` (1,090 entries) -- */
CREATE TABLE dbo.FundReturnSkill (
    id                              BIGINT        IDENTITY(1,1) NOT NULL CONSTRAINT PK_FundReturnSkill PRIMARY KEY,
    candidate_pm_id                 VARCHAR(64)   NOT NULL CONSTRAINT FK_RS_Candidate REFERENCES dbo.Candidates(pm_id),
    fund_id                         VARCHAR(160)  NULL     CONSTRAINT FK_RS_Fund REFERENCES dbo.Funds(fund_id),
    scope                           VARCHAR(8)    NULL CONSTRAINT CK_RS_Scope CHECK (scope IS NULL OR scope IN ('pm_level','fund','vehicle')),
    fund_ref                        NVARCHAR(160) NULL,
    share_class                     NVARCHAR(60)  NULL,
    basis                           VARCHAR(5)    NULL CONSTRAINT CK_RS_Basis CHECK (basis IS NULL OR basis IN ('gross','net')),
    period                          NVARCHAR(200) NULL,
    period_start                    DATE          NULL,
    period_end                      DATE          NULL,
    note                            NVARCHAR(500) NULL,

    arithmetic_mean_monthly_pct     FLOAT NULL,
    arithmetic_mean_annualized_pct  FLOAT NULL,
    geometric_mean_monthly_pct      FLOAT NULL,
    cagr_pct                        FLOAT NULL,
    annualized_return_pct           FLOAT NULL,
    excess_return_pct               FLOAT NULL,
    active_return_pct               FLOAT NULL,
    real_return_pct                 FLOAT NULL,
    alpha_annualized_pct            FLOAT NULL,
    sharpe_ratio                    FLOAT NULL,
    sortino_ratio                   FLOAT NULL,
    treynor_ratio                   FLOAT NULL,
    information_ratio               FLOAT NULL,
    calmar_ratio                    FLOAT NULL,
    sterling_ratio                  FLOAT NULL,
    mar_ratio                       FLOAT NULL,
    omega_ratio                     FLOAT NULL,
    appraisal_ratio                 FLOAT NULL,
    statistics_period               NVARCHAR(200) NULL,
    statistics_period_detail        NVARCHAR(300) NULL,   -- observed max 266

    -- nested [{year, return_pct, is_net}] — kept as JSON, not its own table
    annual_returns                  NVARCHAR(MAX) NULL CONSTRAINT CK_RS_AnnualJson CHECK (annual_returns IS NULL OR ISJSON(annual_returns) = 1),

    loaded_at                       DATETIME2(3)  NOT NULL CONSTRAINT DF_RS_Loaded DEFAULT (SYSUTCDATETIME())
);
GO
CREATE INDEX IX_RS_Candidate ON dbo.FundReturnSkill(candidate_pm_id, period_end);
CREATE INDEX IX_RS_Fund ON dbo.FundReturnSkill(fund_id) WHERE fund_id IS NOT NULL;
GO

/* ---- 3. dbo.FundDownsideDistribution — `downside_distribution[]` (772) ---- */
CREATE TABLE dbo.FundDownsideDistribution (
    id                         BIGINT        IDENTITY(1,1) NOT NULL CONSTRAINT PK_FundDownsideDist PRIMARY KEY,
    candidate_pm_id            VARCHAR(64)   NOT NULL CONSTRAINT FK_DD_Candidate REFERENCES dbo.Candidates(pm_id),
    fund_id                    VARCHAR(160)  NULL     CONSTRAINT FK_DD_Fund REFERENCES dbo.Funds(fund_id),
    scope                      VARCHAR(8)    NULL CONSTRAINT CK_DD_Scope CHECK (scope IS NULL OR scope IN ('pm_level','fund','vehicle')),
    fund_ref                   NVARCHAR(160) NULL,
    share_class                NVARCHAR(60)  NULL,
    basis                      VARCHAR(5)    NULL CONSTRAINT CK_DD_Basis CHECK (basis IS NULL OR basis IN ('gross','net')),
    period                     NVARCHAR(200) NULL,
    period_start               DATE          NULL,
    period_end                 DATE          NULL,
    note                       NVARCHAR(500) NULL,

    volatility_pct             FLOAT NULL,
    downside_deviation_pct     FLOAT NULL,
    semi_variance               FLOAT NULL,
    max_drawdown_pct            FLOAT NULL,
    max_drawdown_period         NVARCHAR(80) NULL,   -- free text, observed max 59
    drawdown_duration_months    FLOAT NULL,
    ulcer_index                 FLOAT NULL,
    historical_var_95_pct       FLOAT NULL,
    analytical_var_95_pct       FLOAT NULL,
    cvar_95_pct                 FLOAT NULL,
    skewness                    FLOAT NULL,
    kurtosis_excess             FLOAT NULL,
    tail_risk_note               NVARCHAR(500) NULL,
    best_month_pct              FLOAT NULL,
    worst_month_pct             FLOAT NULL,
    positive_months_pct         FLOAT NULL,
    gain_loss_ratio             FLOAT NULL,
    best_rolling_12m_pct        FLOAT NULL,
    worst_rolling_12m_pct       FLOAT NULL,
    idiosyncratic_risk_pct      FLOAT NULL,
    counterparty_risk_note      NVARCHAR(500) NULL,

    loaded_at                  DATETIME2(3)  NOT NULL CONSTRAINT DF_DD_Loaded DEFAULT (SYSUTCDATETIME())
);
GO
CREATE INDEX IX_DD_Candidate ON dbo.FundDownsideDistribution(candidate_pm_id, period_end);
CREATE INDEX IX_DD_Fund ON dbo.FundDownsideDistribution(fund_id) WHERE fund_id IS NOT NULL;
GO

/* ---- 4. dbo.FundBenchmarkActiveness — `benchmark_activeness[]` (185) ------ */
CREATE TABLE dbo.FundBenchmarkActiveness (
    id                   BIGINT        IDENTITY(1,1) NOT NULL CONSTRAINT PK_FundBenchAct PRIMARY KEY,
    candidate_pm_id      VARCHAR(64)   NOT NULL CONSTRAINT FK_BA_Candidate REFERENCES dbo.Candidates(pm_id),
    fund_id              VARCHAR(160)  NULL     CONSTRAINT FK_BA_Fund REFERENCES dbo.Funds(fund_id),
    scope                VARCHAR(8)    NULL CONSTRAINT CK_BA_Scope CHECK (scope IS NULL OR scope IN ('pm_level','fund','vehicle')),
    fund_ref             NVARCHAR(160) NULL,
    share_class          NVARCHAR(60)  NULL,
    basis                VARCHAR(5)    NULL CONSTRAINT CK_BA_Basis CHECK (basis IS NULL OR basis IN ('gross','net')),
    period               NVARCHAR(200) NULL,
    period_start         DATE          NULL,
    period_end           DATE          NULL,
    note                 NVARCHAR(500) NULL,

    beta                  FLOAT NULL,
    market_correlation    FLOAT NULL,
    r_squared              FLOAT NULL,
    tracking_error_pct     FLOAT NULL,
    up_capture_pct         FLOAT NULL,
    down_capture_pct       FLOAT NULL,
    active_share_pct       FLOAT NULL,
    batting_average_up     FLOAT NULL,
    batting_average_down   FLOAT NULL,

    loaded_at            DATETIME2(3)  NOT NULL CONSTRAINT DF_BA_Loaded DEFAULT (SYSUTCDATETIME())
);
GO
CREATE INDEX IX_BA_Candidate ON dbo.FundBenchmarkActiveness(candidate_pm_id, period_end);
CREATE INDEX IX_BA_Fund ON dbo.FundBenchmarkActiveness(fund_id) WHERE fund_id IS NOT NULL;
GO

/* ---- 5. dbo.FundExposure — data.json `exposure[]` (190 entries) ----------- */
CREATE TABLE dbo.FundExposure (
    id                              BIGINT        IDENTITY(1,1) NOT NULL CONSTRAINT PK_FundExposure PRIMARY KEY,
    candidate_pm_id                 VARCHAR(64)   NOT NULL CONSTRAINT FK_Ex_Candidate REFERENCES dbo.Candidates(pm_id),
    fund_id                         VARCHAR(160)  NULL     CONSTRAINT FK_Ex_Fund REFERENCES dbo.Funds(fund_id),
    scope                           VARCHAR(8)    NULL CONSTRAINT CK_Ex_Scope CHECK (scope IS NULL OR scope IN ('pm_level','fund','vehicle')),
    fund_ref                        NVARCHAR(160) NULL,
    share_class                     NVARCHAR(60)  NULL,
    basis                           VARCHAR(5)    NULL CONSTRAINT CK_Ex_Basis CHECK (basis IS NULL OR basis IN ('gross','net')),
    period                          NVARCHAR(200) NULL,
    period_start                    DATE          NULL,
    period_end                      DATE          NULL,
    note                            NVARCHAR(500) NULL,

    gross_exposure_target           NVARCHAR(100) NULL,   -- free text, observed max 69
    gross_exposure_current_pct      FLOAT NULL,
    gross_exposure_min_pct          FLOAT NULL,
    gross_exposure_avg_pct          FLOAT NULL,
    gross_exposure_max_pct          FLOAT NULL,
    net_exposure_target             NVARCHAR(100) NULL,   -- free text, observed max 72; one raw number (70) — loader stringifies
    net_exposure_current_pct        FLOAT NULL,
    net_exposure_min_pct            FLOAT NULL,
    net_exposure_avg_pct            FLOAT NULL,
    net_exposure_max_pct            FLOAT NULL,
    beta_adjusted_net_exposure_pct  FLOAT NULL,
    residual_beta                   FLOAT NULL,
    beta_benchmark                  NVARCHAR(120) NULL,   -- label, e.g. 'Euro Stoxx 50'
    long_short_ratio                NVARCHAR(20)  NULL,   -- '100/0', '50/50', '311/291', or a bare number — loader stringifies
    long_alpha_pct                  FLOAT NULL,
    short_alpha_pct                 FLOAT NULL,

    loaded_at                       DATETIME2(3)  NOT NULL CONSTRAINT DF_Ex_Loaded DEFAULT (SYSUTCDATETIME())
);
GO
CREATE INDEX IX_Ex_Candidate ON dbo.FundExposure(candidate_pm_id, period_end);
CREATE INDEX IX_Ex_Fund ON dbo.FundExposure(fund_id) WHERE fund_id IS NOT NULL;
GO

/* ----------------------------------------------------------------------------
   6–8. Single-object sections — exactly one object per CANDIDATE in the
   source (157 each; zero array occurrences), so the PK is candidate_pm_id.
   fund_id is the same nullable subject-fund convenience FK as above.
---------------------------------------------------------------------------- */

/* ---- 6. dbo.FundHoldings — data.json `holdings` --------------------------- */
CREATE TABLE dbo.FundHoldings (
    candidate_pm_id            VARCHAR(64)  NOT NULL CONSTRAINT PK_FundHoldings PRIMARY KEY
                                    CONSTRAINT FK_Hold_Candidate REFERENCES dbo.Candidates(pm_id),
    fund_id                    VARCHAR(160) NULL CONSTRAINT FK_Hold_Fund REFERENCES dbo.Funds(fund_id),

    num_positions_long          INT   NULL,
    num_positions_short         INT   NULL,
    num_positions_total         INT   NULL,
    largest_position_pct        FLOAT NULL,
    max_single_position_pct     FLOAT NULL,
    top_5_concentration_pct     FLOAT NULL,
    top_10_concentration_pct    FLOAT NULL,
    turnover_pct                FLOAT NULL,
    illiquid_asset_pct          FLOAT NULL,
    level_1_asset_pct           FLOAT NULL,
    level_2_asset_pct           FLOAT NULL,
    level_3_asset_pct           FLOAT NULL,
    uses_index_instruments      BIT   NULL,
    index_instruments_note      NVARCHAR(500) NULL,

    -- nested lists/dicts kept as JSON (position/sector/region/country detail)
    top_positions        NVARCHAR(MAX) NULL CONSTRAINT CK_Hold_TopPosJson CHECK (top_positions IS NULL OR ISJSON(top_positions) = 1),
    sector_allocation     NVARCHAR(MAX) NULL CONSTRAINT CK_Hold_SectorJson CHECK (sector_allocation IS NULL OR ISJSON(sector_allocation) = 1),
    industry_allocation   NVARCHAR(MAX) NULL CONSTRAINT CK_Hold_IndustryJson CHECK (industry_allocation IS NULL OR ISJSON(industry_allocation) = 1),
    region_allocation     NVARCHAR(MAX) NULL CONSTRAINT CK_Hold_RegionJson CHECK (region_allocation IS NULL OR ISJSON(region_allocation) = 1),
    country_allocation    NVARCHAR(MAX) NULL CONSTRAINT CK_Hold_CountryJson CHECK (country_allocation IS NULL OR ISJSON(country_allocation) = 1),
    currency_exposure     NVARCHAR(MAX) NULL CONSTRAINT CK_Hold_CurrencyJson CHECK (currency_exposure IS NULL OR ISJSON(currency_exposure) = 1),
    holding_types         NVARCHAR(MAX) NULL CONSTRAINT CK_Hold_TypesJson CHECK (holding_types IS NULL OR ISJSON(holding_types) = 1),

    loaded_at             DATETIME2(3) NOT NULL CONSTRAINT DF_Hold_Loaded DEFAULT (SYSUTCDATETIME())
);
GO
CREATE INDEX IX_Hold_Fund ON dbo.FundHoldings(fund_id) WHERE fund_id IS NOT NULL;
GO

/* ---- 7. dbo.FundLiquidity — data.json `liquidity` -------------------------- */
CREATE TABLE dbo.FundLiquidity (
    candidate_pm_id                      VARCHAR(64)  NOT NULL CONSTRAINT PK_FundLiquidity PRIMARY KEY
                                              CONSTRAINT FK_Liq_Candidate REFERENCES dbo.Candidates(pm_id),
    fund_id                              VARCHAR(160) NULL CONSTRAINT FK_Liq_Fund REFERENCES dbo.Funds(fund_id),

    weighted_days_to_liquidate           FLOAT NULL,
    portfolio_liquidity_score            FLOAT NULL,
    bid_ask_spread_note                  NVARCHAR(500) NULL,
    days_to_liquidate_note               NVARCHAR(500) NULL,
    redemption_liquidity_mismatch_note   NVARCHAR(500) NULL,

    -- nested [{bucket, weight_pct}]
    liquidity_buckets   NVARCHAR(MAX) NULL CONSTRAINT CK_Liq_BucketsJson CHECK (liquidity_buckets IS NULL OR ISJSON(liquidity_buckets) = 1),

    loaded_at            DATETIME2(3) NOT NULL CONSTRAINT DF_Liq_Loaded DEFAULT (SYSUTCDATETIME())
);
GO
CREATE INDEX IX_Liq_Fund ON dbo.FundLiquidity(fund_id) WHERE fund_id IS NOT NULL;
GO

/* ---- 8. dbo.FundRiskFramework — data.json `risk_framework` ---------------- */
CREATE TABLE dbo.FundRiskFramework (
    candidate_pm_id               VARCHAR(64)  NOT NULL CONSTRAINT PK_FundRiskFramework PRIMARY KEY
                                       CONSTRAINT FK_Risk_Candidate REFERENCES dbo.Candidates(pm_id),
    fund_id                       VARCHAR(160) NULL CONSTRAINT FK_Risk_Fund REFERENCES dbo.Funds(fund_id),

    stated_var_pct                FLOAT NULL,          -- manager's self-reported VaR LIMIT, not a measurement
    var_confidence_level          NVARCHAR(120) NULL,  -- free text, e.g. '95%, 10-day' (observed max 76)
    holdings_history_sufficient   BIT   NULL,

    risk_framework_description    NVARCHAR(MAX) NULL,
    stop_loss_policy              NVARCHAR(MAX) NULL,
    drawdown_response_protocol    NVARCHAR(MAX) NULL,
    risk_model_used               NVARCHAR(MAX) NULL,
    position_limits                NVARCHAR(MAX) NULL,
    sector_limits                   NVARCHAR(MAX) NULL,

    loaded_at   DATETIME2(3) NOT NULL CONSTRAINT DF_Risk_Loaded DEFAULT (SYSUTCDATETIME())
);
GO
CREATE INDEX IX_Risk_Fund ON dbo.FundRiskFramework(fund_id) WHERE fund_id IS NOT NULL;
GO

/* ----------------------------------------------------------------------------
   9. dbo.FundReturnSeries — funds[].returns, exploded to one row per return
      point. Source shape: returns.{monthly|quarterly|annual}.{net|gross|
      unspecified}.{dates[], values[]}. 244/291 funds have data (~21.9k
      points). Verified: dates are ISO YYYY-MM-DD and unique within each
      (fund, frequency, basis) series — natural composite PK is safe.
---------------------------------------------------------------------------- */
CREATE TABLE dbo.FundReturnSeries (
    fund_id      VARCHAR(160) NOT NULL CONSTRAINT FK_Ser_Fund REFERENCES dbo.Funds(fund_id),
    frequency    VARCHAR(9)   NOT NULL CONSTRAINT CK_Ser_Freq  CHECK (frequency IN ('monthly','quarterly','annual')),
    basis        VARCHAR(11)  NOT NULL CONSTRAINT CK_Ser_Basis CHECK (basis IN ('net','gross','unspecified')),
    period_date  DATE         NOT NULL,   -- period end date the point represents
    return_pct   FLOAT        NOT NULL,

    loaded_at    DATETIME2(3) NOT NULL CONSTRAINT DF_Ser_Loaded DEFAULT (SYSUTCDATETIME()),

    CONSTRAINT PK_FundReturnSeries PRIMARY KEY CLUSTERED (fund_id, frequency, basis, period_date)
);
GO
CREATE INDEX IX_Ser_Date ON dbo.FundReturnSeries(period_date);
GO

/* ----------------------------------------------------------------------------
   10. dbo.FundPortfolioPosition — funds[].portfolio position rows
       (~100.8k rows across 41 funds). The source row's `fund` field repeats
       the fund_id and is not stored separately.
---------------------------------------------------------------------------- */
CREATE TABLE dbo.FundPortfolioPosition (
    id            BIGINT        IDENTITY(1,1) NOT NULL CONSTRAINT PK_FundPortfolioPos PRIMARY KEY,
    fund_id       VARCHAR(160)  NOT NULL CONSTRAINT FK_Pos_Fund REFERENCES dbo.Funds(fund_id),
    instrument    NVARCHAR(160) NOT NULL,   -- observed max 92
    market_value  FLOAT         NULL,
    currency      VARCHAR(3)    NULL,

    loaded_at     DATETIME2(3)  NOT NULL CONSTRAINT DF_Pos_Loaded DEFAULT (SYSUTCDATETIME())
);
GO
CREATE INDEX IX_Pos_Fund ON dbo.FundPortfolioPosition(fund_id);
GO
