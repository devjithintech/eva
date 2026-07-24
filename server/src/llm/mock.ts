import { findCandidateInText } from "../data/candidates.js";
import { joinSystem, type LLMProvider, type ProviderStreamEvent, type StreamChatOptions } from "./types.js";

/**
 * Keyless fallback provider. Maps the latest user question to one artifact
 * tool + a spoken answer, mirroring the original LightHouse scripted demo so
 * the whole AG-UI pipeline works with zero configuration.
 */
interface Script {
  match: RegExp;
  tool: string;
  answer: string;
}

const SCRIPTS: Script[] = [
  {
    match: /surviv|perturbation|resilien|robust|\bwhich\b|highest|lowest|\bbest\b|\bworst\b|strongest|weakest|\bscreen\b|most (resilient|robust)/i,
    tool: "render_analysis",
    answer: "Here's the analysis — I've scored them on the metrics you asked about and pulled the winner to the top.",
  },
  {
    match: /\b(candidate list|fund list|top (candidate|fund)|top\s*\d+|top ten|leaderboard|list|rank|(all|full|every|entire|complete)\s+(available\s+)?(candidates?|funds?))\b/i,
    tool: "render_candidate_pool",
    answer:
      "Here's the candidate list, ranked across CAGR, Sharpe, alpha and max drawdown. Greener is better, red is worse.",
  },
  {
    match: /\b(pool|today|field|opportunity|funnel|scatter)\b/i,
    tool: "render_opportunity_map",
    answer:
      "Here's today's candidate pool — the opportunity map, how the pool splits, and where the funnel stands.",
  },
  {
    match: /\bcompare\b|\bcomparison\b|\bvs\.?\b|stack\s*up|side[- ]by[- ]side/i,
    tool: "render_comparison",
    answer: "Here's the side-by-side — profile, performance, risk, exposure and terms across the candidates you named.",
  },
  {
    match: /\breturns?\b|\d+\s*[-\s]?years?|trailing|performance|cagr|track record/i,
    tool: "render_returns",
    answer:
      "Five-year track record: cumulative growth versus KOSPI, calendar-year returns, and the headline risk-adjusted stats.",
  },
  {
    match: /benchmark|stack up|standard benchmark|correlation/i,
    tool: "render_benchmark_correlation",
    answer:
      "ANDA Cruise against the standard benchmarks — correlation across the peer set. It diversifies the book well.",
  },
  {
    match: /characteristic|key facts|profile|about (this )?(candidate|fund)/i,
    tool: "render_characteristics",
    answer:
      "Here's ANDA Cruise in brief: a multi-strategy Korean equity specialist. Its style DNA and key facts are on the right.",
  },
  {
    match: /worried|flag|concern|risk|watch[- ]?list/i,
    tool: "render_analyst_flags",
    answer: "Here are the analyst flags, grouped by severity — the high-severity items are pulled to the top.",
  },
  {
    match: /score|interview committee|scorecard|readiness|recommend/i,
    tool: "render_scorecard",
    answer:
      "Committee scorecard — overall 4.3 out of 5. My recommendation: advance to interview.",
  },
  {
    match: /\bexplain\b|how does|walk me through|in simple terms|what does .* mean/i,
    tool: "render_document",
    answer: "Here's a short explainer — key points and a couple of follow-ups are on the right.",
  },
];

const FALLBACK: Script = SCRIPTS.find((s) => s.tool === "render_characteristics")!;

/** A few well-known candidate names, so the scripted comparison can echo back
 *  whichever ones the user actually typed. */
const DEMO_CANDIDATES = ["Anda", "Azora", "Meadow Park", "Meson", "RichBrook", "Tind", "Winton"];

/** Metric phrases the scripted analysis echoes back when it spots them. */
const METRIC_HINTS = ["alpha", "beta", "sharpe", "sortino", "drawdown", "volatility", "perturbation", "stress", "survived", "return", "correlation", "aum", "fee", "positive months", "information ratio"];

export class MockProvider implements LLMProvider {
  readonly id = "mock";

