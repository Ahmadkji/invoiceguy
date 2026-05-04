import { MarketingPage } from "@/components/marketing/marketing-page";
import { JsonLd } from "@/components/seo/json-ld";
import { buildBreadcrumbJsonLd, buildPublicMetadata } from "@/lib/seo";

export const metadata = buildPublicMetadata("hourly-freelancers");

export default function HourlyFreelancersPage() {
  return (
    <>
      <JsonLd data={buildBreadcrumbJsonLd("hourly-freelancers")} />
      <MarketingPage pageKey="hourly-freelancers" />
    </>
  );
}
