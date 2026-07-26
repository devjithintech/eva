import type { CSSProperties } from "react";
import type { ComparisonSection } from "../../../agui/artifacts";
import { ArtifactFrame, tabular } from "./_shared";

interface Props {
  title: string;
  columns: string[];
  sections: ComparisonSection[];
}

/**
 * Multi-candidate comparison matrix: metrics down the rows, one candidate per
 * column, grouped into labelled sections. The metric column is pinned while the
 * candidate columns scroll horizontally, so any number of funds fits.
 */
export function Comparison({ title, columns, sections }: Props) {
  const metricCol = 190;
  const dataCol = 132;
  const stickyBg = "var(--panel)";

  return (
    <ArtifactFrame eyebrow="Side-by-side comparison" title={title}>
      <div style={{ overflowX: "auto", border: "1px solid var(--line2)", borderRadius: 13 }}>
        <table
          style={{
            borderCollapse: "separate",
            borderSpacing: 0,
            width: "100%",
            minWidth: metricCol + columns.length * dataCol,
            fontSize: 12.5,
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  ...headCell,
                  ...stickyLeft,
                  textAlign: "left",
                  background: "var(--primary-d)",
                  zIndex: 3,
                }}
              >
                Metric
              </th>
              {columns.map((name) => (
                <th key={name} style={{ ...headCell, minWidth: dataCol }}>
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <SectionGroup key={section.title} section={section} span={columns.length + 1} stickyBg={stickyBg} metricCol={metricCol} />
            ))}
          </tbody>
        </table>
      </div>
    </ArtifactFrame>
  );
}

function SectionGroup({ section, span, stickyBg, metricCol }: { section: ComparisonSection; span: number; stickyBg: string; metricCol: number }) {
  return (
    <>
      <tr>
        <td
          colSpan={span}
          style={{
            padding: "7px 14px",
            background: "var(--asoft)",
            color: "var(--acc)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: ".07em",
            textTransform: "uppercase",
            borderTop: "1px solid var(--line2)",
            position: "sticky",
            left: 0,
          }}
        >
          {section.title}
        </td>
      </tr>
      {section.rows.map((row) => (
        <tr key={row.label}>
          <th
            scope="row"
            style={{
              ...bodyCell,
              ...stickyLeft,
              minWidth: metricCol,
              maxWidth: metricCol,
              textAlign: "left",
              fontWeight: 600,
              color: "var(--ink)",
              background: stickyBg,
              zIndex: 1,
            }}
          >
            {row.label}
          </th>
          {row.values.map((value, i) => {
            const empty = value === "—" || value === "";
            return (
              <td
                key={i}
                style={{
                  ...bodyCell,
                  textAlign: "right",
                  color: empty ? "var(--ink3)" : "var(--ink2)",
                  ...tabular,
                }}
              >
                {empty ? "—" : value}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

const headCell: CSSProperties = {
  padding: "10px 14px",
  background: "var(--primary)",
  color: "#fff",
  fontSize: 12.5,
  fontWeight: 700,
  textAlign: "right",
  whiteSpace: "nowrap",
  position: "sticky",
  top: 0,
};

const bodyCell: CSSProperties = {
  padding: "8px 14px",
  borderTop: "1px solid var(--line2)",
  whiteSpace: "nowrap",
};

/** Pins a cell to the left edge during horizontal scroll. */
const stickyLeft: CSSProperties = {
  position: "sticky",
  left: 0,
  boxShadow: "1px 0 0 var(--line2)",
};
