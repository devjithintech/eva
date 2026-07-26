import type { ReactNode } from "react";

/**
 * Minimal, dependency-free markdown for assistant messages — enough for the
 * analyst narrative: paragraphs, `-`/`*` bullets, `#`–`###` headings, and inline
 * **bold** / *italic*. Builds React nodes directly (no HTML injection).
 */
export function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];

  const flush = () => {
    if (!bullets.length) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} style={{ margin: "4px 0 8px", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
        {bullets.map((b, i) => (
          <li key={i} style={{ lineHeight: 1.55 }}>{inline(b)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  lines.forEach((raw) => {
    const t = raw.trim();
    if (!t) {
      flush();
      return;
    }
    const bullet = t.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      bullets.push(bullet[1]);
      return;
    }
    flush();
    const h = t.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const size = h[1].length === 1 ? 15 : h[1].length === 2 ? 14 : 13;
      blocks.push(
        <div key={`h-${blocks.length}`} style={{ fontSize: size, fontWeight: 700, color: "var(--ink)", margin: "8px 0 4px" }}>{inline(h[2])}</div>,
      );
      return;
    }
    blocks.push(
      <p key={`p-${blocks.length}`} style={{ margin: "0 0 8px", lineHeight: 1.55 }}>{inline(t)}</p>,
    );
  });
  flush();

  return <>{blocks}</>;
}

/** Inline **bold** and *italic*. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={i}>{part.slice(1, -1)}</em>;
    return <span key={i}>{part}</span>;
  });
}
