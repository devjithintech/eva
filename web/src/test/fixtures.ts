/**
 * Sample AG-UI artifact payloads for the Test UI page — mirrors the server's
 * data builders (server/src/data/candidates.ts) so every artifact the agent can
 * render is previewable without a live agent run. One entry per ArtifactKind.
 */
import type { ArtifactKind, ArtifactPayload, Candidate } from "../agui/artifacts";

const ANDA_CRUISE: Candidate = {
  id: "anda-cruise",
  name: "ANDA Cruise",
  manager: "Young Kwang Joo",
  location: "Seoul",
  teamSize: 42,
  aum: "₩412B",
  strategyFamily: "multi_strategy",
  netExposure: "22%",
  benchmark: "KOSPI",
  currency: "KRW",
  inception: "2014-05-15",
  vehicle: "commingled_fund",
  blurb:
    "Flagship multi-strategy fund with the longest track record at the firm. Exploits structural inefficiencies in the Korean equity market across four sleeves, run at consistently low net exposure.",
  styleTags: [
    { label: "Event-driven", primary: true },
    { label: "Special situations", primary: true },
    { label: "Equity value pairs", primary: true },
    { label: "CB arbitrage", primary: true },
    { label: "Korea-only", primary: false },
    { label: "Low net exposure", primary: false },
  ],
};

const CORR_FUNDS = [
  "ANDA Cruise",
  "LH — Qianyan 500 MN",
  "LH — RL Onshore MN",
  "LH — Minghong Jupiter China",
  "LH — Mingshi Maxima",
  "LH — Minghong Multistrategy",
  "LH — Alphachi MN",
  "LH — Wanyan MN — SXV601",
  "LH — WizardQuant Onshore MN",
  "LH — Wanyan MN — STA785",
  "LH — Century Frontier Onshore",
  "LH — Minghong 300 MN",
  "LH — Maoyuan (MN)",
  "LH — Goku Onshore MN",
  "LH — Jasper onshore MN",
  "LH — Tianyan MN",
  "LH — Jinde MN",
  "LH — Pandtong CSI1000 MN",
  "LH — Pandtong CSI500 MN",
];

const ANDA_CORR = [
  null, 0.51, 0.47, 0.63, 0.53, 0.47, 0.42, 0.47, 0.34, 0.41, 0.53, 0.17, 0.12,
  0.24, 0.04, -0.18, -0.02, -0.02, 0.02,
];

function buildCorrelationMatrix(): (number | null)[][] {
  const n = CORR_FUNDS.length;
  const m: (number | null)[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) m[i][i] = null;
  for (let j = 1; j < n; j++) {
    m[0][j] = ANDA_CORR[j];
    m[j][0] = ANDA_CORR[j];
  }
  const rng = (a: number, b: number) => {
    const x = Math.sin((a + 1) * 374.13 + (b + 1) * 977.31) * 43758.5453;
    return x - Math.floor(x);
  };
  for (let i = 1; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let v = 0.2 + rng(i, j) * 0.55;
      if (rng(j, i * 2) < 0.05) v = -(0.02 + rng(i, j * 3) * 0.2);
      v = Math.round(v * 100) / 100;
      m[i][j] = v;
      m[j][i] = v;
    }
  }
  return m;
}

