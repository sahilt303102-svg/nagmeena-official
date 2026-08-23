import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/catalog";
import { getSiteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [{ url: siteUrl, lastModified: now, changeFrequency: "daily", priority: 1 }];
  try {
    const { products } = await getCatalog();
    for (const product of products) {
      entries.push({
        url: `${siteUrl}/product/${encodeURIComponent(product.productCode)}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch {}
  return entries;
}
