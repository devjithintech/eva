import { Fragment, useMemo, useState } from "react";
import { useCandidates, useCompare } from "../../api/hooks";
import { Breadcrumbs } from "../layout/Breadcrumbs";
import { CONVERSATION_URL } from "../../lib/env";
import { LoadingState } from "../common/LoadingState";
import { ErrorState } from "../common/ErrorState";

interface Props {
  ids: string[];
  onBack: () => void;
}

const PIN_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="17" x2="12" y2="22" />
    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v3.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z" />
  </svg>
);
const CHECK_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
function download(name: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function esc(s: unknown): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Side-by-side comparison view — real data from GET /api/candidates/compare,
 *  which wraps the same `buildComparison` builder the conversational agent
 *  uses. Funds picker/subtitle reuse `useCandidates()` (name → id/strategy). */
export function CompareDrawer({ ids, onBack }: Props) {
  const [activeIds, setActiveIds] = useState<Set<string>>(() => new Set(ids));
  const [primaryName, setPrimaryName] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const candidates = useCandidates();
  const activeIdList = useMemo(() => Array.from(activeIds), [activeIds]);
  const { data, loading, error } = useCompare(activeIdList);

  const byName = useMemo(() => new Map((candidates.data ?? []).map((c) => [c.name, c])), [candidates.data]);
  const byId = useMemo(() => new Map((candidates.data ?? []).map((c) => [c.id, c])), [candidates.data]);

  const toggleFund = (id: string) => {
    setActiveIds((prev) => {
      if (prev.has(id)) {
        if (prev.size <= 2) return prev; // keep at least 2 funds
        const next = new Set(prev);
        next.delete(id);
        const removedName = byId.get(id)?.name;
        if (removedName && primaryName === removedName) setPrimaryName(null);
        return next;
      }
      return new Set(prev).add(id);
    });
  };

  const columns = data?.columns ?? [];
  const primaryCol = primaryName && columns.includes(primaryName) ? primaryName : null;

  const rawRows = () => (data?.sections ?? []).flatMap((s) => s.rows);
  const tableHTML = () => {
    let s = '<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px">';
    s += '<tr><th style="background:#6C5CF0;color:#fff;text-align:left;padding:7px 10px;border:1px solid #d9d9e6">Metric</th>';
    columns.forEach((col) => {
      s += `<th style="background:${col === primaryCol ? "#5847D6" : "#6C5CF0"};color:#fff;text-align:right;padding:7px 10px;border:1px solid #d9d9e6">${esc(col)}</th>`;
    });
    s += "</tr>";
    (data?.sections ?? []).forEach((section) => {
      s += `<tr><td colspan="${columns.length + 1}" style="background:#f0eefe;color:#5847D6;font-weight:bold;padding:6px 10px;border:1px solid #d9d9e6;text-transform:uppercase;font-size:10px;letter-spacing:.06em">${esc(section.title)}</td></tr>`;
      section.rows.forEach((row) => {
        s += `<tr><td style="text-align:left;padding:6px 10px;border:1px solid #e8e8ef;font-weight:600">${esc(row.label)}</td>`;
        row.values.forEach((v) => {
          s += `<td style="text-align:right;padding:6px 10px;border:1px solid #e8e8ef">${esc(v || "—")}</td>`;
        });
        s += "</tr>";
      });
    });
    return s + "</table>";
  };

  const exportJSON = () => {
    const out = {
      generated: new Date().toISOString(),
      source: "LightHouse — Candidates & Funds",
      primaryFund: primaryCol,
      funds: columns.map((col, i) => {
        const o: Record<string, unknown> = { fund: col };
        rawRows().forEach((r) => {
          o[r.label] = r.values[i] || null;
        });
        return o;
      }),
    };
    download("LightHouse_Compare.json", "application/json", JSON.stringify(out, null, 2));
  };
  const exportXLS = () => {
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>${tableHTML()}</body></html>`;
    download("LightHouse_Compare.xls", "application/vnd.ms-excel", html);
  };
  const exportPDF = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<html><head><title>LightHouse — Fund Comparison</title><style>@page{size:landscape;margin:14mm}body{font-family:Arial,sans-serif;color:#1a1d23}h1{font-size:18px;margin:0 0 4px}p{color:#6b7280;font-size:11px;margin:0 0 14px}</style></head><body><h1>Fund Comparison</h1><p>LightHouse · Candidates &amp; Funds${primaryCol ? ` · primary: ${esc(primaryCol)}` : ""}</p>${tableHTML()}</body></html>`,
    );
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 350);
  };

  return (
    <div className="cf-wrap">
      <Breadcrumbs items={[{ label: "Home", href: CONVERSATION_URL }, { label: "Candidates & Funds", href: "#/" }, { label: "Compare" }]} />

      <div className="cmp-toolbar">
        <div className="cmp-picker">
          <span className="cmp-picker-lbl">Funds</span>
          {(candidates.data ?? [])
            .filter((c) => activeIds.has(c.id))
            .map((c) => {
              const locked = activeIds.size <= 2;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`cmp-chip on${locked ? " dim" : ""}`}
                  title={locked ? "Keep at least 2 funds" : "Remove from comparison"}
                  onClick={() => toggleFund(c.id)}
                >
                  <span className="ck">{CHECK_ICON}</span>
                  {c.name}
                </button>
              );
            })}
        </div>
        <div className="cmp-exportwrap">
          <button className="btn" onClick={() => setExportOpen((v) => !v)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2 }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {exportOpen && (
            <div className="cmp-menu open">
              <button
                onClick={() => {
                  setExportOpen(false);
                  exportXLS();
                }}
              >
                <span className="mi-ic mi-x">XLS</span>Excel (.xls)
              </button>
              <button
                onClick={() => {
                  setExportOpen(false);
                  exportPDF();
                }}
              >
                <span className="mi-ic mi-x">PDF</span>PDF document
              </button>
              <button
                onClick={() => {
                  setExportOpen(false);
                  exportJSON();
                }}
              >
                <span className="mi-ic mi-x">{"{ }"}</span>JSON data
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="dash-head" style={{ marginBottom: 14 }}>
        <div className="dash-title">
          <h1>Compare</h1>
          <span className="dash-sub">{columns.length} fund{columns.length === 1 ? "" : "s"}</span>
        </div>
        <button className="btn" onClick={onBack}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to dashboard
        </button>
      </div>

      {activeIds.size < 2 && <p className="note">Pick at least two candidates to compare.</p>}
      {loading && <LoadingState label="Loading comparison…" />}
      {error && <ErrorState message={error} />}

      {data && (
        <div className="cmp-scroll">
          <table className="cmp-tbl">
            <thead>
              <tr>
                <th className="cmp-metric">Metric</th>
                {columns.map((c) => {
                  const isPrimary = c === primaryCol;
                  const summary = byName.get(c);
                  return (
                    <th key={c} className={isPrimary ? "cmp-primary" : ""}>
                      <div className="cmp-fh">
                        <button
                          type="button"
                          className={`cmp-pin${isPrimary ? " on" : ""}`}
                          title={isPrimary ? "Primary fund — click to unpin" : "Set as primary"}
                          onClick={() => setPrimaryName(isPrimary ? null : c)}
                        >
                          {PIN_ICON}
                        </button>
                        <span className="cmp-fname">
                          {c}
                          {summary?.strategy && <span className="cmp-fs">{summary.strategy}</span>}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {data.sections.map((section) => (
                <Fragment key={section.title}>
                  <tr className="cmp-group">
                    <td colSpan={columns.length + 1}>{section.title}</td>
                  </tr>
                  {section.rows.map((row) => (
                    <tr key={`${section.title}-${row.label}`}>
                      <td className="cmp-metric">{row.label}</td>
                      {row.values.map((v, i) => (
                        <td key={i} className={columns[i] === primaryCol ? "cmp-primary" : ""}>
                          {v || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
