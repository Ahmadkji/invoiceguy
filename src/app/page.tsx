import { BillingRuleVisualizer } from "@/components/landing/billing-visualizer";
import { LandingFooter } from "@/components/landing/footer";
import { FeaturesGrid } from "@/components/landing/features";
import { TimeGlassHero } from "@/components/landing/hero";
import { PainPulseGrid } from "@/components/landing/pain-points";
import { PricingOrbit } from "@/components/landing/pricing-orbit";
import { StatsTicker } from "@/components/landing/stats-ticker";
import { TinyTaskConstellation } from "@/components/landing/tiny-task-constellation";
import { TrustTimeline } from "@/components/landing/trust-timeline";
import { WorkflowStrip } from "@/components/landing/workflow-strip";
import { JsonLd } from "@/components/seo/json-ld";
import { buildPublicMetadata, buildSoftwareApplicationJsonLd } from "@/lib/seo";

export const metadata = buildPublicMetadata("home");

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={buildSoftwareApplicationJsonLd({
          pageName: "Homepage",
          pageDescription:
            "TimeProof helps hourly freelancers turn tracked work into client-ready invoices.",
          includeOffers: false,
        })}
      />
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
    </>
  );
}
