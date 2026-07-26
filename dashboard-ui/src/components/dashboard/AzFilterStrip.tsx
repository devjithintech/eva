const KEYS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface Props {
  active: string | null;
  onChange: (key: string | null) => void;
}

/** Quick A-Z / 0-9 first-letter filter strip (Scored tab). */
export function AzFilterStrip({ active, onChange }: Props) {
  return (
    <div className="az-strip">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          className={`az-key${active === k ? " active" : ""}`}
          onClick={() => onChange(active === k ? null : k)}
        >
          {k}
        </button>
      ))}
    </div>
  );
}
