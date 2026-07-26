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
export function computeScores(rows: MatrixRow[]): Map<string, number> {
  const range = (vals: (number | null)[]): [number, number] => {
    const xs = vals.filter((v): v is number => v != null);
    return xs.length ? [Math.min(...xs), Math.max(...xs)] : [0, 1];
  };
  const norm = (v: number | null, [lo, hi]: [number, number], invert = false) => {
    if (v == null) return 0.5; // neutral when unreported
    const t = hi === lo ? 0.5 : (v - lo) / (hi - lo);
    return invert ? 1 - t : t;
  };

  const cagrR = range(rows.map((r) => r.cagr));
  const sharpeR = range(rows.map((r) => r.sharpe));
  const alphaR = range(rows.map((r) => r.alpha));
  const ddR = range(rows.map((r) => r.dd)); // more negative = worse, so invert

  const out = new Map<string, number>();
  for (const r of rows) {
    const composite =
      0.3 * norm(r.cagr, cagrR) +
      0.3 * norm(r.sharpe, sharpeR) +
      0.25 * norm(r.alpha, alphaR) +
      0.15 * norm(r.dd, ddR, true);
    out.set(r.name, Math.round(composite * 100));
  }
  return out;
}
