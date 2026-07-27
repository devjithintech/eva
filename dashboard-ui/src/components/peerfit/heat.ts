/** Pure CSS-class-from-correlation-value helper — presentation only, no data.
 *  Shared by CorrelationsView and MatrixView. */
export function heatClass(v: number): string {
  const a = Math.abs(v);
  const b = a >= 0.85 ? 5 : a >= 0.7 ? 4 : a >= 0.55 ? 3 : a >= 0.4 ? 2 : a >= 0.25 ? 1 : 0;
  return b === 0 ? "hc-n0" : `hc-${v > 0 ? "r" : "g"}${b}`;
}
