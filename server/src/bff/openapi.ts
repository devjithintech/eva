/**
 * OpenAPI 3.0 description of the BFF (`/api/*`). Paths, groups (tags) and
 * descriptions mirror the Renderer API catalog. Served as JSON at
 * `/api/openapi.json` and rendered by Swagger UI at `/api/docs`. The per-renderer
 * paths are generated from `RENDERERS`. Keep in step with `routes.ts`.
 */
import { RENDERERS } from "./renderers.js";
import { RENDERER_SECTIONS } from "../data/candidates.js";

/* ── shared bits ────────────────────────────────────────────────────────────*/
const notFound = {
  description: "Not found",
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
};
const jsonArray = (ref: string) => ({ "application/json": { schema: { type: "array", items: { $ref: ref } } } });
const jsonObj = (ref: string) => ({ "application/json": { schema: { $ref: ref } } });
const idParam = { name: "id", in: "path", required: true, schema: { type: "string" }, example: "anda" };
/** Renderer query params — mirrors the real lh_ai_pm /renderers/{label} surface.
 *  `candidate` / `candidate_id` / `fund_id` / `pm` select the fund; the rest are
 *  accepted for compatibility (not all wired yet). */
const rendererParams = [
  { name: "candidate", in: "query", required: false, schema: { type: "string" }, description: "Candidate name / id / slug (our selector).", example: "anda" },
  { name: "candidate_id", in: "query", required: false, schema: { type: "string" }, description: "Owner candidate id for D1 renderers.", example: "C-2026-001" },
  { name: "fund_id", in: "query", required: false, schema: { type: "string" }, description: "Fund id for D1 renderers.", example: "C-2026-001::alpha" },
  { name: "pm", in: "query", required: false, schema: { type: "string" }, description: "Fund selector for per-Fund D2 renderers.", example: "P64-F1" },
  { name: "as_of_date", in: "query", required: false, schema: { type: "string", format: "date" }, description: "Valuation / slice date. Defaults to today." },
  { name: "params", in: "query", required: false, schema: { type: "string" }, description: "URL-encoded JSON RunParams (factor_include, stress_model, peer_group, window, allocation_pct, …)." },
  { name: "axis", in: "query", required: false, schema: { type: "string" }, description: "D1-10 regroup dimension / D1-12 view (sector|industry|country|region|currency|asset_class|liquidity_class | summary|by_class|by_factor|by_position)." },
  { name: "kind", in: "query", required: false, schema: { type: "string" }, description: "D1-11 ranking (largest_by_notional|smallest_by_notional|least_liquid|largest_by_risk|smallest_by_risk)." },
  { name: "source", in: "query", required: false, schema: { type: "string" }, description: "D1-7 provenance filter (all|lh|bb)." },
];

/* ── schemas ────────────────────────────────────────────────────────────────*/
const CandidateSummary = {
  type: "object",
  required: ["id", "name", "pmId", "fundName", "flagCount"],
  properties: {
    id: { type: "string", example: "anda" },
    name: { type: "string", example: "Anda" },
    pmId: { type: "string", nullable: true, example: "anda-asset-mgmt-fd1a9b11" },
    fundName: { type: "string", nullable: true, example: "ANDA Long-Short Dream" },
    flagCount: { type: "integer", example: 16 },
  },
};
const CandidateRecord = {
  type: "object",
  description: "Full candidate profile. Stable fields named; analysis sections free-form.",
  required: ["id", "name"],
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    pm_id: { type: "string" },
    subject_fund: { type: "object", additionalProperties: true },
    analyst_flags: { type: "array", items: {} },
  },
  additionalProperties: true,
};
const MatrixRow = {
  type: "object",
  required: ["name", "cagr", "sharpe", "alpha", "dd"],
  properties: {
    name: { type: "string", example: "Meson" },
    cagr: { type: "number", nullable: true, example: 21.6 },
    sharpe: { type: "number", nullable: true, example: 1.8 },
    alpha: { type: "number", nullable: true, example: 18.7 },
    dd: { type: "number", nullable: true, example: -11.3 },
    you: { type: "boolean" },
  },
};
const CandidateMatrix = {
  type: "object",
  required: ["title", "rows"],
  properties: {
    title: { type: "string", example: "CAGR · Sharpe · Alpha · Max DD" },
    rows: { type: "array", items: { $ref: "#/components/schemas/MatrixRow" } },
  },
};
const Renderer = {
  type: "object",
  required: ["label", "description"],
  properties: { label: { type: "string", example: "D1-1" }, description: { type: "string", example: "Factor regression table" } },
};
const PeerGroup = {
  type: "object",
  properties: { id: { type: "string" }, name: { type: "string" }, memberCount: { type: "integer" } },
};
const PeerSet = {
  type: "object",
  required: ["id", "name", "members"],
  properties: { id: { type: "string" }, name: { type: "string" }, members: { type: "array", items: { type: "string" } } },
};
const Run = {
  type: "object",
  properties: { id: { type: "string" }, runId: { type: "string" }, pipeline: { type: "string" }, status: { type: "string", example: "succeeded" } },
};
const CatalogEntry = {
  type: "object",
  properties: { method: { type: "string" }, path: { type: "string" }, description: { type: "string" }, group: { type: "string" } },
};
const OpportunityMap = {
  type: "object",
  properties: {
    title: { type: "string" },
    funnel: { type: "object", properties: { scored: { type: "integer" }, shortlisted: { type: "integer" }, interview: { type: "integer" } } },
    pool: { type: "object", properties: { candidates: { type: "integer" }, funds: { type: "integer" } } },
    points: {
      type: "array",
      items: {
        type: "object",
        properties: { name: { type: "string" }, cagr: { type: "number" }, dd: { type: "number" }, stage: { type: "string", enum: ["scored", "shortlisted", "interview"] } },
      },
    },
  },
};

