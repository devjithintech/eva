/**
 * Tiny typed fetch wrapper for the BFF. Requests go to `/api/*`, proxied to the
 * server in dev (see vite.config.ts). Override the base with VITE_API_URL.
 *
 * Exception: the D1-x renderer endpoints (`/renderers/*`, Candidate Analytics /
 * Peer Fit page) are served by the external renderers service instead of the
 * BFF. Its base URL is configurable via VITE_RENDERERS_URL and defaults to the
 * local service.
 */
const BASE = import.meta.env.VITE_API_URL ?? "/api";
const RENDERERS_BASE = import.meta.env.VITE_RENDERERS_URL ?? "http://127.0.0.1:8765";

/** Valuation / slice date sent as `as_of_date` on every renderer call —
 *  pinned to the dataset's valuation date, overridable via env. */
export const RENDERERS_AS_OF = import.meta.env.VITE_RENDERERS_AS_OF ?? "2026-04-30";

/** Last-resort fund key for renderer calls — fund ids are dynamic, taken
 *  from the selected candidate's record (`subject_fund.analytics_fund_id`,
 *  else `subject_fund.fund_id`); this configured fund is only used when a
 *  record carries no fund id at all. */
export const RENDERERS_FUND_ID = import.meta.env.VITE_RENDERERS_FUND_ID ?? "C-2026-001::alpha";

/** Renderer calls (and the fund-hierarchy lookup that names their fund ids)
 *  go to the renderers service; everything else to the BFF. */
function resolveUrl(path: string): string {
  if (path.startsWith("/renderers") || path.startsWith("/fund-hierarchy")) return `${RENDERERS_BASE}${path}`;
  return `${BASE}${path}`;
}

/* ── Global in-flight tracker (drives the page loader) ───────────────────── */

let inFlight = 0;
const activityListeners = new Set<(active: boolean) => void>();

/** Whether any API request is currently in flight. */
export const apiIsLoading = () => inFlight > 0;

/** Subscribe to in-flight transitions (fires on 0→1 and 1→0). Returns an
 *  unsubscribe function. Framework-free — `useApiLoading` wraps it for React. */
export function onApiActivity(listener: (active: boolean) => void): () => void {
  activityListeners.add(listener);
  return () => activityListeners.delete(listener);
}

async function tracked<T>(run: () => Promise<T>): Promise<T> {
  if (++inFlight === 1) for (const l of activityListeners) l(true);
  try {
    return await run();
  } finally {
    if (--inFlight === 0) for (const l of activityListeners) l(false);
  }
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return tracked(async () => {
    const res = await fetch(resolveUrl(path), { signal });
    if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
    return (await res.json()) as T;
  });
}

/** Mutating call (PUT/POST/DELETE) with an optional JSON body. */
export async function apiSend<T>(method: "PUT" | "POST" | "DELETE", path: string, body?: unknown): Promise<T> {
  return tracked(async () => {
    const res = await fetch(resolveUrl(path), {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
    return (await res.json()) as T;
  });
}
