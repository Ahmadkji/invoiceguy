import type { MetadataRoute } from "next";
import { publicPages } from "@/lib/marketing-content";
import { getAbsoluteUrl } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicPages.map((page) => ({
    url: getAbsoluteUrl(page.pathname),
    lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