const PipelineState = {
  type: "object",
  properties: {
    scored: { type: "integer", example: 57 },
    shortlisted: { type: "integer", example: 3 },
    interview: { type: "integer", example: 1 },
    stages: { type: "object", additionalProperties: { type: "string", enum: ["scored", "shortlisted", "interview"] }, description: "Explicitly-set stages, keyed by candidate id." },
  },
};

const ErrorSchema = { type: "object", properties: { error: { type: "string" }, message: { type: "string" } } };

/* ── candidate-record section schemas (renderer `data` payloads) ─────────────*/
// Compact field-type helper: n=number(nullable) b=boolean a=array o=object else string.
const F = (fields: Record<string, string>) => ({
  type: "object",
  additionalProperties: true,
  properties: Object.fromEntries(
    Object.entries(fields).map(([k, t]) => [
      k,
      t === "n" ? { type: "number", nullable: true } : t === "b" ? { type: "boolean" } : t === "a" ? { type: "array", items: {} } : t === "o" ? { type: "object", additionalProperties: true } : { type: "string" },
    ]),
  ),
});

const SubjectFund = F({ fund_name: "s", is_multi_fund_manager: "b", sibling_funds: "a", subject_rationale: "s" });
const Classification = F({ strategy_family: "s", asset_class: "s", geographic_focus: "a", manager_location: "s", domicile: "s", base_currency: "s", inception_date: "s", track_record_start_date: "s", is_track_record_audited: "b", current_aum_usd_mn: "a", aum_history: "a", vehicle_type: "s", sub_style_tilt: "s", sma_status: "s", track_record_portable: "s", stated_benchmark: "s", track_record_length_years: "n" });
const ReturnSkill = F({ scope: "s", fund_ref: "s", share_class: "s", period: "s", note: "s", annual_returns: "a", annualized_return_pct: "n", sortino_ratio: "n", statistics_period: "s", statistics_period_detail: "s", sharpe_ratio: "n", cagr_pct: "n", alpha_annualized_pct: "n", information_ratio: "n", calmar_ratio: "n" });
const DownsideDistribution = F({ scope: "s", fund_ref: "s", share_class: "s", period: "s", note: "s", downside_deviation_pct: "n", max_drawdown_pct: "n", max_drawdown_period: "s", best_month_pct: "n", worst_month_pct: "n", positive_months_pct: "n", volatility_pct: "n", skewness: "n", counterparty_risk_note: "s", tail_risk_note: "s", idiosyncratic_risk_pct: "n", kurtosis_excess: "n", historical_var_95_pct: "n", cvar_95_pct: "n", drawdown_duration_months: "n" });
const Exposure = F({ scope: "s", fund_ref: "s", note: "s", gross_exposure_target: "s", gross_exposure_max_pct: "n", net_exposure_target: "s", period: "s", gross_exposure_current_pct: "n", gross_exposure_min_pct: "n", net_exposure_current_pct: "n", net_exposure_min_pct: "n", net_exposure_max_pct: "n", beta_adjusted_net_exposure_pct: "n", beta_benchmark: "s", share_class: "s", gross_exposure_avg_pct: "n", net_exposure_avg_pct: "n", residual_beta: "n", long_short_ratio: "s" });
const Factors = F({ scope: "s", fund_ref: "s", period: "s", note: "s", classical: "a", barra: "a", macro: "a", factor_drift_note: "s" });
const Holdings = F({ top_positions: "a", sector_allocation: "a", industry_allocation: "a", country_allocation: "a", region_allocation: "a", currency_exposure: "a", holding_types: "a", uses_index_instruments: "b", index_instruments_note: "s", num_positions_total: "n", max_single_position_pct: "n", num_positions_long: "n", num_positions_short: "n", turnover_pct: "n", top_5_concentration_pct: "n", largest_position_pct: "n", level_3_asset_pct: "n", top_10_concentration_pct: "n", level_1_asset_pct: "n", level_2_asset_pct: "n" });
const Liquidity = F({ liquidity_buckets: "a", days_to_liquidate_note: "s", redemption_liquidity_mismatch_note: "s", bid_ask_spread_note: "s", weighted_days_to_liquidate: "n" });
const RiskFramework = F({ risk_framework_description: "s", drawdown_response_protocol: "s", position_limits: "s", stop_loss_policy: "s", var_confidence_level: "s", risk_model_used: "s", sector_limits: "s", holdings_history_sufficient: "b", stated_var_pct: "n" });
const BenchmarkActiveness = F({ scope: "s", fund_ref: "s", share_class: "s", period: "s", note: "s", beta: "n", up_capture_pct: "n", down_capture_pct: "n", market_correlation: "n", r_squared: "n" });
const VolatilityGreeks = F({ scope: "s", fund_ref: "s", period: "s", note: "s", convexity_note: "s", is_short_volatility: "b", greeks: "o" });

