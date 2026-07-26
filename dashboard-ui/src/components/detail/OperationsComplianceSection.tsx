import type { CandidateRecord } from "../../api/types";
import { firstSection, list, str } from "../../api/sections";

interface Props {
  rec: CandidateRecord;
}

/** Operations & compliance — real data from `operations_compliance`. */
export function OperationsComplianceSection({ rec }: Props) {
  const ops = firstSection(rec, "operations_compliance");

  return (
    <section id="ops" className="sec">
      <div className="sec-head">
        <span className="sec-ic">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </span>
        <h2>Operations &amp; compliance</h2>
      </div>
      <div className="sec-body">
        <div className="grid">
          <div className="k">Auditor</div>
          <div className="v">{str(ops.auditor)}</div>
          <div className="k">Administrator</div>
          <div className="v">{str(ops.administrator)}</div>
          <div className="k">Legal Counsel</div>
          <div className="v">{str(ops.legal_counsel)}</div>
          <div className="k">Custodian</div>
          <div className="v">{str(ops.custodian)}</div>
          <div className="k">Regulatory Registrations</div>
          <div className="v">{list(ops.regulatory_registrations)}</div>
          <div className="k">ESG Score</div>
          <div className="v">{str(ops.esg_score)}</div>
        </div>
        {str(ops.compliance_framework) !== "—" && (
          <>
            <h3>Compliance framework</h3>
            <p className="prose">{str(ops.compliance_framework)}</p>
          </>
        )}
        {str(ops.benchmark_appropriateness_note) !== "—" && (
          <>
            <h3>Benchmark appropriateness</h3>
            <p className="prose">{str(ops.benchmark_appropriateness_note)}</p>
          </>
        )}
      </div>
    </section>
  );
}
