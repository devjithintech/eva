interface Props {
  label?: string;
}

export function LoadingState({ label = "Loading…" }: Props) {
  return (
    <div className="loading-state">
      <span className="loading-spinner" aria-hidden="true" />
      {label}
    </div>
  );
}
