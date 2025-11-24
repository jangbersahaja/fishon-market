import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fishing Blog & Guides | Fishon.my",
  description:
    "Discover expert fishing tips, charter guides, destination reviews, and techniques for Malaysian waters. Your complete resource for fishing adventures.",
  metadataBase: new URL("https://www.fishon.my"),
  alternates: {
    canonical: "https://www.fishon.my/blog",
    types: {
      "application/rss+xml": "https://www.fishon.my/blog/rss.xml",
    },
  },
  openGraph: {
    title: "Fishing Blog & Guides | Fishon.my",
    description:
      "Expert fishing tips, charter guides, and destination reviews for Malaysian anglers.",
    url: "https://www.fishon.my/blog",
    siteName: "Fishon.my",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fishing Blog & Guides | Fishon.my",
    description:
      "Expert fishing tips, charter guides, and destination reviews for Malaysian anglers.",
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

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
