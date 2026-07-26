import type { CandidateRecord } from "../../api/types";
import { firstSection, list, str } from "../../api/sections";

interface Props {
  rec: CandidateRecord;
}

/** Terms & redemption — split out of the old combined "Fees & terms"
 *  section. Real data from `terms_redemption`. */
export function TermsRedemptionSection({ rec }: Props) {
  const terms = firstSection(rec, "terms_redemption");

  return (
    <section id="terms" className="sec">
      <div className="sec-head">
        <span className="sec-ic">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
          </svg>
        </span>
        <h2>Terms &amp; redemption</h2>
      </div>
      <div className="sec-body">
        <div className="grid">
          <div className="k">Fund Structure</div>
          <div className="v">{str(terms.fund_structure)}</div>
          <div className="k">Minimum Investment</div>
          <div className="v">{str(terms.minimum_investment)}</div>
          <div className="k">Redemption Frequency</div>
          <div className="v">{str(terms.redemption_frequency)}</div>
          <div className="k">Redemption Notice</div>
          <div className="v">{str(terms.redemption_notice_days) === "—" ? "—" : `${terms.redemption_notice_days} days`}</div>
          <div className="k">Lockup</div>
          <div className="v">{str(terms.lockup)}</div>
          <div className="k">Share Classes</div>
          <div className="v">{list(terms.share_classes)}</div>
        </div>
      </div>
    </section>
  );
}
