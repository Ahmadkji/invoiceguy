import type { MetadataRoute } from "next";
import { getAbsoluteUrl } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/api/"],
      },
    ],
    sitemap: getAbsoluteUrl("/sitemap.xml"),
  };
}
