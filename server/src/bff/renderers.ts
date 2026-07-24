/**
 * Renderer catalog — the D1-x renderer labels + descriptions, verbatim from the
 * Renderer API spec. Drives the `/renderers` list, the `/renderers/{label}`
 * lookup, and the per-renderer Swagger paths under the "Renderers" tag.
 */
export interface Renderer {
  label: string;
  description: string;
}

export const RENDERERS: Renderer[] = [
  { label: "D1-1", description: "Factor regression table" },
  { label: "D1-2", description: "Performance card" },
  { label: "D1-3", description: "Risk metrics card" },
  { label: "D1-4", description: "Fund fit — per-pool table" },
  { label: "D1-4b", description: "Fund fit — summary card" },
  { label: "D1-5", description: "Snapshot hero + rank cards" },
  { label: "D1-6", description: "Peer comparison table" },
  { label: "D1-6b", description: "Peer KPI strip (8 tiles)" },
  { label: "D1-7", description: "Correlations (4 quadrants + source toggle)" },
  { label: "D1-8", description: "Peer correlation matrix" },
  { label: "D1-9", description: "What-if simulator" },
  { label: "D1-10", description: "Exposure decomposition (sector/industry/country/…)" },
  { label: "D1-11", description: "Position summary cards" },
  { label: "D1-12", description: "Risk / style factor decomposition" },
  { label: "D1-13", description: "Exposure: Net / Long / Short" },
  { label: "D1-14", description: "Concentration" },
  { label: "D1-15", description: "Portfolio risk hero metrics" },
  { label: "D1-16", description: "Stress scenarios" },
  { label: "D1-17", description: "Liquidity ladder" },
  { label: "D1-18", description: "Top 5 market (region)" },
];

export const RENDERER_BY_LABEL = new Map(RENDERERS.map((r) => [r.label, r]));
