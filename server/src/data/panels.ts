/**
 * Real, precomputed D1-* renderer output for candidates that have a completed
 * analytics run — dropped in as one JSON file per `fund_id` under
 * `server/data/candidate_panels/`. Most candidates don't have a run yet;
 * callers treat `null` as "no run available" and fall back / show an empty
 * state rather than fabricating numbers.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PANELS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../data/candidate_panels");

export interface PanelEnvelope {
  schema: { name: string; type: string }[];
  rows: Record<string, unknown>[];
  attrs?: Record<string, unknown>;
}

interface CandidatePanelFile {
  fund_id: string;
  candidate_id: string;
  candidate_name: string;
  fund_name: string;
  as_of: string;
  panels: Record<string, PanelEnvelope>;
}

/** The full per-fund panel dump (all D1-x labels it was run for), or null if
 *  this fund has no completed analytics run on disk. Read fresh every call,
 *  matching data.json's "no restart needed" convention. */
export function loadCandidatePanelFile(fundId: string): CandidatePanelFile | null {
  const file = path.join(PANELS_DIR, `${fundId}.json`);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as CandidatePanelFile;
  } catch {
    return null;
  }
}

/** One renderer panel (`{schema, rows, attrs}`) for a fund + label, if a real
 *  analytics run exists and covers that label. */
export function loadCandidatePanel(fundId: string, label: string): PanelEnvelope | null {
  return loadCandidatePanelFile(fundId)?.panels[label] ?? null;
}
