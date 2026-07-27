import { useState } from "react";
import type { CandidateRecord } from "../../api/types";
import { AnnualBarGraph } from "./AnnualBarGraph";
import { MonthlyGrowthGraph, MONTHS } from "./MonthlyGrowthGraph";
import type { MonthlyPoint } from "./MonthlyGrowthGraph";
import { PortfolioValueGraph } from "./PortfolioValueGraph";

interface Props {
  rec: CandidateRecord;
}

type Basis = "net" | "gross";

interface Series {
  dates: string[];
  values: number[];
}

interface FundReturns {
  monthly: Record<Basis, Series>;
  annual: Record<Basis, Series>;
}

interface PortfolioRow {
  instrument?: string;
  market_value?: number;
  currency?: string;
}

interface FundRecord {
  fund_id?: string;
  fund_name?: string;
  strategy?: string | null;
  aum?: number | null;
  aum_currency?: string | null;
  submitted_at?: string | null;
  portfolio?: PortfolioRow[];
  returns?: FundReturns;
}

function fmtAum(aum: unknown, currency: unknown): string | null {
  if (typeof aum !== "number") return null;
  const ccy = typeof currency === "string" && currency ? ` ${currency}` : "";
  return `${(aum / 1e9).toFixed(2)}bn${ccy}`;
}

function fmtDate(iso: unknown): string {
  return typeof iso === "string" && iso.length >= 10 ? iso.slice(0, 10) : "—";
}

/** Cumulative growth-of-100, month over month, from decimal fractional
 *  returns (0.0317 = +3.17%) — same math as the reference's own buildGraph(). */
function monthlyGrowth(series: Series): MonthlyPoint[] {
  let cum = 100;
  const out: MonthlyPoint[] = [];
  for (let i = 0; i < series.dates.length; i++) {
    const v = series.values[i];
    if (typeof v !== "number") continue;
    cum *= 1 + v;
    out.push({ date: series.dates[i], value: cum - 100, ret: v * 100 });
  }
  return out;
}

/** Year × month raw-return grid for the Table view of a monthly series. */
function monthlyGrid(series: Series): { years: string[]; grid: Record<string, (number | null)[]> } {
  const grid: Record<string, (number | null)[]> = {};
  const years: string[] = [];
  for (let i = 0; i < series.dates.length; i++) {
    const year = series.dates[i].slice(0, 4);
    const month = Number(series.dates[i].slice(5, 7)) - 1;
    if (!grid[year]) {
      grid[year] = new Array(12).fill(null);
      years.push(year);
    }
    const v = series.values[i];
    grid[year][month] = typeof v === "number" ? v * 100 : null;
  }
  return { years, grid };
}

function annualRows(series: Series): { label: string; value: number }[] {
  return series.dates
    .map((d, i) => ({ label: d.slice(0, 4), value: series.values[i] }))
    .filter((r): r is { label: string; value: number } => typeof r.value === "number")
    .map((r) => ({ label: r.label, value: r.value * 100 }));
}

const basisLabel = (b: Basis) => (b === "net" ? "Net" : "Gross");

