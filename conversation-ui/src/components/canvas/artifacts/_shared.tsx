import type { CSSProperties, ReactNode } from "react";

/**
 * Body wrapper shared by every artifact. The card title + chrome now live in the
 * enclosing `<ResultCard>` header, so this only renders the artifact's own
 * content. `eyebrow`/`title` are accepted (callers still pass them) but the
 * header owns them — kept here so artifacts didn't all need editing.
 */
export function ArtifactFrame({ children }: { eyebrow?: string; title?: string; children: ReactNode }) {
  return <div style={{ animation: "assembleIn .45s ease both" }}>{children}</div>;
}

export const card: CSSProperties = {
  background: "var(--panel2)",
  border: "1px solid var(--line2)",
  borderRadius: 14,
  padding: 14,
};

export const violetCard: CSSProperties = {
  background: "linear-gradient(150deg,#7d6ff2,var(--primary-d))",
  borderRadius: 14,
  color: "#fff",
  boxShadow: "0 10px 26px -12px rgba(108,92,240,.5)",
};

export const grid6: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10 };

export const tabular: CSSProperties = { fontVariantNumeric: "tabular-nums" };