/** Every artifact payload, keyed by kind — in the order the picker/canvas uses. */
export const ARTIFACT_FIXTURES: Record<ArtifactKind, ArtifactPayload> = {
  opportunity_map: {
    kind: "opportunity_map",
    title: "Candidate pool — opportunity map",
    funnel: { scored: 57, shortlisted: 0, interview: 0 },
    pool: { candidates: 57, funds: 104 },
    points: [
      { name: "Anneal", cagr: 23, dd: -5.3, stage: "interview" },
      { name: "Meson", cagr: 21.6, dd: -11.3, stage: "shortlisted" },
      { name: "Tind", cagr: 20.5, dd: -29.8, stage: "shortlisted" },
      { name: "ClearAlpha", cagr: 19.8, dd: -4.2, stage: "scored" },
      { name: "Anda", cagr: 10.5, dd: -3.1, stage: "scored" },
      { name: "Winton", cagr: 4.5, dd: -24, stage: "scored" },
    ],
  },
  candidate_pool: {
    kind: "candidate_pool",
    title: "Top 10 · CAGR · Sharpe · Alpha · Max DD",
    rows: [
      { name: "ANDA Cruise", cagr: 11.8, sharpe: 1.32, alpha: 6.7, dd: -12.4, you: true },
      { name: "Hanwha Momentum", cagr: 14.2, sharpe: 0.84, alpha: 8.1, dd: -26.7 },
      { name: "VIP Korea Value", cagr: 13.6, sharpe: 0.98, alpha: 7.3, dd: -22.4 },
      { name: "Truston Dynamic", cagr: 12.4, sharpe: 1.18, alpha: 5.9, dd: -16.1 },
      { name: "KB Special Sit.", cagr: 11.1, sharpe: 1.22, alpha: 5.6, dd: -13.0 },
      { name: "Timefolio Pinpoint", cagr: 10.9, sharpe: 1.27, alpha: 6.1, dd: -11.8 },
      { name: "Mirae Alpha", cagr: 10.2, sharpe: 1.12, alpha: 5.1, dd: -14.6 },
      { name: "Julia Main", cagr: 9.1, sharpe: 1.05, alpha: 4.2, dd: -15.7 },
      { name: "Brain Absolute", cagr: 8.7, sharpe: 1.41, alpha: 3.8, dd: -9.2 },
      { name: "Samsung Active", cagr: 7.9, sharpe: 0.89, alpha: 2.6, dd: -18.3 },
    ],
  },
  comparison: {
    kind: "comparison",
    title: "Comparison · 5 candidates",
    columns: ["Anda", "Azora", "Meson", "RichBrook", "Winton"],
    sections: [
      {
        title: "Profile",
        rows: [
          { label: "Strategy", values: ["Multi-strategy", "Long/short equity", "Market neutral", "Fixed income RV", "Managed futures / CTA"] },
          { label: "Region", values: ["Korea", "North America, Europe", "North America", "North America", "Global"] },
          { label: "Portfolio Manager", values: ["Young Kwang Joo", "Ravi Chopra", "Ryan J. Morris", "Andrew Ball", "Simon Judes"] },
          { label: "Inception", values: ["May 2014", "Apr 2017", "Nov 2023", "Aug 2021", "Jul 2012"] },
          { label: "Base currency", values: ["KRW", "USD", "USD", "USD", "USD"] },
          { label: "Track record", values: ["Live · unaudited", "Live · audited", "Live · audited", "Live · audited", "Live · audited"] },
        ],
      },
      {
        title: "Performance",
        rows: [
          { label: "Annualised return", values: ["+10.5%", "+11.2%", "+23.2%", "—", "+4.5%"] },
          { label: "Sharpe ratio", values: ["0.87", "1.13", "1.40", "—", "—"] },
          { label: "Sortino ratio", values: ["—", "2.38", "—", "1.20", "0.54"] },
          { label: "Alpha (annualised)", values: ["—", "—", "+18.7%", "—", "—"] },
          { label: "Beta to market", values: ["0.40", "0.00", "-0.02", "—", "0.17"] },
        ],
      },
      {
        title: "Risk",
        rows: [
          { label: "Volatility", values: ["9.2%", "10.0%", "12.9%", "5.3%", "8.6%"] },
          { label: "Max drawdown", values: ["-14.0%", "—", "-11.3%", "-2.9%", "-24.0%"] },
          { label: "Best month", values: ["+8.8%", "—", "+11.0%", "+5.2%", "—"] },
          { label: "Worst month", values: ["-9.6%", "—", "-4.4%", "-2.9%", "—"] },
          { label: "Positive months", values: ["62.8%", "—", "—", "—", "54.0%"] },
        ],
      },
      {
        title: "Exposure",
        rows: [
          { label: "Gross exposure", values: ["104.7%", "185.0%", "—", "134.0%", "—"] },
          { label: "Net exposure", values: ["45.0%", "—", "1.4%", "—", "—"] },
        ],
      },
      {
        title: "Terms & size",
        rows: [
          { label: "AUM (US$m)", values: ["$1,495m", "$969m", "$115m", "$228m", "$5,500m"] },
          { label: "Management fee", values: ["—", "1.8%", "2.0%", "1.0%", "0.9%"] },
          { label: "Performance fee", values: ["—", "20.0%", "—", "20.0%", "16.0%"] },
          { label: "Redemption", values: ["Bi-monthly", "Quarterly", "Monthly", "Monthly", "Monthly"] },
          { label: "Notice period (days)", values: ["—", "45", "15", "15", "2"] },
          { label: "Min. investment", values: ["₩500m", "$2m", "$1m", "$1m", "$1m"] },
          { label: "Team size", values: ["42", "5", "12", "7", "107"] },
        ],
      },
    ],
  },
  returns: {
    kind: "returns",
    title: "ANDA Cruise · trailing returns",
    years: 5,
    cagr: "+11.8%",
    cumulative: "+74.6%",
    bestYear: "+24.1%",
    worstYear: "−3.2%",
    positiveMonths: "71%",
    benchmarkLabel: "KOSPI",
    fundCurve: [0.0, 0.27, 0.23, 0.44, 0.64, 0.86],
    benchmarkCurve: [0.0, 0.1, 0.04, 0.18, 0.25, 0.32],
    calendar: [
      { year: "2021", value: 24.1 },
      { year: "2022", value: -3.2 },
      { year: "2023", value: 15.7 },
      { year: "2024", value: 12.9 },
      { year: "2025", value: 9.4 },
    ],
  },
  benchmark_correlation: {
    kind: "benchmark_correlation",
    title: "Peer correlation matrix",
    funds: CORR_FUNDS,
    matrix: buildCorrelationMatrix(),
  },
  characteristics: { kind: "characteristics", candidate: ANDA_CRUISE },
  analyst_flags: {
    kind: "analyst_flags",
    title: "Diligence watch-list",
    counts: { high: 3, medium: 5, low: 6 },
    total: 14,
    flags: [
      { title: "Key-person concentration on lead PM", detail: "Young Kwang Joo drives 3 of 4 sleeves; no documented succession plan.", severity: "high" },
      { title: "Capacity nearing stated soft-close", detail: "AUM at 84% of ₩490B soft-close; allocation window narrowing.", severity: "high" },
      { title: "Management fee above peer median", detail: "1.75% vs 1.40% peer median; performance fee at hurdle-free 20%.", severity: "high" },
      { title: "Style drift detected in 2022", detail: "Net exposure briefly exceeded mandate band during Q3 drawdown.", severity: "medium" },
      { title: "CB sleeve liquidity mismatch", detail: "Convertible positions less liquid than monthly redemption terms imply.", severity: "medium" },
    ],
  },
  scorecard: {
    kind: "scorecard",
    title: "ANDA Cruise — interview readiness",
    overall: 4.3,
    criteria: [
      { label: "Track record", score: 4.6, tone: "green" },
      { label: "Investment team", score: 4.4, tone: "green" },
      { label: "Process & repeatability", score: 4.2, tone: "violet" },
      { label: "Risk management", score: 4.5, tone: "green" },
      { label: "Operations & infra", score: 3.8, tone: "amber" },
      { label: "Mandate fit", score: 4.1, tone: "violet" },
    ],
    recommendation: "Advance to interview",
    recommendationDetail: "Strong risk-adjusted record; clear on operations follow-ups at IC.",
  },
  analysis: {
    kind: "analysis",
    title: "Which survived perturbation with highest alpha, lowest beta and minimal drawdown?",
    subtitle: "Comparison · Alpha · Beta · Max drawdown · Stress survival",
    summary: "Across 2 funds on alpha, beta, max drawdown and stress survival, Meson scores highest (74/100 vs 58 for Anda), topping alpha, beta and stress survival.",
    narrative:
      "On the criteria you asked about, **Meson** is the stronger answer — with a caveat on track-record length.\n\n**Surviving perturbation.** Meson scores 71/100 on our stress proxy versus 63 for Anda, driven by a shallower max drawdown (-11.3% vs -14.0%). Both are market-neutral by design, which usually holds up through equity shocks — though factor-crowding unwinds (like the 2007 quant quake) are the real test for this style.\n\n**Alpha.** Meson reports +18.7% annualised alpha; Anda doesn't report a comparable alpha figure in our data, so this is a one-sided read.\n\n**Beta.** Meson runs a near-zero beta (-0.02) against Anda's 0.40 — materially less market-directional.\n\n_Our figures are limited and Meson's track record is short (since 2023), so treat this as an indicative screen, not a verdict — past performance doesn't predict the next perturbation, and this isn't investment advice._",
    blocks: [
      { type: "verdict", winner: "Meson", reason: "Leads on alpha and stress survival. Composite 74/100 vs 58 for Anda.", tone: "green" },
      {
        type: "statTiles",
        tiles: [
          { label: "Alpha", value: "+18.7%", sub: "Meson" },
          { label: "Beta", value: "-0.02", sub: "Meson" },
          { label: "Max drawdown", value: "-11.3%", sub: "Meson" },
          { label: "Stress survival", value: "71/100", sub: "Meson" },
        ],
      },
      {
        type: "metricTable",
        columns: ["Fund", "Alpha", "Beta", "Max DD", "Stress", "Score"],
        rows: [
          { cells: ["Meson", "+18.7%", "-0.02", "-11.3%", "71/100", "74"], highlight: true },
          { cells: ["Anda", "—", "0.40", "-14.0%", "63/100", "58"] },
        ],
      },
      {
        type: "barChart",
        label: "Composite score (0–100)",
        bars: [
          { label: "Meson", value: 0.74, display: "74", highlight: true },
          { label: "Anda", value: 0.58, display: "58" },
        ],
      },
    ],
  },
  document: {
    kind: "document",
    title: "What does 'market neutral' mean?",
    intro: "A market-neutral fund aims to profit from relative differences between securities while cancelling out broad market direction — so it can make money whether the market rises or falls.",
    keyPoints: [
      "Balances **long** and **short** positions so net market exposure is near zero.",
      "Returns come from stock selection (alpha), not from the market going up (beta).",
      "Low correlation to equities makes it a **diversifier** in a book.",
    ],
    callout: { tone: "warning", text: "\"Neutral\" to the market doesn't mean risk-free — factor crowding can still cause sharp drawdowns in stress." },
    sections: [
      { title: "Supporting details", body: "Neutrality is usually measured by beta to a benchmark and by net exposure. Funds may be dollar-neutral, beta-neutral, or sector-neutral." },
      { title: "Related resources", body: "See the comparison and scorecard views for how a specific fund's neutrality shows up in beta and drawdown." },
    ],
    followups: ["Explain simply", "Compare two funds", "Show examples", "Diagram"],
  },
};
