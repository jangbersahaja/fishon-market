import type { MetadataRoute } from "next";
import { prismaCaptain } from "@/lib/database/prisma-captain";
import { prisma } from "@/lib/database/prisma";

const BASE_URL = "https://www.fishon.my";
const LOCALES = ["ms", "en"] as const;

function localeUrls(path: string, lastModified?: Date): MetadataRoute.Sitemap {
  return LOCALES.map((locale) => ({
    url: `${BASE_URL}/${locale}${path}`,
    lastModified: lastModified ?? new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    ...LOCALES.map((locale) => ({
      url: `${BASE_URL}/${locale}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0,
    })),
    ...localeUrls("/charters", undefined),
    ...localeUrls("/search", undefined),
    ...localeUrls("/categories/destinations", undefined),
    ...localeUrls("/categories/species", undefined),
    ...localeUrls("/categories/techniques", undefined),
    ...localeUrls("/categories/types", undefined),
    ...localeUrls("/blog", undefined),
    ...localeUrls("/about", undefined),
    ...localeUrls("/support/help", undefined),
    ...localeUrls("/support/contact", undefined),
    ...localeUrls("/privacy", undefined),
    ...localeUrls("/terms", undefined),
    ...localeUrls("/captain-terms", undefined),
    ...localeUrls("/refund-policy", undefined),
  ];

  const [charters, blogPosts] = await Promise.all([
    prismaCaptain.charter
      .findMany({ where: { isActive: true }, select: { id: true, updatedAt: true } })
      .catch(() => []),
    prisma.blogPost
      .findMany({ where: { published: true }, select: { slug: true, updatedAt: true } })
      .catch(() => []),
  ]);

  const charterUrls: MetadataRoute.Sitemap = charters.flatMap((charter) =>
    localeUrls(`/charters/${charter.id}`, charter.updatedAt)
  );

  const blogUrls: MetadataRoute.Sitemap = blogPosts.flatMap((post) =>
    localeUrls(`/blog/${post.slug}`, post.updatedAt)
  );

  return [...staticPages, ...charterUrls, ...blogUrls];
}
