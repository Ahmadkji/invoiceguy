import { MarketingPage } from "@/components/marketing/marketing-page";
import { JsonLd } from "@/components/seo/json-ld";
import { buildBreadcrumbJsonLd, buildPublicMetadata } from "@/lib/seo";

export const metadata = buildPublicMetadata("how-it-works");

export default function HowItWorksPage() {
  return (
    <>
      <JsonLd data={buildBreadcrumbJsonLd("how-it-works")} />
      <MarketingPage pageKey="how-it-works" />
    </>
  );
}
