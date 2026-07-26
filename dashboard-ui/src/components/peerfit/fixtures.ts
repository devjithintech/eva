/**
 * ⚠️ MOCK DATA — ported from the peerandfit.html design reference's inline
 * JS fixtures. `server/src/data/candidates.ts`'s own comments confirm
 * data.json has no pairwise peer correlations or what-if simulator inputs
 * yet (`buildPeerCorrelation`: "data.json has no pairwise peer correlations";
 * `buildCorrelation` fabricates a matrix with a seeded PRNG). Nothing on this
 * page hits the network — it's a static reference/demo dataset only.
 */

export const PEER_FUNDS = [
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

export interface CandPeer {
  key: string;
  short: string;
  fund: string;
  cand: string;
  ret: number;
  vol: number;
  dd: number;
  corr: number;
}

export const CAND_PEERS: CandPeer[] = [
  { key: "reyes", short: "Reyes", fund: "Vega Market Neutral", cand: "Sofia Reyes", ret: 9.2, vol: 8.8, dd: -7.8, corr: 0.44 },
  { key: "chen", short: "Chen", fund: "Aris Quant L/S", cand: "Marcus Chen", ret: 10.6, vol: 8.9, dd: -7.1, corr: 0.61 },
  { key: "okafor", short: "Okafor", fund: "Meridian Stat Arb", cand: "David Okafor", ret: 8.1, vol: 8.5, dd: -8.4, corr: 0.58 },
];

/** Deterministic pseudo-random correlation, seeded by row/col index — mirrors
 *  the mockup's `_seed()` generator so re-renders stay stable. */
function seed(i: number, j: number): number {
  const x = Math.sin((i + 1) * 9.7 + (j + 1) * 4.3) * 10000;
  return x - Math.floor(x);
}

/** Build a symmetric correlation matrix for [subject, ...peers]. Index 0 is
 *  always the subject fund (whichever candidate is being viewed). */
export function buildCorrelationMatrix(names: string[]): number[][] {
  const n = names.length;
  const m: number[][] = names.map((_, i) =>
    names.map((_, j) => {
      if (i === j) return 1;
      const k = Math.max(i, j);
      if (i === 0 || j === 0) {
        if (k <= 6) return Math.round((0.3 + seed(i, j) * 0.4) * 100) / 100;
        if (k <= 10) return Math.round((-0.05 + seed(i, j) * 0.3) * 100) / 100;
        return Math.round((-0.2 + seed(i, j) * 0.3) * 100) / 100;
      }
      return Math.round((0.2 + seed(Math.min(i, j), Math.max(i, j)) * 0.55) * 100) / 100;
    }),
  );
  // symmetrize
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const v = Math.round(((m[i][j] + m[j][i]) / 2) * 100) / 100;
      m[i][j] = v;
      m[j][i] = v;
    }
  return m;
}

export function heatClass(v: number): string {
  const a = Math.abs(v);
  const b = a >= 0.85 ? 5 : a >= 0.7 ? 4 : a >= 0.55 ? 3 : a >= 0.4 ? 2 : a >= 0.25 ? 1 : 0;
  return b === 0 ? "hc-n0" : `hc-${v > 0 ? "r" : "g"}${b}`;
}

/** Small illustrative peer-group list for the "Configure comparison set"
 *  modal's Peer groups tab — a trimmed stand-in for the mockup's fabricated
 *  79-group/3,642-fund universe, which has no counterpart in the real
 *  dataset (see fixtures.ts banner). */
export const PEER_GROUPS: { name: string; count: number }[] = [
  { name: "China Onshore Quant MN", count: 19 },
  { name: "Consumer", count: 9 },
  { name: "TMT", count: 18 },
  { name: "Biotech", count: 11 },
  { name: "Long/Short Equity Fundamental", count: 23 },
  { name: "Macro Discretionary", count: 12 },
  { name: "CTA Trend", count: 18 },
  { name: "Multi-Strategy Tier 1", count: 12 },
];

