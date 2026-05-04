import { MarketingPage } from "@/components/marketing/marketing-page";
import { JsonLd } from "@/components/seo/json-ld";
import { buildBreadcrumbJsonLd, buildPublicMetadata } from "@/lib/seo";

export const metadata = buildPublicMetadata("features");

export default function FeaturesPage() {
  return (
    <>
      <JsonLd data={buildBreadcrumbJsonLd("features")} />
      <MarketingPage pageKey="features" />
    </>
  );
}
