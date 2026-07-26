interface Props {
  label: string;
  value: string;
  sub?: string;
  tone?: "pos" | "neg" | "";
}

/** Small metric tile — used across the dashboard insights strip and detail
 *  returns/risk sections. */
export function StatCard({ label, value, sub, tone = "" }: Props) {
  return (
    <div className="ret-stat">
      <div className="l">{label}</div>
      <div className={`v ${tone}`.trim()}>{value}</div>
      {sub && <div className="sub" style={{ fontSize: 11, color: "var(--faint)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
