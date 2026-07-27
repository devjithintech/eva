import { firstScoped, firstSection, str } from "../../api/sections";
import type { CandidateRecord } from "../../api/types";

interface Props {
  rec: CandidateRecord;
}

/** Executive summary — narrative rows assembled from real record fields
 *  (executive_summary/strategy/manager/market_views/classification), most
 *  falling back to a short generic sentence when their source field is
 *  unreported rather than leaving a blank row. Matches the design reference:
 *  a plain exec-row list, no scoring widget. */
export function ExecutiveSummarySection({ rec }: Props) {
  const strategy = firstSection(rec, "strategy");
  const marketViews = firstSection(rec, "market_views");
  const classification = firstSection(rec, "classification");
  const executiveSummary = firstSection(rec, "executive_summary");

  const rows: { label: string; text: string }[] = [
    {
      label: "Overview",
      text: str(executiveSummary.overview),
    },
    {
      label: "Team",
      text: str(executiveSummary.team),
    },
    {
      label: "Track Record",
      text: str(executiveSummary.track_record),
    },
    {
      label: "Alpha Generation",
      text: str(executiveSummary.alpha_generation),
    },
    {
      label: "Market Opportunity",
      text: str(executiveSummary.market_opportunity),
    },
    {
      label: "Research Process",
      text: str(executiveSummary.research_process),
    },
    {
      label: "AUM",
      text: str(executiveSummary.aum),
    },
  ];

  return (
    <section id="summary" className="sec">
      <div className="sec-head">
        <span className="sec-ic">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
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
