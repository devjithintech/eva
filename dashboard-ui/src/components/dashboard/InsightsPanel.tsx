import { useState } from "react";
import type { DashboardTab } from "./PipelineTabs";
import { ScoredInsights } from "./insights/ScoredInsights";
import { ShortlistedInsights } from "./insights/ShortlistedInsights";
import { InterviewInsights } from "./insights/InterviewInsights";

interface Props {
  tab: DashboardTab;
}

/** Collapsible, per-tab insights strip (collapsed by default, matching the
 *  design reference) — swaps in a different set of charts depending on the
 *  active pipeline tab instead of always showing one generic panel. */
export function InsightsPanel({ tab }: Props) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className={`insights${collapsed ? " collapsed" : ""}`}>
      <button
        type="button"
        className="insights-head"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((c) => !c)}
      >
        <span className="ins-caret">▶</span> Insights
      </button>
      {!collapsed && (
        <>
          {tab === "scored" && <ScoredInsights />}
          {tab === "shortlisted" && <ShortlistedInsights />}
          {tab === "interview" && <InterviewInsights />}
        </>
      )}
    </div>
  );
}
