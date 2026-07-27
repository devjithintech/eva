import type { MatrixRow } from "../api/types";
import type { PreferenceValues } from "../components/dashboard/PreferenceDialog";

/** Maps each Default-preferences metric key to the real MatrixRow field it
 *  reads — "info"/"beta" are real (return_skill.information_ratio /
 *  benchmark_activeness.beta), just sparser than the others. */
export const PREF_FIELD: Record<
  string,
  "alpha" | "cagr" | "sharpe" | "infoRatio" | "beta" | "dd"
> = {
  alpha: "alpha",
  cagr: "cagr",
  sharpe: "sharpe",
  info: "infoRatio",
  beta: "beta",
  maxdd: "dd",
};

/** Preference keys required for a match — Alpha, CAGR, Sharpe, Max DD (the
 *  visible CandidateTable columns) plus Info Ratio. Net Beta stays as a
 *  slider for later but never gates a match, since it's not shown per-row. */
const REQUIRED_KEYS = ["alpha", "cagr", "sharpe", "maxdd"];

/** A candidate "matches" the saved preference ranges only if it reports EVERY
 *  visible-column metric and every one of them falls inside its range — a
 *  candidate missing even one (e.g. no disclosed Alpha) does not match,
 *  since we can't verify it actually meets that criterion. */
export function matchesPreferences(
  row: MatrixRow,
  prefValues: PreferenceValues,
): boolean {
  for (const key of REQUIRED_KEYS) {
    const field = PREF_FIELD[key];
    const range = prefValues[key];
    const value = row[field];
    if (!range) continue;
    if (value == null) {
      console.log(`${row.name} ${key}=${field}: unreported (FAILS)`);
      return false;
    }
    const fails = value < range.lo || value > range.hi;
    console.log(
      `${row.name} ${key}=${field}: ${value} vs ${range.lo}-${range.hi}: ${fails ? "FAILS" : "passes"}`,
    );
    if (fails) return false;
  }
  console.log(`${row.name} matches all preferences`, row);
  return true;
}
