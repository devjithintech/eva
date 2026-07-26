interface Props {
  message: string;
}

export function ErrorState({ message }: Props) {
  return <div className="error-state">{message}</div>;
}