const PeerCorrelation = {
  type: "object",
  properties: {
    title: { type: "string" },
    note: { type: "string" },
    funds: { type: "array", items: { type: "object", properties: { name: { type: "string" }, benchmark: { type: "string" }, marketCorrelation: { type: "number", nullable: true }, rSquared: { type: "number", nullable: true }, beta: { type: "number", nullable: true }, highlight: { type: "boolean" } } } },
  },
};

// section key → component schema name
const SECTION_REF: Record<string, string> = {
  subject_fund: "SubjectFund", classification: "Classification", return_skill: "ReturnSkill",
  downside_distribution: "DownsideDistribution", exposure: "Exposure", factors: "Factors",
  holdings: "Holdings", liquidity: "Liquidity", risk_framework: "RiskFramework",
  benchmark_activeness: "BenchmarkActiveness", volatility_greeks: "VolatilityGreeks",
};

/** The `data` schema for a renderer label (D1-8 = peer correlation; per-fund = fund + section refs). */
function rendererDataSchema(label: string): Record<string, unknown> {
  if (label === "D1-8") return { $ref: "#/components/schemas/PeerCorrelation" };
  const secs = RENDERER_SECTIONS[label];
  if (!secs) return { type: "object", additionalProperties: true };
  const properties: Record<string, unknown> = { fund: { type: "string" } };
  for (const s of secs) properties[s] = { $ref: `#/components/schemas/${SECTION_REF[s]}` };
  return { type: "object", properties, additionalProperties: true };
}

/* ── generated renderer paths ───────────────────────────────────────────────*/
const rendererPaths = Object.fromEntries(
  RENDERERS.map((r) => [
    `/renderers/${r.label}`,
    {
      get: {
        tags: ["Renderers"],
        summary: r.description,
        operationId: `getRenderer_${r.label.replace(/[^a-z0-9]+/gi, "_")}`,
        parameters: rendererParams,
        responses: {
          200: {
            description: r.description,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    label: { type: "string" },
                    description: { type: "string" },
                    candidate: { type: "string", nullable: true },
                    data: rendererDataSchema(r.label),
                  },
                },
              },
            },
          },
          404: notFound,
        },
      },
    },
  ]),
);

