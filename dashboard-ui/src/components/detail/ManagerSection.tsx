import type { CandidateRecord } from "../../api/types";
import { firstSection, str } from "../../api/sections";

interface Props {
  rec: CandidateRecord;
}

export function ManagerSection({ rec }: Props) {
  const manager = firstSection(rec, "manager");
  const priorFirms = Array.isArray(manager.notable_prior_firms) ? (manager.notable_prior_firms as unknown[]).map(String) : [];
  const education = Array.isArray(manager.pm_education) ? (manager.pm_education as unknown[]).map(String) : [];
  const team = Array.isArray(manager.team_members) ? (manager.team_members as Record<string, unknown>[]) : [];
  const career = Array.isArray(manager.pm_career_history) ? (manager.pm_career_history as Record<string, unknown>[]) : [];

  return (
    <section id="manager" className="sec">
      <div className="sec-head">
        <span className="sec-ic">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
        </span>
        <h2>Manager &amp; team</h2>
      </div>
      <div className="sec-body">
        <div className="grid">
          <div className="k">PM</div>
          <div className="v">{str(manager.pm_name)}</div>
          <div className="k">Current Firm</div>
          <div className="v">{str(manager.current_firm)}</div>
          <div className="k">Current Role</div>
          <div className="v">{str(manager.current_role)}</div>
          <div className="k">Experience</div>
          <div className="v">{str(manager.experience_years)} years</div>
          <div className="k">Team Size</div>
          <div className="v">{str(manager.team_size)}</div>
          <div className="k">Solo PM</div>
          <div className="v">{str(manager.is_solo_pm)}</div>
        </div>

        {str(manager.key_person_risk_note) !== "—" && <p className="note" style={{ marginTop: 12 }}>{str(manager.key_person_risk_note)}</p>}

        {(education.length > 0 || priorFirms.length > 0) && (
          <>
            <h3>Background</h3>
            {education.length > 0 && (
              <p className="prose">
                <b>Education:</b> {education.join(", ")}
              </p>
            )}
            {priorFirms.length > 0 && (
              <p className="prose">
                <b>Notable prior firms:</b> {priorFirms.join(", ")}
              </p>
            )}
          </>
        )}

        {career.length > 0 && (
          <>
            <h3>Career</h3>
            <table className="data">
              <thead>
                <tr>
                  <th>Firm</th>
                  <th>Role</th>
                  <th className="r">Start</th>
                  <th className="r">End</th>
                </tr>
              </thead>
              <tbody>
                {career.map((c, i) => (
                  <tr key={i}>
                    <td>{str(c.firm)}</td>
                    <td>{str(c.role)}</td>
                    <td className="num">{str(c.start_year)}</td>
                    <td className="num">{c.end_year == null ? "Present" : str(c.end_year)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {team.length > 0 && (
          <>
            <h3>Team</h3>
            <table className="data">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Title</th>
                  <th className="r">Experience</th>
                </tr>
              </thead>
              <tbody>
                {team.map((m, i) => (
                  <tr key={i}>
                    <td>{str(m.name)}</td>
                    <td>{str(m.title)}</td>
                    <td className="num">{str(m.experience_years)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </section>
  );
}
