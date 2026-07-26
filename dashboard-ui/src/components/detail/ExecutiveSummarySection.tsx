import { useScorecard } from "../../api/hooks";
import { firstScoped, firstSection, str } from "../../api/sections";
import type { CandidateRecord } from "../../api/types";
import { LoadingState } from "../common/LoadingState";
import { ErrorState } from "../common/ErrorState";

interface Props {
  id: string;
  rec: CandidateRecord;
}

function toneOf(overall: number): string {
  return overall >= 4.2 ? "green" : overall >= 3.5 ? "violet" : "amber";
}

/** Executive summary — the Committee scorecard widget (real, via
 *  GET /api/candidates/:id/scorecard) followed by narrative rows assembled
 *  from real record fields (strategy/manager/market_views/classification),
 *  each falling back to a short generic sentence when its source field is
 *  unreported rather than leaving a blank row. */
export function ExecutiveSummarySection({ id, rec }: Props) {
  const { data, loading, error } = useScorecard(id);
  const strategy = firstSection(rec, "strategy");
  const manager = firstSection(rec, "manager");
  const marketViews = firstSection(rec, "market_views");
  const classification = firstSection(rec, "classification");
  const fundName = str(firstSection(rec, "subject_fund").fund_name) !== "—" ? str(firstSection(rec, "subject_fund").fund_name) : rec.name;

  const rows: { label: string; text: string }[] = [
    {
      label: "Overview",
      text:
        str(strategy.description) !== "—"
          ? str(strategy.description)
          : `${fundName} is managed by ${str(manager.pm_name)}, focused on ${str(classification.strategy_family)}.`,
    },
    {
      label: "Team",
      text:
        str(manager.key_person_risk_note) !== "—"
          ? str(manager.key_person_risk_note)
          : `${str(manager.pm_name)} (${str(manager.current_role)}) leads a team of ${str(manager.team_size)} at ${str(manager.current_firm)}.`,
    },
    {
      label: "Track Record",
      text: `Track record begins ${str(classification.track_record_start_date) !== "—" ? str(classification.track_record_start_date) : str(classification.inception_date)}${
        classification.is_track_record_audited === true ? ", independently audited" : classification.is_track_record_audited === false ? ", not independently audited" : ""
      }.`,
    },
    {
      label: "Alpha Generation",
      text: str(strategy.investment_thesis_core) !== "—" ? str(strategy.investment_thesis_core) : "No documented alpha thesis on record for this candidate.",
    },
    {
      label: "Market Opportunity",
      text: str(marketViews.macro_thesis) !== "—" ? str(marketViews.macro_thesis) : "No documented market view on record for this candidate.",
    },
    {
      label: "Research Process",
      text: str(strategy.idea_generation) !== "—" ? str(strategy.idea_generation) : "No documented research process on record for this candidate.",
    },
    {
      label: "AUM",
      text: (() => {
        const aum = firstScoped(classification.current_aum_usd_mn);
        if (str(aum.value) === "—") return "AUM not disclosed for this candidate.";
        const asOf = str(aum.as_of_date) !== "—" ? ` as of ${str(aum.as_of_date)}` : "";
        return `Reported AUM was ${str(aum.value)}${asOf}.`;
      })(),
    },
  ];

  return (
    <section id="summary" className="sec">
      <div className="sec-head">
        <span className="sec-ic">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="7" rx="1.5" />
            <rect x="3" y="13" width="18" height="7" rx="1.5" />
          </svg>
        </span>
        <h2>Executive summary</h2>
      </div>
      <div className="sec-body">
        {loading && <LoadingState label="Scoring…" />}
        {!loading && (error || !data) && <ErrorState message={error ?? "No scorecard available"} />}
        {!loading && data && (
          <div className="sc-overall">
            <div className={`sc-overall-num ${toneOf(data.overall)}`}>{data.overall.toFixed(1)}</div>
            <div className="sc-overall-copy">
              <div className="rec">{data.recommendation}</div>
              <div className="rec-detail">{data.recommendationDetail}</div>
            </div>
          </div>
        )}
        {!loading && data && (
          <div className="sc-criteria">
            {data.criteria.map((c) => (
              <div className="sc-row" key={c.label}>
                <span className="sc-label">{c.label}</span>
                <span className="sc-track">
                  <span className={`sc-fill ${c.tone}`} style={{ width: `${(c.score / 5) * 100}%` }} />
                </span>
                <span className="sc-val">{c.score.toFixed(1)}</span>
              </div>
            ))}
          </div>
        )}

        {rows.map((r) => (
          <div className="exec-row" key={r.label}>
            <div className="exec-label">{r.label}</div>
            <div className="exec-text">{r.text}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
