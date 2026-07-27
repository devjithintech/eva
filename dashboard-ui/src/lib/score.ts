import type { MatrixRow } from "../api/types";

/**
 * Quick composite "Score" for the candidate table (0-100), derived purely
 * client-side from the real CAGR/Sharpe/Alpha/Max-DD figures already loaded
 * for the whole pool — min-max normalized across the current rows, so it
 * needs no extra network round-trip per row.
 *
 * This is NOT the same as the authoritative committee scorecard shown on the
 * candidate detail page (server's `buildScorecard`, six weighted criteria
 * blended from many more data.json fields) — that one is fetched once per
 * candidate on expand/detail view. This table-level number is a fast,
 * transparent preview only.
 */
export function computeScores(rows: MatrixRow[]): Map<string, number | null> {
  const range = (vals: (number | null)[]): [number, number] => {
    const xs = vals.filter((v): v is number => v != null);
    return xs.length ? [Math.min(...xs), Math.max(...xs)] : [0, 1];
  };
  const norm = (v: number, [lo, hi]: [number, number], invert = false) => {
    const t = hi === lo ? 0.5 : (v - lo) / (hi - lo);
    return invert ? 1 - t : t;
  };

  const cagrR = range(rows.map((r) => r.cagr));
  const sharpeR = range(rows.map((r) => r.sharpe));
  const alphaR = range(rows.map((r) => r.alpha));
  const ddR = range(rows.map((r) => r.dd)); // more negative = worse, so invert

  // [value, range, weight, invert]
  const FIELDS = (r: MatrixRow): [number | null, [number, number], number, boolean][] => [
    [r.cagr, cagrR, 0.3, false],
    [r.sharpe, sharpeR, 0.3, false],
    [r.alpha, alphaR, 0.25, false],
    [r.dd, ddR, 0.15, true],
  ];

  const out = new Map<string, number | null>();
  for (const r of rows) {
    // Missing fields are excluded (not filled with a fabricated "neutral"
    // 0.5) and the remaining weights renormalized over whatever is actually
    // reported — otherwise a candidate with NO real data at all lands on a
    // flat weighted-neutral 50, which can outrank candidates who have real,
    // merely middling, figures. A candidate with zero real data gets no
    // score at all ("—") rather than a misleadingly average-looking one.
    let weightedSum = 0;
    let weightTotal = 0;
    for (const [value, valueRange, weight, invert] of FIELDS(r)) {
      if (value == null) continue;
      weightedSum += weight * norm(value, valueRange, invert);
      weightTotal += weight;
    }
    out.set(r.name, weightTotal > 0 ? Math.round((weightedSum / weightTotal) * 100) : null);
  }
  return out;
}
