import type { PipelineState, Stage } from "../../api/types";

export type DashboardTab = Extract<Stage, "scored" | "shortlisted" | "interview">;

interface Props {
  pipeline: PipelineState | null;
  active: DashboardTab;
  onChange: (stage: DashboardTab) => void;
}

const TABS: { key: DashboardTab; label: string }[] = [
  { key: "scored", label: "Scored" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "interview", label: "Interview" },
];

export function PipelineTabs({ pipeline, active, onChange }: Props) {
  return (
    <div className="pipeline">
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          className={`pipe${active === t.key ? " active" : ""}`}
          onClick={() => onChange(t.key)}
        >
          <span className="pipe-l">{t.label}</span>
          <span className="pipe-n">{pipeline ? pipeline[t.key] : "—"}</span>
        </button>
      ))}
    </div>
  );
}
