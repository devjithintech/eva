const CARDS = [
  { title: "Insight 1", desc: "The latest top-tier model from major labs." },
  { title: "Insight 2", desc: "Compact, lower-cost picks for high-throughput use." },
  { title: "Insight 3", desc: "Frequently chosen for programming and code generation tasks." },
  { title: "Insight 4", desc: "Compare top image generation models on cost and quality." },
  { title: "Insight 5", desc: "Best suited for long-context research and document synthesis." },
];

/** Interview-tab insights: static placeholder cards (matches the design
 *  reference's pattern for this stage — 5 cards, not yet wired to real data). */
export function InterviewInsights() {
  return (
    <div className="insights-grid">
      {CARDS.map((c) => (
        <div className="insight-card" key={c.title}>
          <div className="ins-title">{c.title}</div>
          <div className="ins-sub" style={{ marginTop: 10, lineHeight: 1.5 }}>{c.desc}</div>
          <div className="ins-foot">Summary Tags</div>
        </div>
      ))}
    </div>
  );
}
