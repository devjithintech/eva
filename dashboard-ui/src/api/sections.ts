/**
 * Read an analysis section off a raw CandidateRecord. Sections come back
 * either as an array of scoped records ({scope, fund_ref, …metrics}) or a
 * plain object — mirrors `sec()` in server/src/data/candidates.ts so client
 * reads of the raw record agree with what the server's builders pick.
 */
export function firstSection(rec: Record<string, unknown>, key: string): Record<string, unknown> {
  return firstScoped(rec[key]);
}

/** Pick the best-scoped entry out of a raw scoped-array *value* (rather than
 *  a rec[key] lookup) — for nested scoped fields like
 *  `classification.current_aum_usd_mn` / `.aum_history`. Falls back to `{}`
 *  for a plain object or missing value, same rule `firstSection` uses. */
export function firstScoped(v: unknown): Record<string, unknown> {
  if (Array.isArray(v)) {
    const arr = v as Record<string, unknown>[];
    return (
      arr.find((e) => e && e.fund_ref === "subject" && e.scope === "fund") ??
      arr.find((e) => e && e.fund_ref === "subject") ??
      arr.find((e) => e && e.scope === "fund") ??
      arr[0] ??
      {}
    );
  }
  return (v ?? {}) as Record<string, unknown>;
}

/** Every scoped entry off a raw CandidateRecord section, in document order —
 *  unlike `firstSection`, which picks the single best-scoped entry, this is
 *  for sections like `return_skill` where each entry is its own distinct
 *  as-reported snapshot worth showing individually. A plain non-empty object
 *  becomes a single-entry list; a missing value becomes []. */
export function allSection(rec: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const v = rec[key];
  if (Array.isArray(v)) return v as Record<string, unknown>[];
  if (v && typeof v === "object") return [v as Record<string, unknown>];
  return [];
}

/** Format a number as a signed percentage string, or "—" when absent. */
export function signedPct(v: unknown): string {
  const n = typeof v === "number" ? v : null;
  if (n == null || Number.isNaN(n)) return "—";
  return (n > 0 ? "+" : "") + n.toFixed(1) + "%";
}

/** Format a plain value as a string, or "—" when absent/empty. */
export function str(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string") return v.trim() || "—";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return "—";
}

/** Format a number as an unsigned percentage string, or "—" when absent. */
export function pct(v: unknown, digits = 1): string {
  const n = typeof v === "number" ? v : null;
  if (n == null || Number.isNaN(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

/** Render a string array as a comma-joined list, or "—" when empty. */
export function list(v: unknown): string {
  const arr = Array.isArray(v) ? (v as unknown[]).filter((x) => typeof x === "string" && x.trim()).map(String) : [];
  return arr.length ? arr.join(", ") : "—";
}
