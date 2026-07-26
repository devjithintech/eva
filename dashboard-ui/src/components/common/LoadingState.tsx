interface Props {
  label?: string;
}

export function LoadingState({ label = "Loading…" }: Props) {
  return <div className="loading-state">{label}</div>;
}