function MonthlyReturnsBlock({ basis, series }: { basis: Basis; series: Series }) {
  const [view, setView] = useState<"graph" | "table">("graph");
  const points = monthlyGrowth(series);
  const { years, grid } = monthlyGrid(series);

  return (
    <>
      <h4>
        Monthly · {basisLabel(basis)}
        <span className="seg">
          <button type="button" className={view === "graph" ? "on" : ""} onClick={() => setView("graph")}>
            Graph
          </button>
          <button type="button" className={view === "table" ? "on" : ""} onClick={() => setView("table")}>
            Table
          </button>
        </span>
      </h4>
      {view === "graph" ? (
        <MonthlyGrowthGraph points={points} basis={basisLabel(basis)} basisKey={basis} />
      ) : (
        <table className="returns-grid">
          <thead>
            <tr>
              <th>Year</th>
              {MONTHS.map((m) => (
                <th key={m}>{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {years.map((y) => (
              <tr key={y}>
                <td>{y}</td>
                {grid[y].map((v, i) =>
                  v == null ? (
                    <td className="num blank" key={i}>
                      ·
                    </td>
                  ) : (
                    <td className={`num ${v < 0 ? "neg" : ""}`} key={i}>
                      {v.toFixed(2)}%
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function AnnualReturnsBlock({ basis, series, showBasis }: { basis: Basis; series: Series; showBasis: boolean }) {
  const [view, setView] = useState<"graph" | "table">("graph");
  const rows = annualRows(series);

  return (
    <>
      <h4>
        {showBasis ? `Annual · ${basisLabel(basis)}` : "Annual"}
        <span className="seg">
          <button type="button" className={view === "graph" ? "on" : ""} onClick={() => setView("graph")}>
            Graph
          </button>
          <button type="button" className={view === "table" ? "on" : ""} onClick={() => setView("table")}>
            Table
          </button>
        </span>
      </h4>
      {view === "graph" ? (
        <AnnualBarGraph rows={rows} />
      ) : (
        <table className="data annual">
          <thead>
            <tr>
              <th>Year</th>
              <th className="r">Return</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td>{r.label}</td>
                <td className={`num ${r.value >= 0 ? "pos" : "neg"}`}>
                  {r.value >= 0 ? "+" : ""}
                  {r.value.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

/** Portfolio holdings — a tiered value-area chart of the fund's long
 *  (positive market-value) positions, largest first, toggled against the
 *  same flat instrument table, exactly like the reference's own
 *  "Portfolio (N)" block. The graph only builds when there are at least 3
 *  positive-value rows to plot (a long/short book can be nearly all
 *  zero/negative rows after netting) — otherwise it's table-only, same as
 *  the reference's own `if(data.length<3)return;` guard. */
function PortfolioBlock({ portfolio }: { portfolio: PortfolioRow[] }) {
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<"graph" | "list">("graph");
  const positive = portfolio
    .map((p) => ({ instrument: p.instrument ?? "—", value: p.market_value ?? 0 }))
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value);
  const canGraph = positive.length >= 3;
  const currency = portfolio.find((p) => p.currency)?.currency ?? "";
  const visible = expanded ? portfolio : portfolio.slice(0, 10);

  return (
    <>
      <h4>
        Portfolio ({portfolio.length})
        {canGraph && (
          <span className="seg">
            <button type="button" className={view === "graph" ? "on" : ""} onClick={() => setView("graph")}>
              Graph
            </button>
            <button type="button" className={view === "list" ? "on" : ""} onClick={() => setView("list")}>
              List
            </button>
          </span>
        )}
      </h4>
      {canGraph && view === "graph" ? (
        <PortfolioValueGraph rows={positive} currency={currency} />
      ) : (
        <>
          <table className="data">
            <thead>
              <tr>
                <th>Instrument</th>
                <th className="r">Market value</th>
                <th>Ccy</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p, i) => (
                <tr key={i}>
                  <td>{p.instrument ?? "—"}</td>
                  <td className="num">
                    {typeof p.market_value === "number" ? p.market_value.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}
                  </td>
                  <td className="basis">{p.currency ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {portfolio.length > 10 && (
            <button type="button" className="show-more" onClick={() => setExpanded((v) => !v)}>
              {expanded ? "Show less" : `Show all ${portfolio.length} instruments`}
            </button>
          )}
        </>
      )}
    </>
  );
}

const BASES: Basis[] = ["net", "gross"];
const emptySeries: Series = { dates: [], values: [] };

/** One fund's real portfolio + monthly/annual return series (`fund.portfolio`,
 *  `fund.returns`), matching the reference's fund-card exactly — monthly
 *  wins over annual per basis when both are reported, since that's the
 *  richer of the two. */
function FundCard({ fund }: { fund: FundRecord }) {
  const returns = fund.returns;
  const monthlyBases = BASES.filter((b) => (returns?.monthly[b]?.dates.length ?? 0) > 0);
  const annualOnlyBases = BASES.filter(
    (b) => !monthlyBases.includes(b) && (returns?.annual[b]?.dates.length ?? 0) > 0,
  );
  const portfolio = Array.isArray(fund.portfolio) ? fund.portfolio : [];

  const aum = fmtAum(fund.aum, fund.aum_currency);
  const chips: { label: string; value: string }[] = [];
  if (aum) chips.push({ label: "AUM", value: aum });
  if (typeof fund.strategy === "string" && fund.strategy) chips.push({ label: "Strategy", value: fund.strategy });
  chips.push({ label: "As of", value: fmtDate(fund.submitted_at) });

  return (
    <div className="fund-card">
      <div className="fund-head">
        <span className="fund-name">{fund.fund_name ?? "—"}</span>
        <span className="fund-id">{fund.fund_id ?? ""}</span>
      </div>
      <div className="fchips">
        {chips.map((c) => (
          <span className="fchip" key={c.label}>
            <b>{c.label}</b>
            {c.value}
          </span>
        ))}
      </div>
      {monthlyBases.map((b) => (
        <MonthlyReturnsBlock key={b} basis={b} series={returns?.monthly[b] ?? emptySeries} />
      ))}
      {annualOnlyBases.map((b) => (
        <AnnualReturnsBlock key={b} basis={b} series={returns?.annual[b] ?? emptySeries} showBasis={annualOnlyBases.length > 1} />
      ))}
      {monthlyBases.length === 0 && annualOnlyBases.length === 0 && (
        <p className="note">No return series on record for this fund.</p>
      )}
      {portfolio.length > 0 && <PortfolioBlock portfolio={portfolio} />}
    </div>
  );
}

/** Returns by fund — one card per real vehicle in `rec.funds` (subject fund,
 *  siblings, and any other reported vehicle alike): its own name/id, AUM +
 *  strategy + as-of chips, monthly (or annual, when that's all that's
 *  reported) return series, and portfolio holdings. Not gated by a
 *  subject/sibling badge like Performance — every fund the record actually
 *  reports returns data for gets its own card, exactly as the reference
 *  renders this section. */
export function ReturnsByFundSection({ rec }: Props) {
  const funds = (Array.isArray(rec.funds) ? rec.funds : []) as FundRecord[];

  return (
    <section id="returns" className="sec">
      <div className="sec-head">
        <span className="sec-ic">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="9" x2="9" y2="21" />
            <line x1="15" y1="9" x2="15" y2="21" />
          </svg>
        </span>
        <h2>Returns by fund</h2>
      </div>
      <div className="sec-body">
        {funds.length === 0 && <p className="note">No fund-level returns on record for this candidate.</p>}
        {funds.map((f, i) => (
          <FundCard key={f.fund_id ?? i} fund={f} />
        ))}
      </div>
    </section>
  );
}
