/** Render a value per its API-declared Python format spec (".2%", ".0%", ".2f", …). */
export function fmtValue(value: number | null | undefined, format: string | null | undefined): string {
  if (value == null) return "—";
  const m = format ? /^\.(\d+)(%|f)$/.exec(format) : null;
  if (!m) return String(value);
  const digits = Number(m[1]);
  return m[2] === "%" ? `${(value * 100).toFixed(digits)}%` : value.toFixed(digits);
}

/** Fraction (0..1) to a fixed-precision percent string, e.g. 0.2963 -> "29.63%". */
export function pctFmt(v: number | null | undefined, digits = 2): string {
  if (v == null) return "—";
  return `${(v * 100).toFixed(digits)}%`;
}
