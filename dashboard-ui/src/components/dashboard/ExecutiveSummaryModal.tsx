import { useCandidate } from "../../api/hooks";
import { firstSection, pct, signedPct, str } from "../../api/sections";

interface Props {
  id: string | null;
  onClose: () => void;
}

interface Metric {
  label: string;
  value: string;
  tone?: "pos" | "neg";
}

/** Executive summary quick-view (the reference's "zap" modal) — same real
 *  record `useCandidate` already fetches for the detail page, just narrowed
 *  to a metrics grid (Sharpe/Sortino/Return/Alpha/Beta/Vol/Drawdown/Best-
 *  Worst-month/Positive-months, whichever are actually reported) plus the
 *  same executive_summary narrative rows as ExecutiveSummarySection. Metrics
 *  with no reported value are omitted rather than shown as "—". */
export function ExecutiveSummaryModal({ id, onClose }: Props) {
  const { data: rec, loading } = useCandidate(id);

  if (!id) return null;

  const subjectFund = rec ? firstSection(rec, "subject_fund") : {};
  const manager = rec ? firstSection(rec, "manager") : {};
  const classification = rec ? firstSection(rec, "classification") : {};
  const returnSkill = rec ? firstSection(rec, "return_skill") : {};
  const downside = rec ? firstSection(rec, "downside_distribution") : {};
  const benchmark = rec ? firstSection(rec, "benchmark_activeness") : {};
  const execSummary = rec ? firstSection(rec, "executive_summary") : {};

  const fundName = rec ? (str(subjectFund.fund_name) !== "—" ? str(subjectFund.fund_name) : rec.name) : "—";
  const pmName = str(manager.pm_name);
  const location = str(classification.manager_location);
  const subtitle = [pmName !== "—" ? `Managed by ${pmName}` : null, location !== "—" ? location : null].filter(Boolean).join("  |  ");

  const metrics: Metric[] = [];
  const addRatio = (label: string, raw: unknown) => {
    if (typeof raw === "number") metrics.push({ label, value: raw.toFixed(2) });
  };
  const addPct = (label: string, raw: unknown, tone?: "pos" | "neg" | "auto") => {
    if (typeof raw !== "number") return;
    const value = tone === "auto" ? signedPct(raw) : pct(raw, 2);
    metrics.push({ label, value, tone: tone === "auto" ? (raw >= 0 ? "pos" : "neg") : tone });
  };
  addRatio("Sharpe Ratio", returnSkill.sharpe_ratio);
  addRatio("Sortino Ratio", returnSkill.sortino_ratio);
  addPct("Annualised Return", returnSkill.annualized_return_pct, "auto");
  addPct("Alpha (Annualised)", returnSkill.alpha_annualized_pct, "auto");
  addRatio("Beta", benchmark.beta);
  addPct("Ann. Volatility", downside.volatility_pct);
  addPct("Max Drawdown", downside.max_drawdown_pct, "neg");
  addPct("Best Month", downside.best_month_pct, "pos");
  addPct("Worst Month", downside.worst_month_pct, "neg");
  addPct("Positive Months", downside.positive_months_pct);

  const sections = [
    { label: "Overview", text: str(execSummary.overview) },
    { label: "Team", text: str(execSummary.team) },
    { label: "Track Record", text: str(execSummary.track_record) },
    { label: "Alpha Generation", text: str(execSummary.alpha_generation) },
    { label: "Market Opportunity", text: str(execSummary.market_opportunity) },
    { label: "Research Process", text: str(execSummary.research_process) },
    { label: "AUM", text: str(execSummary.aum) },
  ].filter((s) => s.text !== "—");

  return (
    <div
      className="pref-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pref-dialog ex-dialog" role="dialog" aria-modal="true" aria-label="Executive summary">
        <div className="pref-head">
          <div>
            <div className="pref-title">{fundName}</div>
            {subtitle && <div className="pref-desc">{subtitle}</div>}
          </div>
          <button className="pref-x" aria-label="Close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="ex-body">
          {loading && <p className="note">Loading…</p>}
          {!loading && metrics.length > 0 && (
            <div className="ex-grid">
              {metrics.map((m) => (
                <div className="ex-cell" key={m.label}>
                  <div className="ex-lab">{m.label}</div>
                  <div className={`ex-val ${m.tone ?? ""}`}>{m.value}</div>
                </div>
              ))}
            </div>
          )}
          {!loading &&
            sections.map((s) => (
              <div className="ex-sec" key={s.label}>
                <div className="ex-h">{s.label}</div>
                <p className="ex-p">{s.text}</p>
              </div>
            ))}
          {!loading && metrics.length === 0 && sections.length === 0 && <p className="note">No executive summary data on record for this candidate.</p>}
        </div>
      </div>
    </div>
  );
}
