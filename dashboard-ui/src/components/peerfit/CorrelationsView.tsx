import { useState } from "react";
import { useRenderer } from "../../api/hooks";
import type { RendererEnvelope, RunParams } from "../../api/types";
import type { Resource } from "../../api/hooks";
import { LoadingState } from "../common/LoadingState";
import { ErrorState } from "../common/ErrorState";
import { heatClass } from "./heat";

export interface CorrRow {
  quadrant: "lh_most" | "lh_least" | "bb_most" | "bb_least";
  name: string;
  correlation: number;
  beta: number | null;
  jensen_alpha: number | null;
  source: string;
}

interface CandCorrRow {
  fund_id: string;
  candidate_id: string;
  display_name: string;
  corr_vs_subject: number;
}

type Source = "all" | "lh" | "bb" | "cand";

const SOURCES: { key: Source; label: string }[] = [
  { key: "all", label: "All sources" },
  { key: "lh", label: "LH internal" },
  { key: "bb", label: "Bloomberg" },
  { key: "cand", label: "Candidate peers" },
];

interface Props {
  id: string;
  candidateName: string;
  params: RunParams;
  corr: Resource<RendererEnvelope<CorrRow>>;
  onOpenCandidates: () => void;
}

/** "1.0" / "-0.5" — one decimal, no plus sign, never "-0.0". */
function fmtCorr(v: number): string {
  const s = v.toFixed(1);
  return s === "-0.0" ? "0.0" : s;
}

function fmtBeta(v: number | null): string {
  if (v == null) return "—";
  const s = v.toFixed(1);
  return s === "-0.0" ? "0.0" : s;
}

/** Jensen's alpha, stored as a fraction — "+11.2%". */
function fmtJenA(v: number | null): string {
  if (v == null) return "—";
  return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
}

export function CorrelationsView({ id, params, corr, onOpenCandidates }: Props) {
  const [src, setSrc] = useState<Source>("all");
  const hasCandPeers = (params.candidate_peer_set?.length ?? 0) > 0;
  const candCorr = useRenderer<CandCorrRow>("D1-7b", hasCandPeers ? id : null, params);

  if (corr.loading) return <LoadingState label="Loading correlations…" />;
  if (corr.error || !corr.data) return <ErrorState message={corr.error ?? "Correlations unavailable"} />;

  // Selected peers can be cleared while the Candidate-peers pill is active —
  // fall back to All sources rather than showing a dead pane.
  const source = src === "cand" && !hasCandPeers ? "all" : src;

  const rows = corr.data.rows;
  const attrs = corr.data.attrs ?? {};
  const scannedLh = (attrs.scanned_lh as number) ?? (attrs.scanned as number) ?? rows.length;
  const scannedBb = attrs.scanned_bb as number | undefined;

  const byQuadrant = (q: CorrRow["quadrant"]) => rows.filter((r) => r.quadrant === q);

  const box = (title: string, sub: string, nameHeader: string, entries: CorrRow[], emptyMsg: string) => (
    <div className="corr-box">
      <div className="corr-head">
        <span className="corr-title">{title}</span>
        <span className="corr-sub">{sub}</span>
      </div>
      {entries.length === 0 ? (
        <div className="corr-empty">{emptyMsg}</div>
      ) : (
        <table className="corr-tbl">
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>{nameHeader}</th>
              <th>Corr</th>
              <th>Beta</th>
              <th>Jen A</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td className="cv">
                  <span className={`hc ${heatClass(r.correlation)}`}>{fmtCorr(r.correlation)}</span>
                </td>
                <td className="cv num">{fmtBeta(r.beta)}</td>
                <td className="cv num">{fmtJenA(r.jensen_alpha)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const lhMost = box(
    "Top 10 most correlated — LH internal",
    `${scannedLh} funds scanned`,
    "Fund",
    byQuadrant("lh_most"),
    "No LH-internal correlations for this run.",
  );
  const lhLeast = box(
    "Top 10 least correlated — LH internal (diversifiers)",
    "Negative-corr opportunities",
    "Fund",
    byQuadrant("lh_least"),
    "No LH-internal correlations for this run.",
  );
  const bbMost = box(
    "Top 10 most correlated — Bloomberg / Market",
    scannedBb != null ? `${scannedBb} indices scanned` : "Bloomberg / market indices",
    "Index",
    byQuadrant("bb_most"),
    "No Bloomberg / market correlations for this run.",
  );
  const bbLeast = box(
    "Top 10 least correlated — Bloomberg / Market",
    "Hedging-side indices",
    "Index",
    byQuadrant("bb_least"),
    "No Bloomberg / market correlations for this run.",
  );

  const candPeersBox = () => {
    if (candCorr.loading) return <LoadingState label="Loading candidate-peer correlations…" />;
    if (candCorr.error) return <ErrorState message={candCorr.error} />;
    const candRows = candCorr.data?.rows ?? [];
    return (
      <div className="corr-box">
        <div className="corr-head">
          <span className="corr-title">Candidate peers — correlation vs subject</span>
          <span className="corr-sub">{candRows.length} candidate peers</span>
        </div>
        {candRows.length === 0 ? (
          <div className="corr-empty">No candidate-peer correlations for this run.</div>
        ) : (
          <table className="corr-tbl">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Fund</th>
                <th>Corr</th>
              </tr>
            </thead>
            <tbody>
              {candRows.map((r) => (
                <tr key={r.fund_id}>
                  <td>{r.display_name}</td>
                  <td className="cv">
                    <span className={`hc ${heatClass(r.corr_vs_subject)}`}>{fmtCorr(r.corr_vs_subject)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  return (
    <div className="pl-view">
      <div className="corr-toolbar">
        <div className="corr-src" role="tablist" aria-label="Correlation source">
          {SOURCES.map((s) => (
            <button
              key={s.key}
              type="button"
              className={source === s.key ? "active" : ""}
              disabled={s.key === "cand" && !hasCandPeers}
              title={s.key === "cand" && !hasCandPeers ? "Add candidate peers via Change peers…" : undefined}
              onClick={() => setSrc(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button type="button" className="btn" onClick={onOpenCandidates}>
          Change peers…
        </button>
      </div>

      {source === "all" && (
        <div className="corr-grid">
          {lhMost}
          {bbMost}
          {lhLeast}
          {bbLeast}
        </div>
      )}
      {source === "lh" && (
        <div className="corr-grid corr-grid-1">
          {lhMost}
          {lhLeast}
        </div>
      )}
      {source === "bb" && (
        <div className="corr-grid corr-grid-1">
          {bbMost}
          {bbLeast}
        </div>
      )}
      {source === "cand" && <div className="corr-grid corr-grid-1">{candPeersBox()}</div>}
    </div>
  );
}
