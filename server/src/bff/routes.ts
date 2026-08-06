import { Router, type Request, type Response } from "express";
import { DataNotFound } from "./store.js";
import { RENDERERS, RENDERER_BY_LABEL } from "./renderers.js";
import { openapi } from "./openapi.js";
import {
  buildAnalystFlags,
  buildCandidatePool,
  buildComparison,
  buildOpportunityMap,
  buildRendererData,
  buildReturns,
  buildScorecard,
  currencyLabel,
  regionTags,
  strategyLabel,
} from "../data/candidates.js";
import { getDataset } from "../data/sqlDataset.js";
import { allStages, funnelCounts, getStage, setStage, type Stage } from "../data/pipeline.js";
import { CAND_PEERS, PEERFIT_LABELS, PEER_GROUPS, SAVED_GROUPS, buildPeerFitRenderer } from "../data/peerfit.js";
import {
  archiveConversation,
  deleteConversation,
  getEventsByThread,
  getMessagesByThread,
  getTurnMetaByThread,
  listConversations,
  renameConversation,
} from "../db/conversationRepo.js";
import type { CandidateRecord, CandidateSummary, Dataset, RunParams } from "./types.js";

/**
 * Backend-for-frontend, mounted at `/api`. Paths + descriptions mirror the
 * Renderer API catalog. Candidate endpoints are backed by SQL Server
 * (dbo.Candidates, via `data/sqlDataset.ts`; `data.json` is a fallback); peer /
 * pipeline / run / audit endpoints are structural stubs (fill in later).
 */
export const bff = Router();

/* ── helpers ──────────────────────────────────────────────────────────────── */

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
/** SQL-backed candidate dataset (dbo.Candidates via `data/sqlDataset.ts`) —
 *  same `{count, candidates}` shape the old data.json file had. */
const dataset = () => getDataset() as Dataset;

function summarize(name: string, rec: CandidateRecord): CandidateSummary {
  return {
    id: slug(name),
    name,
    pmId: rec.pm_id ?? null,
    fundName: rec.subject_fund?.fund_name ?? null,
    flagCount: Array.isArray(rec.analyst_flags) ? rec.analyst_flags.length : 0,
    currency: currencyLabel(rec),
    strategy: strategyLabel(rec),
    regions: regionTags(rec),
  };
}

function findCandidate(ds: Dataset, id: string): [string, CandidateRecord] | undefined {
  const key = id.toLowerCase();
  return Object.entries(ds.candidates).find(
    ([name, rec]) =>
      slug(name) === key ||
      name.toLowerCase() === key ||
      rec.pm_id === id ||
      (rec.subject_fund?.fund_id as string | undefined)?.toLowerCase() === key,
  );
}

/** Wrap an async handler: DataNotFound → 404, anything else → 500. */
function send<T>(load: (req: Request) => Promise<T> | T) {
  return async (req: Request, res: Response) => {
    try {
      res.json(await load(req));
    } catch (err) {
      if (err instanceof DataNotFound) {
        res.status(404).json({ error: "not_found", message: err.message });
        return;
      }
      res.status(500).json({ error: "bff_error", message: err instanceof Error ? err.message : "Failed to load data" });
    }
  };
}

/* ── in-memory stores (stubs; swap for a DB later) ──────────────────────────── */

interface PeerSet {
  id: string;
  name: string;
  members: string[];
}
const peerSets: PeerSet[] = [{ id: "peerset-seed", ...SAVED_GROUPS }];
let seq = 0;
const nextId = (prefix: string) => `${prefix}-${(++seq).toString(36)}${Date.now().toString(36)}`;

/* ── Core ─────────────────────────────────────────────────────────────────── */

/** Endpoint catalog — flattened from the OpenAPI spec so it stays in sync. */
bff.get("/", send(() => {
  const paths = openapi.paths as Record<string, Record<string, { summary?: string; tags?: string[] }>>;
  const endpoints = Object.entries(paths).flatMap(([path, ops]) =>
    Object.entries(ops).map(([method, op]) => ({
      method: method.toUpperCase(),
      path,
      description: op.summary ?? "",
      group: op.tags?.[0] ?? "",
    })),
  );
  return { service: openapi.info.title, version: openapi.info.version, count: endpoints.length, endpoints };
}));

/** Liveness probe. */
bff.get("/healthz", send(() => ({ status: "ok", uptime: process.uptime() })));

/** Audit log (stub). */
bff.get("/audit_log", send(() => [] as unknown[]));

/* ── Conversations (DB-backed — server/db/conversationRepo) ─────────────────── */

/** List saved conversations (newest first) with message counts. */
bff.get("/conversations", send(() => listConversations()));

/** Full stored transcript for one AG-UI thread. */
bff.get("/conversations/:threadId/messages", send(async (req) => {
  const messages = await getMessagesByThread(req.params.threadId);
  if (!messages.length) throw new DataNotFound(`No conversation: ${req.params.threadId}`);
  return { threadId: req.params.threadId, messages };
}));