export const RECENT_GROUPS: { name: string; meta: string; count: number }[] = [
  { name: "China Onshore Quant MN", meta: "Last used today", count: 19 },
  { name: "Consumer", meta: "Last used 2 days ago", count: 9 },
  { name: "Hall of Fame Top 30", meta: "Last used 1 week ago", count: 30 },
];
export const SAVED_GROUPS: { name: string; meta: string; count: number }[] = [
  { name: "My Quant L/S Watchlist", meta: "Custom · edit anytime", count: 12 },
];

export const POOL_MEMBERS: [string, string, number][] = [
  ["LH-NA Equity L/S", "North America equity L/S", 14.0],
  ["LH-Global Macro", "Discretionary global macro", 11.5],
  ["LH-Systematic Trend", "Managed futures / CTA", 9.8],
  ["LH-EU Equity L/S", "Europe equity L/S", 8.6],
  ["LH-Credit Opps", "Corporate credit", 7.9],
  ["LH-Stat Arb", "Equity statistical arb", 7.0],
  ["LH-Event Driven", "Merger / event", 6.3],
  ["LH-Asia Equity", "Asia ex-Japan equity", 5.6],
];

export const SIM_BASE = { ret: 9.4, vol: 8.2, sharpe: 1.05, dd: -7.6, corr: 0.42, ens: 4.1, var: -1.4 };

export interface SimResult {
  ret: number;
  vol: number;
  sharpe: number;
  dd: number;
  corr: number;
  ens: number;
  var: number;
  maxcorr: number;
  zone: "div" | "app" | "pen";
  dRet: number;
  dVol: number;
  dSharpe: number;
  dDD: number;
  dCorr: number;
  dENS: number;
  dVaR: number;
}

/** Same what-if formula as the mockup's `simCompute` — a closed-form blend of
 *  the mock base pool with a candidate at a given allocation %. */
export function simCompute(alloc: number, candidate: { ret: number; vol: number; dd: number; corr: number }): SimResult {
  const w = alloc / 100;
  const candR = candidate.ret;
  const candV = candidate.vol;
  const candDD = candidate.dd;
  const corrCand = Math.min(0.95, Math.max(0, candidate.corr));
  const poolR = SIM_BASE.ret, poolV = SIM_BASE.vol, poolDD = SIM_BASE.dd;
  const newR = (1 - w) * poolR + w * candR;
  const newV = Math.sqrt((1 - w) ** 2 * poolV ** 2 + w ** 2 * candV ** 2 + 2 * w * (1 - w) * corrCand * poolV * candV);
  const baseSharpe = (poolR - 4.5) / poolV;
  const newSharpe = (newR - 4.5) / newV;
  const newDD = poolDD * (1 - w * 0.4) + candDD * w * 1.4;
  const newCorr = SIM_BASE.corr - w * 0.6 * (0.6 / Math.max(candidate.corr, 0.3));
  const newENS = SIM_BASE.ens + w * 16 * (1 - corrCand);
  const newVaR = SIM_BASE.var * (1 + w * 0.05);
  const zone: SimResult["zone"] = corrCand >= 0.6 ? "pen" : corrCand >= 0.5 ? "app" : "div";
  return {
    ret: newR,
    vol: newV,
    sharpe: newSharpe,
    dd: newDD,
    corr: newCorr,
    ens: newENS,
    var: newVaR,
    maxcorr: corrCand,
    zone,
    dRet: newR - SIM_BASE.ret,
    dVol: newV - SIM_BASE.vol,
    dSharpe: newSharpe - baseSharpe,
    dDD: newDD - SIM_BASE.dd,
    dCorr: newCorr - SIM_BASE.corr,
    dENS: newENS - SIM_BASE.ens,
    dVaR: newVaR - SIM_BASE.var,
  };
}
