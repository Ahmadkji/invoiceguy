import { MarketingPage } from "@/components/marketing/marketing-page";
import { JsonLd } from "@/components/seo/json-ld";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, buildPublicMetadata } from "@/lib/seo";

export const metadata = buildPublicMetadata("faq");

export default function FaqPage() {
  return (
    <>
      <JsonLd data={buildBreadcrumbJsonLd("faq")} />
      <JsonLd data={buildFaqJsonLd()} />
      <MarketingPage pageKey="faq" />
    </>
  );
}
