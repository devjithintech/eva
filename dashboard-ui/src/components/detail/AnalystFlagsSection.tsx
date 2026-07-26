import { useFlags } from "../../api/hooks";
import { LoadingState } from "../common/LoadingState";
import { ErrorState } from "../common/ErrorState";

interface Props {
  id: string;
}

export function AnalystFlagsSection({ id }: Props) {
  const { data, loading, error } = useFlags(id);

  if (loading) return <LoadingState label="Loading analyst flags…" />;
  if (error || !data) return <ErrorState message={error ?? "No flags available"} />;

  return (
    <section id="flags" className="sec">
      <div className="sec-head">
        <span className="sec-ic">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
            <line x1="4" y1="22" x2="4" y2="15" />
          </svg>
        </span>
        <h2>Analyst flags</h2>
        <span className="sec-count">{data.total}</span>
      </div>
      <div className="sec-body">
        {data.total === 0 ? (
          <p className="note">No analyst flags on record.</p>
        ) : (
          <ul className="flaglist">
            {data.flags.map((f, i) => (
              <li key={i} className={f.severity}>
                {f.detail}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