/** Stored AG-UI events (rendered UI + payloads) for one thread. */
bff.get("/conversations/:threadId/events", send(async (req) => {
  const events = await getEventsByThread(req.params.threadId);
  if (!events.length) throw new DataNotFound(`No events: ${req.params.threadId}`);
  return { threadId: req.params.threadId, events };
}));

/** Per-turn tokens/latency for a thread (restores card meta on load). */
bff.get("/conversations/:threadId/turns", send(async (req) => {
  return { threadId: req.params.threadId, turns: await getTurnMetaByThread(req.params.threadId) };
}));

/** Rename a conversation ({ title } in the body). */
bff.put("/conversations/:threadId", send(async (req) => {
  const title = String((req.body ?? {}).title ?? "").trim();
  if (!title) throw new DataNotFound("A non-empty title is required.");
  if (!(await renameConversation(req.params.threadId, title.slice(0, 200)))) {
    throw new DataNotFound(`No conversation: ${req.params.threadId}`);
  }
  return { threadId: req.params.threadId, title };
}));

/** Archive a conversation (soft — hidden from the list, data retained). */
bff.post("/conversations/:threadId/archive", send(async (req) => {
  if (!(await archiveConversation(req.params.threadId))) {
    throw new DataNotFound(`No conversation: ${req.params.threadId}`);
  }
  return { threadId: req.params.threadId, archived: true };
}));

/** Delete a conversation and all its messages/events/turn records. */
bff.delete("/conversations/:threadId", send(async (req) => {
  if (!(await deleteConversation(req.params.threadId))) {
    throw new DataNotFound(`No conversation: ${req.params.threadId}`);
  }
  return { threadId: req.params.threadId, deleted: true };
}));

/* ── Candidates ───────────────────────────────────────────────────────────── */

/** List candidate profiles (summaries). */
bff.get("/candidates", send(async (): Promise<CandidateSummary[]> => {
  const ds = await dataset();
  return Object.entries(ds.candidates).map(([n, r]) => summarize(n, r));
}));

/** Candidate comparison matrix (CAGR · Sharpe · Alpha · Max DD), ranked by CAGR.
 *  Top-N via `?n=` (default 10). Same builder the agent's render_candidate_pool
 *  uses. Declared before /candidates/:id so "matrix" isn't captured as an id. */
bff.get("/candidates/matrix", send((req) => {
  const n = Number(req.query.n);
  const all = req.query.all === "true" || req.query.all === "1";
  return buildCandidatePool(Number.isFinite(n) ? n : undefined, all);
}));

/** Opportunity map: scatter points (CAGR × drawdown) + funnel (from the
 *  pipeline) + pool composition. Same builder the agent's tool uses. */
bff.get("/opportunity-map", send(() => buildOpportunityMap()));

/** Side-by-side comparison of two or more candidates (`?ids=a,b,c`). Same
 *  builder the agent's render_comparison tool uses. Declared before
 *  /candidates/:id so "compare" isn't captured as an id. */
