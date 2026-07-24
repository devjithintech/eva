const shimmer = (h: number, w: string | number = "100%", radius = 12) => ({
  height: h,
  width: w,
  borderRadius: radius,
  background: "linear-gradient(90deg,var(--skel1) 0%,var(--line) 50%,var(--skel1) 100%)",
  backgroundSize: "500px 100%",
  animation: "shimmer 1.3s infinite linear",
});

/** Shown on the canvas while the agent is composing the next artifact. */
export function Skeleton() {
  return (
    <div style={{ background: "var(--panel2)", border: "1px solid var(--line2)", borderRadius: 14, padding: 16, animation: "fadeUp .3s ease both" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 13 }}>
        <span style={{ width: 16, height: 16, border: "2.5px solid var(--aline)", borderTopColor: "#6354f2", borderRadius: "50%", display: "inline-block", animation: "spin .8s linear infinite" }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#8b7cf8" }}>Assembling interface…</span>
      </div>
      <div style={{ ...shimmer(14, "46%", 7), marginBottom: 13 }} />
      <div style={{ ...shimmer(120), marginBottom: 16 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={shimmer(56, "100%", 11)} />
        ))}
      </div>
    </div>
  );
}
