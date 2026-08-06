import { useCandidatePeers, useRenderer } from "../../api/hooks";
import type { RunParams } from "../../api/types";
import { LoadingState } from "../common/LoadingState";
import { ErrorState } from "../common/ErrorState";
import { fmtMonth, obsCount } from "./WindowModal";

interface SnapshotMetric {
  metric: string;
  value: number;
  unit: string;
  format: string;
}

interface KpiMetric {
  metric: string;
  value: number;
  delta_vs_median: number | null;
  percentile: number | null;
}

interface CohortRow {
  fund_id: string;
  is_subject: boolean;
  ret: number;
  sharpe: number;
  max_pm_corr: number;
  fit_zone: "diversifying" | "approaching" | "penalty";
}

interface Props {
  id: string;
  candidateName: string;
  params: RunParams;
  selectedPeerKeys: Set<string>;
  onAddPeers: () => void;
}

const ZONE_LABEL: Record<string, string> = { diversifying: "DIVERSIFYING", approaching: "APPROACHING", penalty: "PENALTY" };
const ZONE_CLASS: Record<string, string> = { diversifying: "chip-div", approaching: "chip-app", penalty: "chip-pen" };

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const signedPct = (v: number) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;

export function SnapshotView({ id, candidateName, params, selectedPeerKeys, onAddPeers }: Props) {
  const snapshot = useRenderer<SnapshotMetric>("D1-5", id, params);
  const kpi = useRenderer<KpiMetric>("D1-6b", id, params);
  const candidatePeers = useCandidatePeers();

  if (snapshot.loading || kpi.loading) return <LoadingState label="Loading snapshot…" />;
  if (snapshot.error || !snapshot.data) return <ErrorState message={snapshot.error ?? "Snapshot unavailable"} />;

  const byMetric = new Map(snapshot.data.rows.map((r) => [r.metric, r]));
  const kpiByMetric = new Map((kpi.data?.rows ?? []).map((r) => [r.metric, r]));
  const attrs = snapshot.data.attrs ?? {};
  const cohort = (attrs.cohort as CohortRow[] | undefined) ?? [];
  const peerRoster = new Map((candidatePeers.data ?? []).map((c) => [c.key, c]));

  const v = (metric: string) => byMetric.get(metric)?.value ?? 0;
  const kd = (metric: string) => kpiByMetric.get(metric)?.delta_vs_median ?? null;
  const kp = (metric: string) => kpiByMetric.get(metric)?.percentile ?? null;

  // Analysis-window summary — params carry month-end dates ("2022-11-30");
  // trim to "YYYY-MM" for the shared month formatter.
  const winFrom = params.window_start?.slice(0, 7);
  const winTo = params.window_end?.slice(0, 7);

  return (
    <div className="pl-view">
      {winFrom && winTo && (
        <div className="snap-window-note">
          {obsCount(winFrom, winTo)} monthly obs · {fmtMonth(winFrom)} – {fmtMonth(winTo)}
        </div>
      )}
      <div className="snap-hero">
        <div className="snap-headline">
          <div className="snap-headline-l">Headline read</div>
          <div className="snap-headline-v">
            Top-decile Sharpe with shallowest drawdown across the peer set. Volatility {Math.abs((kd("annualised_vol") ?? 0) * 100).toFixed(1)}pp
            below median, alpha {signedPct(v("jensen_alpha"))}, max-fund correlation {(attrs.max_fund_correlation as number).toFixed(2)} —
            comfortably below the 0.60 penalty threshold.
          </div>
        </div>
        <div className="snap-right-grid">
          <div className="snap-cell">
            <div className="sc-l">Sharpe ratio</div>
            <div className="sc-v pos">{v("sharpe").toFixed(2)}</div>
            <div className="sc-d pos">–</div>
          </div>
          <div className="snap-cell">
            <div className="sc-l">Annualised return</div>
            <div className="sc-v pos">{signedPct(v("annualised_return"))}</div>
            <div className="sc-d pos">–</div>
          </div>
          <div className="snap-cell">
            <div className="sc-l">Max drawdown</div>
            <div className="sc-v pos">{signedPct(v("max_drawdown")).replace("+", "−")}</div>
            <div className="sc-d pos">–</div>
          </div>
          <div className="snap-cell">
            <div className="sc-l">YTD return</div>
            <div className="sc-v pos">{signedPct(v("ytd_return"))}</div>
            <div className="sc-d pos">
              {kd("ytd_return") != null ? `${(kd("ytd_return")! * 100).toFixed(1)} vs median` : "–"}
            </div>
          </div>
          <div className="snap-cell">
            <div className="sc-l">Ann. vol</div>
            <div className="sc-v">{pct(v("annualised_vol"))}</div>
            <div className="sc-d pos">
              {kd("annualised_vol") != null ? `${(kd("annualised_vol")! * 100).toFixed(1)} vs median` : "–"}
            </div>
          </div>
          <div className="snap-cell">
            <div className="sc-l">DD / vol</div>
            <div className="sc-v pos">{v("dd_vol_ratio").toFixed(2)}</div>
            <div className="sc-d">Lower = better</div>
          </div>
          <div className="snap-cell">
            <div className="sc-l">Worst month</div>
            <div className="sc-v neg">{signedPct(v("worst_month"))}</div>
            <div className="sc-d pos">
              {kd("worst_month") != null ? `vs ${((kd("worst_month")! * -1 + v("worst_month")) * 100).toFixed(1)} med.` : "–"}
            </div>
          </div>
          <div className="snap-cell">
            <div className="sc-l">Best month</div>
            <div className="sc-v pos">{signedPct(v("best_month"))}</div>
            <div className="sc-d">{kp("best_month") != null ? `${Math.round(kp("best_month")! * 100)}th pctile` : "–"}</div>
          </div>
          <div className="snap-cell">
            <div className="sc-l">Jensen α</div>
            <div className="sc-v pos">{signedPct(v("jensen_alpha"))}</div>
            <div className="sc-d">3yr ann.</div>
          </div>
          <div className="snap-cell">
            <div className="sc-l">Beta</div>
            <div className="sc-v">{v("beta_benchmark").toFixed(2)}</div>
            <div className="sc-d">vs {params.benchmark ?? "S&P 500 TR Index"}</div>
          </div>
          <div className="snap-cell">
            <div className="sc-l">Hit rate</div>
            <div className="sc-v pos">{Math.round(v("hit_rate_monthly") * 100)}%</div>
            <div className="sc-d">monthly</div>
          </div>
          <div className="snap-cell"></div>
        </div>
      </div>

      <div className="snap-rank-grid">
        <div className="snap-rank-card">
          <div className="snap-rank-h">Sharpe rank in peer group</div>
          <div className="snap-rank-v">
            {String(attrs.sharpe_rank)}<span style={{ fontSize: 14, color: "var(--muted)" }}>/{String(attrs.sharpe_rank_n)}</span>
          </div>
          <div className="snap-rank-d">Top of the peer group.</div>
          <div className="snap-rank-mini">
            <div className="snap-rank-mini-fill" style={{ width: "100%" }} />
          </div>
        </div>
        <div className="snap-rank-card">
          <div className="snap-rank-h">Max-fund correlation</div>
          <div className="snap-rank-v">{(attrs.max_fund_correlation as number).toFixed(2)}</div>
          <div className="snap-rank-d">Below the 0.60 penalty threshold.</div>
          <div className="snap-rank-mini">
            <div className="snap-rank-mini-fill" style={{ width: `${(attrs.max_fund_correlation as number) * 100}%`, background: "var(--pf-amber)" }} />
          </div>
        </div>
        <div className="snap-rank-card">
          <div className="snap-rank-h">ENS impact (5% alloc)</div>
          <div className="snap-rank-v" style={{ color: "var(--pf-pos)" }}>
            +{(attrs.ens_impact as number).toFixed(2)}
          </div>
          <div className="snap-rank-d">Pool effective N rises with allocation.</div>
          <div className="snap-rank-mini">
            <div className="snap-rank-mini-fill" style={{ width: `${(attrs.ens_impact as number) * 100}%`, background: "var(--pf-pos)" }} />
          </div>
        </div>
      </div>

      <div className="pl-sh">
        <span>Prospective candidate cohort</span>
        <span>Optional · this fund vs other prospective candidates submitted this cycle</span>
      </div>
      {selectedPeerKeys.size === 0 ? (
        <div className="cp-empty">
          <div className="cp-empty-txt">
            <strong>Candidate-peer comparison is optional and off.</strong> Compare {candidateName} side-by-side with
            other prospective candidates in this evaluation cycle. With none selected, every panel shows peers &amp;
            benchmarks only.
          </div>
          <button className="cp-empty-btn" onClick={onAddPeers}>
            + Add candidate peers
          </button>
        </div>
      ) : (
        <div className="cohort-grid">
          <div className="cohort-card subject">
            <div className="cohort-name">
              {candidateName} <span className="ctag" style={{ background: "var(--primary)" }}>SUBJECT</span>
            </div>
            <div className="cohort-row first">
              <span className="cr-l">Sharpe</span>
              <span className="cr-v pos">{v("sharpe").toFixed(2)}</span>
            </div>
            <div className="cohort-row">
              <span className="cr-l">Ann. return</span>
              <span className="cr-v pos">{signedPct(v("annualised_return"))}</span>
            </div>
            <div className="cohort-row">
              <span className="cr-l">Max pool corr</span>
              <span className="cr-v">{(attrs.max_fund_correlation as number).toFixed(2)}</span>
            </div>
            <span className="cohort-chip chip-div">DIVERSIFYING</span>
          </div>
          {cohort
            .filter((c) => !c.is_subject)
            .map((c) => {
              const peer = peerRoster.get(c.fund_id);
              return (
                <div className="cohort-card" key={c.fund_id}>
                  <div className="cohort-name">
                    {peer?.fund ?? c.fund_id} <span className="ctag">CAND PEER</span>
                  </div>
                  <div className="cohort-who">{peer?.cand ?? ""}</div>
                  <div className="cohort-row first">
                    <span className="cr-l">Sharpe</span>
                    <span className="cr-v">{c.sharpe.toFixed(2)}</span>
                  </div>
                  <div className="cohort-row">
                    <span className="cr-l">Ann. return</span>
                    <span className="cr-v pos">+{c.ret.toFixed(1)}%</span>
                  </div>
                  <div className="cohort-row">
                    <span className="cr-l">Max pool corr</span>
                    <span className={`cr-v${c.fit_zone === "penalty" ? " neg" : ""}`}>{c.max_pm_corr.toFixed(2)}</span>
                  </div>
                  <span className={`cohort-chip ${ZONE_CLASS[c.fit_zone]}`}>
                    {c.fit_zone === "penalty" ? `PENALTY · ${c.max_pm_corr.toFixed(2)}` : ZONE_LABEL[c.fit_zone]}
                  </span>
                </div>
              );
            })}
        </div>
      )}

      <div className="pl-sh">Allocation pool fit</div>
      <div className="lh-grid">
        {[
          { name: "Lighthouse Diversified Fund, Ltd", ens: "+0.81", tone: "var(--pf-pos)", rec: "Strong fit" },
          { name: "Lighthouse Europe Segregated Pf.", ens: "+0.34", tone: "var(--amber)", rec: "Moderate fit" },
          { name: "Lighthouse Global Long Short, LP", ens: "+0.62", tone: "var(--teal)", rec: "Good fit" },
        ].map((pool) => (
          <div className="lh-card" key={pool.name}>
            <div className="lh-name">{pool.name}</div>
            <div className="lh-row">
              <span className="lh-l">ENS impact (5% alloc)</span>
              <span className="lh-v" style={{ color: pool.tone }}>
                {pool.ens}
              </span>
            </div>
            <div className="lh-row">
              <span className="lh-l">Recommendation</span>
              <span className="lh-v" style={{ color: pool.tone }}>
                {pool.rec}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
