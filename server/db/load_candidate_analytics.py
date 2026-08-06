"""
EVA — load server/data/data.json into the candidate analytics tables
created by candidate_analytics_ddl.sql (v3).

Load order (FK dependency order):
  1. dbo.Candidates            — upserted (table is temporal + referenced by
                                 Conversations, so never deleted; UPDATE if the
                                 pm_id exists, INSERT if not)
  2. dbo.Funds                 — from each candidate's funds[]
  3. scoped sections           — return_skill / downside_distribution /
                                 benchmark_activeness / exposure (per-candidate
                                 arrays; fund_id = subject fund when it
                                 resolves to a dbo.Funds row, else NULL)
  4. single-object sections    — holdings / liquidity / risk_framework
  5. dbo.FundReturnSeries      — funds[].returns exploded to one row per point
  6. dbo.FundPortfolioPosition — funds[].portfolio rows

Re-runnable: analytics tables are DELETEd (children first) before reload;
Candidates rows are upserted in place.

Source-data quirks handled here (see DDL header for the full story):
  - long_short_ratio / net_exposure_target are usually strings but sometimes
    raw numbers -> coerced to str
  - nested arrays (annual_returns, holdings allocations, liquidity_buckets)
    -> json.dumps into the NVARCHAR(MAX) ISJSON-checked columns; empty -> NULL
  - submitted_at ISO timestamps ('...Z') -> parsed to naive UTC datetimes
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pyodbc

# data.json was renamed data_new.json once the DB became the primary source;
# accept either (or an explicit path as argv[1]).
_DATA_DIR = Path(__file__).resolve().parents[1] / "data"
DATA_PATH = next(
    (p for p in (
        [Path(sys.argv[1])] if len(sys.argv) > 1
        else [_DATA_DIR / "data.json", _DATA_DIR / "data_new.json"]
    ) if p.exists()),
    _DATA_DIR / "data.json",
)
CONN_STR = (
    "Driver={ODBC Driver 17 for SQL Server};"
    r"Server=(localdb)\MSSQLLocalDB;"
    "Database=eva;Trusted_Connection=yes;"
)

SCOPED_COMMON = ("scope", "fund_ref", "share_class", "basis",
                 "period", "period_start", "period_end", "note")

RETURN_SKILL_METRICS = (
    "arithmetic_mean_monthly_pct", "arithmetic_mean_annualized_pct",
    "geometric_mean_monthly_pct", "cagr_pct", "annualized_return_pct",
    "excess_return_pct", "active_return_pct", "real_return_pct",
    "alpha_annualized_pct", "sharpe_ratio", "sortino_ratio", "treynor_ratio",
    "information_ratio", "calmar_ratio", "sterling_ratio", "mar_ratio",
    "omega_ratio", "appraisal_ratio", "statistics_period",
    "statistics_period_detail",
)
DOWNSIDE_METRICS = (
    "volatility_pct", "downside_deviation_pct", "semi_variance",
    "max_drawdown_pct", "max_drawdown_period", "drawdown_duration_months",
    "ulcer_index", "historical_var_95_pct", "analytical_var_95_pct",
    "cvar_95_pct", "skewness", "kurtosis_excess", "tail_risk_note",
    "best_month_pct", "worst_month_pct", "positive_months_pct",
    "gain_loss_ratio", "best_rolling_12m_pct", "worst_rolling_12m_pct",
    "idiosyncratic_risk_pct", "counterparty_risk_note",
)
BENCHMARK_METRICS = (
    "beta", "market_correlation", "r_squared", "tracking_error_pct",
    "up_capture_pct", "down_capture_pct", "active_share_pct",
    "batting_average_up", "batting_average_down",
)
EXPOSURE_METRICS = (
    "gross_exposure_target", "gross_exposure_current_pct",
    "gross_exposure_min_pct", "gross_exposure_avg_pct",
    "gross_exposure_max_pct", "net_exposure_target",
    "net_exposure_current_pct", "net_exposure_min_pct",
    "net_exposure_avg_pct", "net_exposure_max_pct",
    "beta_adjusted_net_exposure_pct", "residual_beta", "beta_benchmark",
    "long_short_ratio", "long_alpha_pct", "short_alpha_pct",
)
# columns whose source values are sometimes raw numbers but land in NVARCHAR
STRINGIFY = {"net_exposure_target", "gross_exposure_target",
             "long_short_ratio", "max_drawdown_period"}

HOLDINGS_SCALARS = (
    "num_positions_long", "num_positions_short", "num_positions_total",
    "largest_position_pct", "max_single_position_pct",
    "top_5_concentration_pct", "top_10_concentration_pct", "turnover_pct",
    "illiquid_asset_pct", "level_1_asset_pct", "level_2_asset_pct",
    "level_3_asset_pct", "uses_index_instruments", "index_instruments_note",
)
HOLDINGS_JSON = (
    "top_positions", "sector_allocation", "industry_allocation",
    "region_allocation", "country_allocation", "currency_exposure",
    "holding_types",
)
LIQUIDITY_SCALARS = (
    "weighted_days_to_liquidate", "portfolio_liquidity_score",
    "bid_ask_spread_note", "days_to_liquidate_note",
    "redemption_liquidity_mismatch_note",
)
RISK_COLS = (
    "stated_var_pct", "var_confidence_level", "holdings_history_sufficient",
    "risk_framework_description", "stop_loss_policy",
    "drawdown_response_protocol", "risk_model_used", "position_limits",
    "sector_limits",
)


def as_str(v):
    return None if v is None else str(v)


def as_json(v):
    return json.dumps(v, ensure_ascii=False) if v not in (None, [], {}) else None


def parse_ts(v):
    if not v:
        return None
    dt = datetime.fromisoformat(v.replace("Z", "+00:00"))
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def scoped_values(entry, cols):
    row = [entry.get(k) for k in SCOPED_COMMON]
    for k in cols:
        v = entry.get(k)
        row.append(as_str(v) if k in STRINGIFY else v)
    return row


def insert_many(cur, table, columns, rows, chunk=5000):
    if not rows:
        return 0
    sql = (f"INSERT INTO dbo.{table} ({', '.join(columns)}) "
           f"VALUES ({', '.join('?' * len(columns))})")
    for i in range(0, len(rows), chunk):
        cur.executemany(sql, rows[i:i + chunk])
    return len(rows)


def main():
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    # keep the map key: it's the candidate's canonical display name, which the
    # BFF uses to key its dataset (data.json shape: {count, candidates: {name: {...}}})
    by_name = data["candidates"]
    candidates = list(by_name.values())
    display_name = {c["pm_id"]: name for name, c in by_name.items()}
    print(f"data.json: {len(candidates)} candidates")

    cn = pyodbc.connect(CONN_STR, autocommit=False)
    cur = cn.cursor()
    cur.fast_executemany = True

    # ---- 0. wipe analytics tables, children first (Candidates is upserted) --
    for t in ("FundPortfolioPosition", "FundReturnSeries", "FundRiskFramework",
              "FundLiquidity", "FundHoldings", "FundExposure",
              "FundBenchmarkActiveness", "FundDownsideDistribution",
              "FundReturnSkill", "Funds"):
        cur.execute(f"DELETE FROM dbo.{t}")

    # ---- 1. Candidates (upsert; temporal table, don't delete) ---------------
    existing = {r[0] for r in cur.execute("SELECT pm_id FROM dbo.Candidates")}
    ins, upd = [], []
    for c in candidates:
        name = display_name[c["pm_id"]]
        strategy = c.get("classification", {}).get("strategy_family")
        profile = json.dumps(c, ensure_ascii=False)
        row = (name, profile, strategy, c["pm_id"])
        (upd if c["pm_id"] in existing else ins).append(row)
    cur.executemany(
        "UPDATE dbo.Candidates SET name=?, profile_json=?, strategy=? WHERE pm_id=?", upd
    ) if upd else None
    cur.executemany(
        "INSERT INTO dbo.Candidates (name, profile_json, strategy, pm_id) VALUES (?,?,?,?)", ins
    ) if ins else None
    print(f"Candidates: {len(ins)} inserted, {len(upd)} updated")

    # ---- 2. Funds ------------------------------------------------------------
    fund_rows, all_fund_ids = [], set()
    for c in candidates:
        for f in c.get("funds") or []:
            all_fund_ids.add(f["fund_id"])
            fund_rows.append((f["fund_id"], c["pm_id"], f["fund_name"],
                              f.get("strategy"), f.get("aum"),
                              f.get("aum_currency"), f.get("source"),
                              parse_ts(f.get("submitted_at"))))
    n = insert_many(cur, "Funds",
                    ("fund_id", "candidate_pm_id", "fund_name", "strategy",
                     "aum", "aum_currency", "source", "submitted_at"),
                    fund_rows)
    print(f"Funds: {n}")

    # subject-fund resolution: candidate -> fund_id or None
    subject_fund, unresolved = {}, []
    for c in candidates:
        sf = (c.get("subject_fund") or {}).get("fund_id")
        subject_fund[c["pm_id"]] = sf if sf in all_fund_ids else None
        if sf and sf not in all_fund_ids:
            unresolved.append(c["pm_id"])
    if unresolved:
        print(f"  note: subject fund not in funds[] for {len(unresolved)} "
              f"candidates (fund_id left NULL): {', '.join(unresolved)}")

    # ---- 3. scoped sections ----------------------------------------------------
    scoped_specs = (
        ("return_skill", "FundReturnSkill", RETURN_SKILL_METRICS, ("annual_returns",)),
        ("downside_distribution", "FundDownsideDistribution", DOWNSIDE_METRICS, ()),
        ("benchmark_activeness", "FundBenchmarkActiveness", BENCHMARK_METRICS, ()),
        ("exposure", "FundExposure", EXPOSURE_METRICS, ()),
    )
    for section, table, metrics, json_cols in scoped_specs:
        cols = ("candidate_pm_id", "fund_id") + SCOPED_COMMON + metrics + json_cols
        rows = []
        for c in candidates:
            for e in c.get(section) or []:
                row = [c["pm_id"], subject_fund[c["pm_id"]]]
                row += scoped_values(e, metrics)
                row += [as_json(e.get(k)) for k in json_cols]
                rows.append(tuple(row))
        print(f"{table}: {insert_many(cur, table, cols, rows)}")

    # ---- 4. single-object sections ---------------------------------------------
    single_specs = (
        ("holdings", "FundHoldings", HOLDINGS_SCALARS, HOLDINGS_JSON),
        ("liquidity", "FundLiquidity", LIQUIDITY_SCALARS, ("liquidity_buckets",)),
        ("risk_framework", "FundRiskFramework", RISK_COLS, ()),
    )
    for section, table, scalars, json_cols in single_specs:
        cols = ("candidate_pm_id", "fund_id") + scalars + json_cols
        rows = []
        for c in candidates:
            obj = c.get(section)
            if not obj:
                continue
            row = [c["pm_id"], subject_fund[c["pm_id"]]]
            row += [as_str(obj.get(k)) if k in STRINGIFY else obj.get(k)
                    for k in scalars]
            row += [as_json(obj.get(k)) for k in json_cols]
            rows.append(tuple(row))
        print(f"{table}: {insert_many(cur, table, cols, rows)}")

    # ---- 5. FundReturnSeries -----------------------------------------------------
    series_rows = []
    for c in candidates:
        for f in c.get("funds") or []:
            for freq, by_basis in (f.get("returns") or {}).items():
                for basis, sv in (by_basis or {}).items():
                    dates = (sv or {}).get("dates") or []
                    values = (sv or {}).get("values") or []
                    series_rows += [(f["fund_id"], freq, basis, d, v)
                                    for d, v in zip(dates, values) if v is not None]
    n = insert_many(cur, "FundReturnSeries",
                    ("fund_id", "frequency", "basis", "period_date", "return_pct"),
                    series_rows)
    print(f"FundReturnSeries: {n}")

    # ---- 6. FundPortfolioPosition ------------------------------------------------
    pos_rows = []
    for c in candidates:
        for f in c.get("funds") or []:
            pos_rows += [(f["fund_id"], p["instrument"],
                          p.get("market_value"), p.get("currency"))
                         for p in f.get("portfolio") or []]
    n = insert_many(cur, "FundPortfolioPosition",
                    ("fund_id", "instrument", "market_value", "currency"),
                    pos_rows)
    print(f"FundPortfolioPosition: {n}")

    cn.commit()

    print("\nfinal row counts:")
    for t in ("Candidates", "Funds", "FundReturnSkill",
              "FundDownsideDistribution", "FundBenchmarkActiveness",
              "FundExposure", "FundHoldings", "FundLiquidity",
              "FundRiskFramework", "FundReturnSeries", "FundPortfolioPosition"):
        cur.execute(f"SELECT COUNT(*) FROM dbo.{t}")
        print(f"  {t}: {cur.fetchone()[0]}")
    cn.close()


if __name__ == "__main__":
    sys.exit(main())