  isConfigured(): boolean {
    return true;
  }

  async *streamChat(opts: StreamChatOptions): AsyncIterable<ProviderStreamEvent> {
    const lastUser = [...opts.messages].reverse().find((m) => m.role === "user");
    const question = lastUser?.content ?? "";
    const script = SCRIPTS.find((s) => s.match.test(question)) ?? FALLBACK;

    // Single-candidate views need a candidate: the one named in the question, or
    // the one in session focus (injected into the system prompt by runAgent). If
    // neither is clear, ask which candidate instead of guessing — mirroring the
    // live agent's ask-back path.
    let answer = script.answer;
    let toolArgs: Record<string, unknown> | null = null;

    if (script.tool === "render_analyst_flags" || script.tool === "render_scorecard") {
      // Single-candidate views: resolve the candidate or ask which one.
      const candidate = findCandidateInText(question) ?? focusFromSystem(joinSystem(opts.system));
      const isFlags = script.tool === "render_analyst_flags";
      if (candidate) {
        answer = isFlags
          ? `Here are ${candidate}'s analyst flags, grouped by severity — the high-severity items are pulled to the top.`
          : `Here's the committee scorecard for ${candidate} across track record, team, process, risk, operations and mandate fit.`;
        toolArgs = { candidate };
      } else {
        // No candidate to work with → ask back and render nothing.
        answer = isFlags
          ? "Which candidate's analyst flags would you like — name one from the pool?"
          : "Which candidate should I score for the committee — name one from the pool?";
      }
    } else if (script.tool === "render_candidate_pool") {
      toolArgs = /\b(full|all|entire|every|complete)\b/i.test(question) ? { all: true } : {};
    } else if (script.tool === "render_analysis") {
      const named = DEMO_CANDIDATES.filter((n) => new RegExp(`\\b${n}\\b`, "i").test(question));
      const metrics = METRIC_HINTS.filter((m) => question.toLowerCase().includes(m));
      toolArgs = { question, candidates: named, metrics: metrics.length ? metrics : ["alpha", "sharpe", "drawdown"] };
    } else if (script.tool === "render_comparison") {
      // Pull any demo candidates named in the question; fall back to a sample set.
      const named = DEMO_CANDIDATES.filter((n) => new RegExp(`\\b${n}\\b`, "i").test(question));
      toolArgs = { candidates: named.length >= 2 ? named : ["Anda", "Meson", "Winton"] };
    } else if (script.tool === "render_document") {
      toolArgs = {
        title: "Quick explainer",
        intro: "Here's a concise take on that — the essentials up top, with supporting detail you can expand.",
        keyPoints: ["The core idea in one line.", "Why it matters for candidate selection.", "A caveat to keep in mind."],
        callout: { tone: "tip", text: "Name a specific fund to get data-backed views instead of a general explainer." },
        sections: [{ title: "Supporting details", body: "In a live answer this would carry the fuller explanation and any sources." }],
        followups: ["Explain simply", "Compare two funds", "Show examples"],
      };
    } else if (script.tool === "render_returns") {
      const m = question.match(/(\d{1,2})\s*[-\s]?years?|last\s+(\d{1,2})/i);
      const years = m ? Number(m[1] ?? m[2]) : undefined;
      toolArgs = years ? { years } : {};
    } else {
      toolArgs = { candidateId: "anda-cruise" };
    }

    // Stream the answer word-by-word to exercise the text-delta path.
    const words = answer.split(" ");
    for (const word of words) {
      if (opts.signal?.aborted) return;
      yield { type: "text", delta: word + " " };
      await sleep(22);
    }

    if (toolArgs) yield { type: "tool", id: `mock-${Date.now()}`, name: script.tool, args: toolArgs };
  }
}

/** Recover the in-focus candidate from the focus line runAgent adds to the
 *  system prompt ("Candidate currently in focus this session: <name>."). */
function focusFromSystem(system: string): string | undefined {
  const m = system.match(/in focus this session:\s*([^.\n]+)/i);
  return m ? m[1].trim() : undefined;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
