import { useCandidate, useScorecard } from "../../api/hooks";
import { firstSection, str } from "../../api/sections";
import { LoadingState } from "../common/LoadingState";
import { ErrorState } from "../common/ErrorState";

interface Props {
  id: string;
}

export function CandidateRowDetail({ id }: Props) {
  const { data: rec, loading, error } = useCandidate(id);
  const { data: scorecard } = useScorecard(id);

  if (loading) return <LoadingState label="Loading fund profile…" />;
  if (error || !rec) return <ErrorState message={error ?? "Not found"} />;

  const classification = firstSection(rec, "classification");
  const manager = firstSection(rec, "manager");
  const subjectFund = firstSection(rec, "subject_fund");
  const fundName = str(subjectFund.fund_name) !== "—" ? str(subjectFund.fund_name) : rec.name;
  const geo = Array.isArray(classification.geographic_focus)
    ? (classification.geographic_focus as unknown[]).map(String)
    : [];

  return (
    <div className="cd-wrap">
      <div className="cd-eyebrow">Fund profile · {str(classification.strategy_family)}</div>
      <div className="cd-fund">{fundName}</div>
      <div className="cd-meta">
        <div className="cd-mi">
          <div className="cd-ml">Portfolio Manager</div>
          <div className="cd-mv">{str(manager.pm_name)}</div>
        </div>
        <div className="cd-mi">
          <div className="cd-ml">Firm</div>
          <div className="cd-mv">{str(manager.current_firm)}</div>
        </div>
        <div className="cd-mi">
          <div className="cd-ml">Location</div>
          <div className="cd-mv">{str(classification.manager_location)}</div>
        </div>
        <div className="cd-mi">
          <div className="cd-ml">Base Currency</div>
          <div className="cd-mv">{str(classification.base_currency)}</div>
        </div>
        {scorecard && (
          <div className="cd-mi">
            <div className="cd-ml">Committee score</div>
            <div className="cd-mv">{scorecard.overall.toFixed(1)} / 5</div>
          </div>
        )}
      </div>
      <div className="cd-actions">
        {geo.map((g) => (
          <span key={g} className="tag">
            {g}
          </span>
        ))}
        <a className="btn" href={`#/candidates/${id}`}>
          View full profile →
        </a>
        <a className="btn" href={`#/candidates/${id}/peer-fit`}>
          Peer fit &amp; sim
        </a>
      </div>
    </div>
  );
}
