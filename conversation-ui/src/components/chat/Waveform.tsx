/** Animated equalizer bars shown while "listening". */
export function Waveform({ height = 22, width = 4 }: { height?: number; width?: number }) {
  const colors = ["#6354f2", "#6354f2", "#8b7cf8", "#6354f2", "#6354f2"];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: width + 1, height }}>
      {colors.map((c, i) => (
        <span
          key={i}
          style={{
            width,
            height: "100%",
            borderRadius: width / 2 + 1,
            background: c,
            transformOrigin: "bottom",
            animation: `bars .9s ease-in-out infinite ${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
}
