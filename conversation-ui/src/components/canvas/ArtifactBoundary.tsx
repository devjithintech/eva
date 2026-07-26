import { Component, type ReactNode } from "react";
import { ErrorFallback } from "../common/ErrorFallback";

interface Props {
  /** Copied verbatim into "Copy Logs" alongside the caught error. */
  context?: string;
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Catches render errors from a single artifact (e.g. a malformed payload) and
 * shows the graceful ErrorFallback card in its place, so one bad card never
 * blanks the whole workspace. "Try again" re-mounts the child.
 */
export class ArtifactBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const logs = [this.props.context, error.stack ?? error.message].filter(Boolean).join("\n\n");
    return <ErrorFallback logs={logs} onRetry={() => this.setState({ error: null })} retryLabel="Try again" />;
  }
}