bff.get("/candidates/compare", send((req) => {
  const ids = String(req.query.ids ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return buildComparison(ids);
}));

/** Get a candidate profile — `id` accepts slug / exact name / pm_id. */
bff.get("/candidates/:id", send(async (req) => {
  const ds = await dataset();
  const hit = findCandidate(ds, req.params.id);
  if (!hit) throw new DataNotFound(`No candidate: ${req.params.id}`);
  const [name, rec] = hit;
  return { id: slug(name), name, ...rec };
}));

/** Committee scorecard (1–5 per criterion, derived from data.json). Same
 *  builder the agent's render_scorecard tool uses. */
bff.get("/candidates/:id/scorecard", send((req) => buildScorecard(req.params.id)));

/** Analyst flags with severity, for one candidate. */
bff.get("/candidates/:id/flags", send((req) => buildAnalystFlags(req.params.id)));

/** Trailing-returns view (annual bar + growth-of-100 curve). `?years=` (default 5). */
bff.get("/candidates/:id/returns", send((req) => {
  const years = Number(req.query.years);
  return buildReturns(req.params.id, Number.isFinite(years) ? years : undefined);
}));

/* ── Pipeline (shortlist / interview stage) ─────────────────────────────────── */

const STAGES: Stage[] = ["analyzed", "shortlisted", "interview", "rejected"];

/** Funnel counts + each candidate's current stage. */
bff.get("/pipeline", send(async () => {
  const ds = await dataset();
  const ids = Object.keys(ds.candidates).map(slug);
  return { ...funnelCounts(ids), stages: allStages() };
}));

/** Set a candidate's stage (analyzed | shortlisted | interview). */
bff.put("/pipeline/:id", send(async (req) => {
  const stage = (req.body ?? {}).stage as Stage;
  if (!STAGES.includes(stage)) throw new DataNotFound(`Invalid stage: ${stage}. One of: ${STAGES.join(", ")}.`);
  const ds = await dataset();
  const hit = findCandidate(ds, req.params.id);
  if (!hit) throw new DataNotFound(`No candidate: ${req.params.id}`);
  const id = slug(hit[0]);
  setStage(id, stage);
  return { id, stage: getStage(id) };
}));

/* ── Peer data ────────────────────────────────────────────────────────────── */

/** Pre-built peer groups (mock — see `data/peerfit.ts`; matches the guide's
 *  `{name, count, source}` shape). */
bff.get("/peer_groups", send(() => PEER_GROUPS));

/** Candidate-peer roster for the "Configure comparison set" modal's
 *  Candidates tab. Not in the Frontend API Guide (it assumes the frontend
 *  already knows the evaluation queue) — a small addition so the UI has
 *  something to pick `candidate_peer_set` entries from. */
bff.get("/peer_candidates", send(() => CAND_PEERS));

/** Peer names search — `?q=` filters candidate fund names. */
bff.get("/peer_names", send(async (req) => {
  const q = String(req.query.q ?? "").toLowerCase();
  const ds = await dataset();
  const names = Object.entries(ds.candidates).map(([name, rec]) => ({
    id: slug(name),
    name,
    fundName: rec.subject_fund?.fund_name ?? null,
  }));
  return q ? names.filter((n) => n.name.toLowerCase().includes(q) || (n.fundName ?? "").toLowerCase().includes(q)) : names;
}));

/** List saved custom peer sets. */
bff.get("/peer_sets", send(() => peerSets));

/** Save a custom peer set. */
bff.post("/peer_sets", send((req) => {
  const body = (req.body ?? {}) as { name?: string; members?: string[] };
  const set: PeerSet = { id: nextId("peerset"), name: body.name ?? "Untitled set", members: body.members ?? [] };
  peerSets.push(set);
  return set;
}));

/* ── Pipelines & runs ─────────────────────────────────────────────────────── */

/** Run / pre-warm the candidate pipeline (stub — returns a queued run). */
bff.post("/pipelines/candidate_flow/run", send((req) => {
  const body = (req.body ?? {}) as { candidateId?: string };
  return { runId: nextId("run"), pipeline: "candidate_flow", status: "queued", candidateId: body.candidateId ?? null };
}));

/** Fetch a run (stub). */
bff.get("/runs/:id", send((req) => ({
  id: req.params.id,
  pipeline: "candidate_flow",
  status: "succeeded",
})));

/* ── Renderers ────────────────────────────────────────────────────────────── */

/** List renderers. */
bff.get("/renderers", send(() => RENDERERS));

/** Generic renderer endpoint — one handler serves `{label}` and every D1-x.
 *  Data is populated from data.json per label (per-fund via `?candidate=`).
 *  The 8 Peer Fit & Sim labels (D1-5/6/6b/7/7b/8/9/9b) instead go through
 *  `buildPeerFitRenderer`, which prefers a candidate's real precomputed panel
 *  when a completed analytics run exists and falls back to mock data
 *  otherwise — see `PEERFIT_LABELS`/`STATIC_PANEL_LABELS` in
 *  `data/peerfit.ts`. */
bff.get("/renderers/:label", send((req) => {
  const r = RENDERER_BY_LABEL.get(req.params.label);
  if (!r) throw new DataNotFound(`Unknown renderer: ${req.params.label}`);
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  // Fund selector — accept candidate / candidate_id / fund_id (strip ::suffix) / pm.
  const fundId = str(req.query.fund_id);
  const candidate = str(req.query.candidate) ?? str(req.query.candidate_id) ?? (fundId ? fundId.split("::")[0] : undefined) ?? str(req.query.pm);

  if (PEERFIT_LABELS.has(r.label)) {
    const rawParams = str(req.query.params);
    let params: RunParams = {};
    if (rawParams) {
      try {
        params = JSON.parse(rawParams) as RunParams;
      } catch {
        // malformed params — fall back to defaults rather than erroring the panel
      }
    }
    return buildPeerFitRenderer(r.label, candidate ?? "", params, { source: str(req.query.source) });
  }

  // Completed-run panel files key axis/kind/stress_model variants literally,
  // e.g. "D1-10?axis=sector" — build the same key so the real-data lookup
  // (see buildRendererData) finds the right variant instead of the bare label.
  const axis = str(req.query.axis);
  const kind = str(req.query.kind);
  const stressModel = str(req.query.stress_model);
  const variant = axis ? `axis=${axis}` : kind ? `kind=${kind}` : stressModel ? `stress_model=${stressModel}` : undefined;
  const panelKey = variant ? `${r.label}?${variant}` : r.label;

  const built = buildRendererData(r.label, candidate, panelKey);
  // A real completed-run panel is already a `{schema, rows, attrs, identity}`
  // envelope (see buildRendererData) — return it as-is so it matches the
  // Peer Fit labels' shape. Otherwise keep the legacy stub wrapper.
  if (built && typeof built === "object" && "schema" in built && "rows" in built) return built;
  return { label: r.label, description: r.description, candidate: candidate ?? null, data: built };
}));