export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "Candidate Intelligence — Renderer API",
    version: "0.1.0",
    description: "Backend-for-frontend for the LightHouse web UI. Candidate data is served from `data.json`; peer / pipeline / run / audit endpoints are structural stubs.",
  },
  servers: [{ url: "/api", description: "BFF base path" }],
  tags: [
    { name: "Core", description: "Catalog, health, spec, audit" },
    { name: "Candidates", description: "Candidate profiles" },
    { name: "Peer data", description: "Peer groups, names, custom sets" },
    { name: "Pipelines & runs", description: "Pipeline runs" },
    { name: "Pipeline", description: "Candidate shortlist / interview stage" },
    { name: "Renderers", description: "Renderer catalog + per-renderer endpoints" },
  ],
  paths: {
    "/": { get: { tags: ["Core"], summary: "Endpoint catalog", operationId: "getCatalog", responses: { 200: { description: "Catalog", content: jsonArray("#/components/schemas/CatalogEntry") } } } },
    "/healthz": { get: { tags: ["Core"], summary: "Liveness probe", operationId: "getHealthz", responses: { 200: { description: "OK" } } } },
    "/openapi.json": { get: { tags: ["Core"], summary: "OpenAPI spec (live)", operationId: "getOpenapi", responses: { 200: { description: "OpenAPI document" } } } },
    "/audit_log": { get: { tags: ["Core"], summary: "Audit log", operationId: "getAuditLog", responses: { 200: { description: "Audit entries" } } } },

    "/candidates": { get: { tags: ["Candidates"], summary: "List candidate profiles", operationId: "listCandidates", responses: { 200: { description: "Candidate summaries", content: jsonArray("#/components/schemas/CandidateSummary") } } } },
    "/candidates/matrix": { get: { tags: ["Candidates"], summary: "Candidate comparison matrix (CAGR · Sharpe · Alpha · Max DD)", operationId: "getCandidateMatrix", parameters: [{ name: "n", in: "query", required: false, schema: { type: "integer", minimum: 1, default: 10 }, description: "How many top candidates (default 10)." }, { name: "all", in: "query", required: false, schema: { type: "boolean" }, description: "Show every candidate (overrides n)." }], responses: { 200: { description: "Comparison matrix", content: jsonObj("#/components/schemas/CandidateMatrix") } } } },
    "/opportunity-map": { get: { tags: ["Candidates"], summary: "Opportunity map (scatter + funnel + pool)", operationId: "getOpportunityMap", responses: { 200: { description: "Opportunity map", content: jsonObj("#/components/schemas/OpportunityMap") } } } },
    "/candidates/{id}": { get: { tags: ["Candidates"], summary: "Get a candidate profile", operationId: "getCandidate", parameters: [idParam], responses: { 200: { description: "Candidate profile", content: jsonObj("#/components/schemas/CandidateRecord") }, 404: notFound } } },

    "/peer_groups": { get: { tags: ["Peer data"], summary: "Pre-built peer groups", operationId: "getPeerGroups", responses: { 200: { description: "Peer groups", content: jsonArray("#/components/schemas/PeerGroup") } } } },
    "/peer_names": { get: { tags: ["Peer data"], summary: "Peer names search", operationId: "getPeerNames", parameters: [{ name: "q", in: "query", required: false, schema: { type: "string" } }], responses: { 200: { description: "Matching peers" } } } },
    "/peer_sets": {
      get: { tags: ["Peer data"], summary: "List saved custom peer sets", operationId: "listPeerSets", responses: { 200: { description: "Peer sets", content: jsonArray("#/components/schemas/PeerSet") } } },
      post: { tags: ["Peer data"], summary: "Save a custom peer set", operationId: "createPeerSet", requestBody: { content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, members: { type: "array", items: { type: "string" } } } } } } }, responses: { 200: { description: "Saved set", content: jsonObj("#/components/schemas/PeerSet") } } },
    },

    "/pipelines/candidate_flow/run": { post: { tags: ["Pipelines & runs"], summary: "Run / pre-warm the candidate pipeline", operationId: "runCandidateFlow", requestBody: { required: false, content: { "application/json": { schema: { type: "object", properties: { candidateId: { type: "string" } } } } } }, responses: { 200: { description: "Queued run", content: jsonObj("#/components/schemas/Run") } } } },
    "/runs/{id}": { get: { tags: ["Pipelines & runs"], summary: "Fetch a run", operationId: "getRun", parameters: [idParam], responses: { 200: { description: "Run", content: jsonObj("#/components/schemas/Run") } } } },

    "/pipeline": { get: { tags: ["Pipeline"], summary: "Funnel counts + candidate stages", operationId: "getPipeline", responses: { 200: { description: "Funnel + stages", content: jsonObj("#/components/schemas/PipelineState") } } } },
    "/pipeline/{id}": { put: { tags: ["Pipeline"], summary: "Set a candidate's stage", operationId: "setPipelineStage", parameters: [idParam], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["stage"], properties: { stage: { type: "string", enum: ["scored", "shortlisted", "interview"] } } } } } }, responses: { 200: { description: "Updated stage" }, 404: notFound } } },

    "/renderers": { get: { tags: ["Renderers"], summary: "List renderers", operationId: "listRenderers", responses: { 200: { description: "Renderers", content: jsonArray("#/components/schemas/Renderer") } } } },
    "/renderers/{label}": { get: { tags: ["Renderers"], summary: "Generic renderer endpoint", operationId: "getRenderer", parameters: [{ name: "label", in: "path", required: true, schema: { type: "string" }, example: "D1-1" }, ...rendererParams], responses: { 200: { description: "Renderer payload", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } }, 404: notFound } } },
    ...rendererPaths,
  },
  components: {
    schemas: {
      CandidateSummary, CandidateRecord, MatrixRow, CandidateMatrix, OpportunityMap, PipelineState, Renderer, PeerGroup, PeerSet, Run, CatalogEntry, Error: ErrorSchema,
      PeerCorrelation, SubjectFund, Classification, ReturnSkill, DownsideDistribution, Exposure, Factors, Holdings, Liquidity, RiskFramework, BenchmarkActiveness, VolatilityGreeks,
    },
  },
};
