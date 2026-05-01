import { TimeGlassHero } from "@/components/landing/hero";
import { StatsTicker } from "@/components/landing/stats-ticker";
import { PainPulseGrid } from "@/components/landing/pain-points";
import { TrustTimeline } from "@/components/landing/trust-timeline";
import { BillingRuleVisualizer } from "@/components/landing/billing-visualizer";
import { FeaturesGrid } from "@/components/landing/features";
import { TinyTaskConstellation } from "@/components/landing/tiny-task-constellation";
import { WorkflowStrip } from "@/components/landing/workflow-strip";
import { PricingOrbit } from "@/components/landing/pricing-orbit";
import { LandingFooter } from "@/components/landing/footer";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <TimeGlassHero />
      <StatsTicker />
      <PainPulseGrid />
      <TrustTimeline />
      <BillingRuleVisualizer />
      <FeaturesGrid />
      <TinyTaskConstellation />
      <WorkflowStrip />
      <PricingOrbit />
      <LandingFooter />
    </main>
  );
}
