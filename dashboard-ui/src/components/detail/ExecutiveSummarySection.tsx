import { firstScoped, firstSection, str } from "../../api/sections";
import type { CandidateRecord } from "../../api/types";

interface Props {
  rec: CandidateRecord;
}

/** Executive summary — narrative rows assembled from real record fields
 *  (strategy/manager/market_views/classification), each falling back to a
 *  short generic sentence when its source field is unreported rather than
 *  leaving a blank row. Matches the design reference: a plain exec-row list,
 *  no scoring widget. */
export function ExecutiveSummarySection({ rec }: Props) {
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
