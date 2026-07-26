/**
 * Candidate pipeline stage — runtime app-state (not in data.json): which
 * candidates have been shortlisted / selected for interview. In-memory for now
 * (resets on restart); swap for a DB later. Keyed by candidate slug id.
 */
export type Stage = "scored" | "shortlisted" | "interview" | "rejected";

/** Ordinal rank so interview ⊇ shortlisted ⊇ scored. Rejected sits outside the
 *  funnel (not counted as shortlisted/interview progress). */
export const STAGE_RANK: Record<Stage, number> = { scored: 0, shortlisted: 1, interview: 2, rejected: -1 };

const stages = new Map<string, Stage>();

export function getStage(id: string): Stage {
  return stages.get(id) ?? "scored";
}

export function setStage(id: string, stage: Stage): void {
  if (stage === "scored") stages.delete(id);
  else stages.set(id, stage);
}

/** Every explicitly-set stage, keyed by candidate id. */
export function allStages(): Record<string, Stage> {
  return Object.fromEntries(stages);
}

/** Funnel counts over the given candidate ids (scored = all). */
export function funnelCounts(ids: string[]): { scored: number; shortlisted: number; interview: number } {
  let shortlisted = 0;
  let interview = 0;
  for (const id of ids) {
    const r = STAGE_RANK[getStage(id)];
    if (r >= 1) shortlisted++;
    if (r >= 2) interview++;
  }
  return { scored: ids.length, shortlisted, interview };
}
