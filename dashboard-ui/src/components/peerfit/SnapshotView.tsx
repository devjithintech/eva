import { CAND_PEERS } from "./fixtures";

interface Props {
  candidateName: string;
  selectedPeerKeys: Set<string>;
  onAddPeers: () => void;
}

const ZONE_LABEL: Record<string, string> = { div: "DIVERSIFYING", app: "APPROACHING", pen: "PENALTY" };
const ZONE_CLASS: Record<string, string> = { div: "chip-div", app: "chip-app", pen: "chip-pen" };
function zoneOf(corr: number): "div" | "app" | "pen" {
  return corr >= 0.6 ? "pen" : corr >= 0.5 ? "app" : "div";
}

/** Mock snapshot — headline stats + pool-fit cards. Static reference numbers,
 *  not computed from data.json (see fixtures.ts banner). */
export function SnapshotView({ candidateName, selectedPeerKeys, onAddPeers }: Props) {
  const selected = CAND_PEERS.filter((c) => selectedPeerKeys.has(c.key));
  return (
    <div className="pl-view">
      <div className="snap-hero">
        <div className="snap-headline">
          <div className="snap-headline-l">Headline read</div>
          <div className="snap-headline-v">
            Top-decile Sharpe with shallowest drawdown across the mock peer set. Volatility 1.8pp below median, alpha +18.4%,
            max-PM correlation 0.53 — comfortably below the 0.60 penalty threshold.
          </div>
        </div>
        <div className="snap-right-grid">
          <div className="snap-cell">
            <div className="sc-l">Sharpe ratio</div>
            <div className="sc-v pos">1.42</div>
            <div className="sc-d pos">–</div>
          </div>
          <div className="snap-cell">
            <div className="sc-l">Annualised return</div>
            <div className="sc-v pos">+12.7%</div>
            <div className="sc-d pos">–</div>
          </div>
          <div className="snap-cell">
            <div className="sc-l">Max drawdown</div>
            <div className="sc-v pos">−5.3%</div>
            <div className="sc-d pos">–</div>
          </div>
          <div className="snap-cell">
            <div className="sc-l">YTD return</div>
            <div className="sc-v pos">+14.2%</div>
            <div className="sc-d pos">+5.3 vs median</div>
          </div>
          <div className="snap-cell">
            <div className="sc-l">Ann. vol</div>
            <div className="sc-v">7.0%</div>
            <div className="sc-d pos">−1.8 vs median</div>
          </div>
          <div className="snap-cell">
            <div className="sc-l">DD / vol</div>
            <div className="sc-v pos">0.76</div>
            <div className="sc-d">Lower = better</div>
          </div>
          <div className="snap-cell">
            <div className="sc-l">Worst month</div>
            <div className="sc-v neg">−3.6%</div>
            <div className="sc-d pos">vs −5.1 med.</div>
          </div>
          <div className="snap-cell">
            <div className="sc-l">Best month</div>
            <div className="sc-v pos">+5.3%</div>
            <div className="sc-d">68th pctile</div>
          </div>
          <div className="snap-cell">
            <div className="sc-l">Jensen α</div>
            <div className="sc-v pos">+18.4%</div>
            <div className="sc-d">3yr ann.</div>
          </div>
          <div className="snap-cell">
            <div className="sc-l">Beta</div>
            <div className="sc-v">0.38</div>
            <div className="sc-d">vs S&amp;P 500 TR</div>
          </div>
          <div className="snap-cell">
            <div className="sc-l">Hit rate</div>
            <div className="sc-v pos">63%</div>
            <div className="sc-d">monthly</div>
          </div>
          <div className="snap-cell"></div>
        </div>
      </div>

      <div className="snap-rank-grid">
        <div className="snap-rank-card">
          <div className="snap-rank-h">Sharpe rank in peer group</div>
          <div className="snap-rank-v">
            1<span style={{ fontSize: 14, color: "var(--muted)" }}>/19</span>
          </div>
          <div className="snap-rank-d">Top of the mock reference peer group.</div>
          <div className="snap-rank-mini">
            <div className="snap-rank-mini-fill" style={{ width: "100%" }} />
          </div>
        </div>
        <div className="snap-rank-card">
          <div className="snap-rank-h">Max-PM correlation</div>
          <div className="snap-rank-v">0.53</div>
          <div className="snap-rank-d">Below the 0.60 penalty threshold.</div>
          <div className="snap-rank-mini">
            <div className="snap-rank-mini-fill" style={{ width: "53%", background: "var(--pf-amber)" }} />
          </div>
        </div>
        <div className="snap-rank-card">
          <div className="snap-rank-h">ENS impact (5% alloc)</div>
          <div className="snap-rank-v" style={{ color: "var(--pf-pos)" }}>
            +0.80
          </div>
          <div className="snap-rank-d">Pool effective N rises 4.1 → 4.9.</div>
          <div className="snap-rank-mini">
            <div className="snap-rank-mini-fill" style={{ width: "80%", background: "var(--pf-pos)" }} />
          </div>
        </div>
      </div>

      <div className="pl-sh">
        <span>Prospective candidate cohort</span>
        <span>Optional · this fund vs other prospective candidates submitted this cycle</span>
      </div>
      {selected.length === 0 ? (
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
              <span className="cr-v pos">1.42</span>
            </div>
            <div className="cohort-row">
              <span className="cr-l">Ann. return</span>
              <span className="cr-v pos">+12.7%</span>
            </div>
            <div className="cohort-row">
              <span className="cr-l">Max pool corr</span>
              <span className="cr-v">0.53</span>
            </div>
            <span className="cohort-chip chip-div">DIVERSIFYING</span>
          </div>
          {selected.map((c) => {
            const zone = zoneOf(c.corr);
            return (
              <div className="cohort-card" key={c.key}>
                <div className="cohort-name">
                  {c.fund} <span className="ctag">CAND PEER</span>
                </div>
                <div className="cohort-who">{c.cand}</div>
                <div className="cohort-row first">
                  <span className="cr-l">Sharpe</span>
                  <span className="cr-v">{(c.ret / c.vol).toFixed(2)}</span>
                </div>
                <div className="cohort-row">
                  <span className="cr-l">Ann. return</span>
                  <span className="cr-v pos">+{c.ret.toFixed(1)}%</span>
                </div>
                <div className="cohort-row">
                  <span className="cr-l">Max pool corr</span>
                  <span className={`cr-v${zone === "pen" ? " neg" : ""}`}>{c.corr.toFixed(2)}</span>
                </div>
                <span className={`cohort-chip ${ZONE_CLASS[zone]}`}>
                  {zone === "pen" ? `PENALTY · ${c.corr.toFixed(2)}` : ZONE_LABEL[zone]}
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
