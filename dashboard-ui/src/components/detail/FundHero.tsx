import { useState } from "react";
import type { CandidateRecord } from "../../api/types";
import { firstSection, str } from "../../api/sections";
import { Breadcrumbs } from "../layout/Breadcrumbs";
import { useSetStage } from "../../api/hooks";
import { CONVERSATION_URL } from "../../lib/env";

interface Props {
  rec: CandidateRecord;
}

export function FundHero({ rec }: Props) {
  const classification = firstSection(rec, "classification");
  const manager = firstSection(rec, "manager");
  const subjectFund = firstSection(rec, "subject_fund");
  const fundName = str(subjectFund.fund_name) !== "—" ? str(subjectFund.fund_name) : rec.name;
  const initials = rec.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const { setStage, saving } = useSetStage();
  const [advanced, setAdvanced] = useState(false);

  const advance = async () => {
    await setStage(rec.id, "interview");
    setAdvanced(true);
  };

  return (
    <div className="hero">
      <Breadcrumbs items={[{ label: "Home", href: CONVERSATION_URL }, { label: "Candidates & Funds", href: "#/" }, { label: rec.name }]} />
      <div className="hero-top">
        <span className="avatar-lg">{initials}</span>
        <h1>{fundName}</h1>
        <div className="hero-actions">
          <button type="button" className="btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="12" y1="3" x2="12" y2="21" />
            </svg>
            Compare
          </button>
          <button type="button" className="btn" onClick={() => { window.location.hash = `#/candidates/${rec.id}/peer-fit`; }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z" />
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
            </svg>
            Candidate Analytics
          </button>
          <button type="button" className="btn primary" disabled={saving || advanced} onClick={advance}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 15 15 9" />
              <path d="M11 9h4v4" />
            </svg>
            {advanced ? "Advanced for Interview" : "Advance for Interview"}
          </button>
        </div>
      </div>
      <div className="hero-meta">
        Managed by {str(manager.pm_name)} &nbsp;|&nbsp; {str(classification.manager_location)}
      </div>
      <div className="tagrow">
        <span className="tag">
          <b>Strategy</b> {str(classification.strategy_family)}
        </span>
        <span className="tag">
          <b>Base Currency</b> {str(classification.base_currency)}
        </span>
        <span className="tag">
          <b>Benchmark</b> {str(classification.stated_benchmark)}
        </span>
        <span className="tag">
          <b>Inception</b> {str(classification.inception_date)}
        </span>
        <span className="tag">
          <b>Vehicle</b> {str(classification.vehicle_type)}
        </span>
      </div>
    </div>
  );
}
