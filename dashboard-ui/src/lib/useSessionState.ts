import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

/**
 * `useState` backed by `sessionStorage` — the value survives navigation and
 * reloads within the browser tab, and is dropped when the tab closes.
 *
 * `normalize` (optional) reshapes whatever was stored before it becomes
 * state — use it to tolerate schema drift, e.g. merge over defaults so a
 * value saved by an older build can't be missing fields. Parse/storage
 * failures fall back to `initial` / in-memory state.
 */
export function useSessionState<T>(
  key: string,
  initial: T,
  normalize?: (stored: unknown) => T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.sessionStorage.getItem(key);
      if (raw == null) return initial;
      const parsed = JSON.parse(raw) as unknown;
      return normalize ? normalize(parsed) : (parsed as T);
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable — keep state in memory only */
    }
  }, [key, value]);

  return [value, setValue];
}
