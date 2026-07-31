import type { LLMTool } from "../llm/types.js";

/**
 * Generative-UI tools. The model picks *which view to render* and *for which
 * entities*; it never produces the numbers. Each call becomes an AG-UI
 * TOOL_CALL event the frontend renders as a React artifact.
 */
const candidateIdParam = {
  type: "string",
  description: "Candidate/fund id to render. Defaults to 'anda-cruise'.",
};

export const ARTIFACT_TOOLS: LLMTool[] = [
  {
    name: "render_opportunity_map",
    description:
      "Show the CANDIDATE POOL overview: the opportunity scatter map (candidates by CAGR × drawdown) plus the analyzed→shortlisted→interview funnel. Use when the user asks for the 'candidate pool', \"today's candidate pool\", 'how's the pool', the field today, the opportunity map, or the funnel. Do NOT use for the ranked candidate list — that's render_candidate_pool.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "render_candidate_pool",
    description:
      "Show the ranked CANDIDATE LIST as a table across CAGR, Sharpe, alpha and max drawdown (top N by CAGR, default 10). Use when the user asks for the 'candidate list', 'top candidate list', 'top candidates', the leaderboard, or a ranking. For 'full / all / entire / complete / show all candidates', set all=true to show every candidate; otherwise pass `n` for a specific count ('top 5', 'top 20'). Do NOT use for 'candidate pool' or \"today's pool\" — that's render_opportunity_map.",
    parameters: {
      type: "object",
      properties: {
        n: { type: "integer", description: "How many top candidates to show. Defaults to 10.", minimum: 1 },
        all: { type: "boolean", description: "Show the full list (every candidate) instead of the top N. Set true for 'full / all / entire / complete candidate list'." },
      },
      required: [],
    },
  },
  {
    name: "render_comparison",
    description:
      "Render a side-by-side comparison matrix of TWO OR MORE named candidates across profile, performance, risk, exposure and terms metrics. Pass every candidate to compare in the `candidates` array, in the order they should appear as columns. Only call this once at least two candidates are clear from the conversation — never guess or default them. If the user asks to compare but hasn't named at least two candidates from our pool, ask which ones first instead of calling this.",
    parameters: {
      type: "object",
      properties: {
        candidates: {
          type: "array",
          items: { type: "string" },
          description: "Two or more candidate names or ids to compare, e.g. ['Anda', 'Meson', 'Winton'].",
          minItems: 2,
        },
      },
      required: ["candidates"],
    },
  },
  {
    name: "render_analysis",
    description:
      "The FLEXIBLE analytical view — use it for open-ended, multi-criteria, or 'which is best/worst/survived' questions that the specific views above don't cleanly cover. It ranks, compares, or screens funds by ANY combination of metrics and renders a verdict + table + chart. Pass the metrics the user mentioned as free text in `metrics` (e.g. ['alpha','beta','drawdown','stress survival']) — they're resolved server-side, so don't worry about exact names. Pass `candidates` to compare specific funds; omit it to screen the whole pool. Examples: 'which of these two survived perturbation with the highest alpha, lowest beta and minimal drawdown', 'rank the pool by risk-adjusted return', 'who has the best Sharpe and lowest drawdown'.",
    parameters: {
      type: "object",
      properties: {
        question: { type: "string", description: "The user's question, verbatim — used as the view's title." },
        candidates: { type: "array", items: { type: "string" }, description: "Specific fund/candidate names or ids to analyse. Omit to screen the whole pool." },
        metrics: { type: "array", items: { type: "string" }, description: "Metrics mentioned, as free text — e.g. ['alpha','lowest beta','minimal drawdown','survived perturbation','Sharpe']. Resolved server-side." },
        mode: { type: "string", enum: ["compare", "rank", "screen"], description: "compare = named funds head-to-head; rank/screen = across the pool. Defaults sensibly." },
      },
      required: ["metrics"],
    },
  },
  {
    name: "render_document",
    description:
      "FALLBACK view for a question that no other tool fits — a general or explanatory answer about our candidates, strategies, or investing concepts that isn't a specific chart/table. Compose a structured written answer. Use this instead of leaving the canvas empty. Do NOT use it for out-of-scope questions (decline those in chat with no tool). Never fabricate fund-specific figures here — speak generally or defer to a data view.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short heading for the answer." },
        intro: { type: "string", description: "1–2 sentence opening paragraph." },
        keyPoints: { type: "array", items: { type: "string" }, description: "The main takeaways, as short bullet points." },
        callout: {
          type: "object",
          description: "An optional highlighted tip / warning / important note.",
          properties: { tone: { type: "string", enum: ["tip", "warning", "important"] }, text: { type: "string" } },
        },
        body: { type: "string", description: "Optional extra detail as markdown (a table, code, or a longer explanation) when relevant." },
        sections: {
          type: "array",
          description: "Collapsible groups, e.g. Sources, Supporting details, Related resources.",
          items: { type: "object", properties: { title: { type: "string" }, body: { type: "string" } } },
        },
        followups: { type: "array", items: { type: "string" }, description: "2–4 suggested follow-up questions, shown as clickable chips (e.g. 'Explain simply', 'Compare', 'Examples')." },
      },
      required: ["intro"],
    },
  },
  {
    name: "render_returns",
    description:
      "Show a candidate's trailing performance over N years (growth curve vs benchmark, calendar-year returns, headline stats). Defaults to 5 years; pass `years` for a different window (e.g. 'last 10 years' → years: 10). Needs a candidate — uses the in-focus candidate if not named; ask which candidate if none is named or in focus.",
    parameters: {
      type: "object",
      properties: {
        candidate: { type: "string", description: "Candidate or fund name or id, e.g. 'Anda' or 'Meson'." },
        years: { type: "integer", description: "Trailing window in years. Defaults to 5.", minimum: 1 },
      },
      required: [],
    },
  },
  {
    name: "render_benchmark_correlation",
    description:
      "Show the peer correlation matrix against the standard benchmark peer set. Use for 'how does it stack up against our benchmarks' / diversification questions.",
    parameters: { type: "object", properties: { candidateId: candidateIdParam }, required: [] },
  },
  {
    name: "render_characteristics",
    description:
      "Show a candidate's profile: AUM, strategy family, style DNA tags and key facts. Use for 'what are the key characteristics' / 'tell me about <candidate>'. Works for ANY candidate in the pool — pass the one the user named; uses the in-focus candidate if not named.",
    parameters: {
      type: "object",
      properties: { candidate: { type: "string", description: "Candidate or fund name or id, e.g. 'Meson' or 'Anda'." } },
      required: [],
    },
  },
  {
    name: "render_analyst_flags",
    description:
      "Show a candidate's analyst flags (diligence watch-list), grouped by severity. Use for 'anything the committee should be worried about / any risks'. Needs a candidate — uses the in-focus candidate if not named; ask which candidate if none is named or in focus.",
    parameters: {
      type: "object",
      properties: { candidate: { type: "string", description: "Candidate or fund name or id, e.g. 'Anda'." } },
      required: [],
    },
  },
  {
    name: "render_scorecard",
    description:
      "Show the committee scorecard (track record, team, process, risk, operations, mandate fit) and interview-readiness recommendation for ONE candidate. Use for 'score this candidate for the committee'. Needs a candidate — uses the in-focus candidate if not named; ask which candidate if none is named or in focus.",
    parameters: {
      type: "object",
      properties: { candidate: { type: "string", description: "Candidate or fund name or id, e.g. 'Anda' or 'Meson'." } },
      required: [],
    },
  },
];
