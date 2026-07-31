import { useCandidate } from "../api/hooks";
import { LoadingState } from "../components/common/LoadingState";
import { ErrorState } from "../components/common/ErrorState";
import { FundHero } from "../components/detail/FundHero";
import { SidebarNav, type NavSection } from "../components/detail/SidebarNav";
import { ExecutiveSummarySection } from "../components/detail/ExecutiveSummarySection";
import { AnalystFlagsSection } from "../components/detail/AnalystFlagsSection";
import { OverviewSection } from "../components/detail/OverviewSection";
import { PerformanceSection } from "../components/detail/PerformanceSection";
import { ReturnsByFundSection } from "../components/detail/ReturnsByFundSection";
import { RiskSection } from "../components/detail/RiskSection";
import { BenchmarkActivenessSection } from "../components/detail/BenchmarkActivenessSection";
import { StrategySection } from "../components/detail/StrategySection";
import { ExposureSection } from "../components/detail/ExposureSection";
import { HoldingsSection } from "../components/detail/HoldingsSection";
import { LiquiditySection } from "../components/detail/LiquiditySection";
import { ManagerSection } from "../components/detail/ManagerSection";
import { VehicleExperienceSection } from "../components/detail/VehicleExperienceSection";
import { FeesSection } from "../components/detail/FeesSection";
import { TermsRedemptionSection } from "../components/detail/TermsRedemptionSection";
import { OperationsComplianceSection } from "../components/detail/OperationsComplianceSection";
import { RiskFrameworkSection } from "../components/detail/RiskFrameworkSection";
import { ClassificationSection } from "../components/detail/ClassificationSection";
import { MarketViewsSection } from "../components/detail/MarketViewsSection";
import { AumSection } from "../components/detail/AumSection";

interface Props {
  id: string;
}

const SECTIONS: NavSection[] = [
  { id: "summary", label: "Executive summary" },
  { id: "flags", label: "Analyst flags" },
  { id: "overview", label: "Overview" },
  { id: "performance", label: "Performance" },
  { id: "returns", label: "Returns by fund" },
  { id: "risk", label: "Risk & downside" },
  { id: "benchmark", label: "Benchmark / activeness" },
  { id: "strategy", label: "Strategy" },
  { id: "exposure", label: "Exposure" },
  { id: "holdings", label: "Holdings" },
  { id: "liquidity", label: "Liquidity" },
  { id: "manager", label: "Manager & team" },
];

const MORE_SECTIONS: NavSection[] = [
  { id: "vehexp", label: "Vehicle experience" },
  { id: "fees", label: "Fees" },
  { id: "terms", label: "Terms & redemption" },
  { id: "ops", label: "Operations & compliance" },
  { id: "riskfw", label: "Risk framework" },
  { id: "classification", label: "Classification" },
  { id: "views", label: "Market views" },
  { id: "aum", label: "AUM" },
];

export function CandidateDetailPage({ id }: Props) {
  const { data: rec, loading, error } = useCandidate(id);

  if (loading) return <div className="container"><LoadingState label="Loading candidate…" /></div>;
  if (error || !rec) return <div className="container"><ErrorState message={error ?? "Candidate not found"} /></div>;

  return (
    <div className="container">
      <FundHero rec={rec} />
      <div className="layout">
        <SidebarNav sections={SECTIONS} moreSections={MORE_SECTIONS} />
        <main className="content">
          <ExecutiveSummarySection rec={rec} />
          <AnalystFlagsSection id={id} />
          <OverviewSection rec={rec} />
          <PerformanceSection rec={rec} />
          <ReturnsByFundSection rec={rec} />
          <RiskSection rec={rec} />
          <BenchmarkActivenessSection rec={rec} />
          <StrategySection rec={rec} />
          <ExposureSection rec={rec} />
          <HoldingsSection rec={rec} />
          <LiquiditySection rec={rec} />
          <ManagerSection rec={rec} />
          <VehicleExperienceSection rec={rec} />
          <FeesSection rec={rec} />
          <TermsRedemptionSection rec={rec} />
          <OperationsComplianceSection rec={rec} />
          <RiskFrameworkSection rec={rec} />
          <ClassificationSection rec={rec} />
          <MarketViewsSection rec={rec} />
          <AumSection rec={rec} />
        </main>
      </div>
    </div>
  );
}
