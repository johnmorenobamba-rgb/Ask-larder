import type { MetadataRoute } from "next";
import { FEATURE_SLUGS } from "@/data/features";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: `${base}/`, priority: 1 },
    ...FEATURE_SLUGS.map((slug) => ({ url: `${base}/features/${slug}`, priority: 0.8 })),
    { url: `${base}/contact`, priority: 0.6 },
    { url: `${base}/legal`, priority: 0.2 },
    { url: `${base}/privacy`, priority: 0.2 },
  ];
}
