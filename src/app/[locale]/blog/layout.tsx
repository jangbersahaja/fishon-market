import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("blogPage.layout");

  return {
    title: t("title"),
    description: t("description"),
    metadataBase: new URL("https://www.fishon.my"),
    alternates: {
      canonical: "https://www.fishon.my/blog",
      types: {
        "application/rss+xml": "https://www.fishon.my/blog/rss.xml",
      },
    },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: "https://www.fishon.my/blog",
      siteName: "Fishon.my",
      images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("ogTitle"),
      description: t("ogDescription"),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
