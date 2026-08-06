import { useApiLoading } from "../../api/hooks";

/** Global page loader — a dimmed full-page overlay with a centered spinner,
 *  visible whenever any API request is in flight (see `useApiLoading` / the
 *  in-flight tracker in api/client.ts). */
export function PageLoader() {
  const loading = useApiLoading();
  return (
    <div className={`page-overlay${loading ? " active" : ""}`} role="status" aria-live="polite" aria-hidden={!loading}>
      <span className="page-overlay-spinner" aria-label="Loading data" />
    </div>
  );
}
