/** UI-only demo data: suggestion chips, collaborators, attachment samples. */

// A guided conversation: the first question names two real funds so the
// follow-ups ("these funds", "based on these") carry proper context. Ordered —
// the UI surfaces the next one after each turn.
export const SUGGESTED_QUESTIONS = [
  "Can you show me the current shortlisted candidate pool?",
  "Which of these survived perturbation and achieved the highest alpha production, the lowest beta and minimal drawdown?Anda , Tind",
  "List the best 2 funds from that group and show me the irreducibility of these funds.",
  "Combine irreducibility and perturbability to achieve the highest margin of safety. Explain why.",
  "Based on these, what is the ttl (Time to Liquidate)?",
];

export interface TeamMember {
  id: string;
  init: string;
  name: string;
  role: string;
  color: string;
}

export const TEAM_MEMBERS: TeamMember[] = [
  { id: "dp", init: "D", name: "David Park", role: "CEO", color: "#16a34a" },
  { id: "ps", init: "P", name: "Priya Shah", role: "Lead Analyst", color: "#7c3aed" },
  { id: "sl", init: "S", name: "Sung Lee", role: "Operations DD", color: "#ea7a1d" },
];

export const YOU = { init: "MM", name: "Morgan Moore (You)", short: "Morgan (You)", color: "#6354f2" };

export const ATTACH_SAMPLES = [
  "ANDA_Cruise_factsheet.pdf",
  "DDQ_2024.xlsx",
  "Audited_returns.pdf",
  "IC_memo_draft.docx",
];
