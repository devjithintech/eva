/**
 * Tiny typed fetch wrapper for the BFF. Requests go to `/api/*`, proxied to the
 * server in dev (see vite.config.ts). Override the base with VITE_API_URL.
 */
const BASE = import.meta.env.VITE_API_URL ?? "/api";

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { signal });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return (await res.json()) as T;
}

/** Mutating call (PUT/POST/DELETE) with an optional JSON body. */
export async function apiSend<T>(method: "PUT" | "POST" | "DELETE", path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
  return (await res.json()) as T;
}
