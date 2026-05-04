import { MarketingPage } from "@/components/marketing/marketing-page";
import { JsonLd } from "@/components/seo/json-ld";
import { buildBreadcrumbJsonLd, buildPublicMetadata, buildSoftwareApplicationJsonLd } from "@/lib/seo";

export const metadata = buildPublicMetadata("pricing");

export default function PricingPage() {
  return (
    <>
      <JsonLd data={buildBreadcrumbJsonLd("pricing")} />
      <JsonLd
        data={buildSoftwareApplicationJsonLd({
          pageName: "Pricing",
          pageDescription:
            "Compare the TimeProof free and pro plans for hourly freelancers.",
          includeOffers: true,
        })}
      />
      <MarketingPage pageKey="pricing" />
    </>
  );
}
