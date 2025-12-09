import { createMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { unstable_noStore as noStore } from "next/cache";
import PrivacyInteractive from "./PrivacyInteractive";

export const metadata: Metadata = createMetadata({
  title: "Privacy Policy",
  description:
    "Learn how Fishon.my protects your personal information and data privacy",
  keywords: ["privacy policy", "data protection", "personal information"],
  canonicalUrl: "https://www.fishon.my/privacy",
  // TODO: Add branded OG image (1200x630px) for social sharing
});

type RouteParams = Promise<{ locale: string }>;

export async function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ms" }];
}

export default async function PrivacyPolicyPage({
  params,
}: {
  params: RouteParams;
}) {
  noStore();

  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="relative isolate">
      <section className="text-white bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="px-4 py-20 mx-auto max-w-7xl sm:py-24">
          <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Last updated: 1 October 2025
          </p>
        </div>
      </section>
      <div className="px-4 py-12 mx-auto prose max-w-7xl prose-slate dark:prose-invert prose-headings:scroll-mt-24">
        <p className="mb-8 text-sm not-prose text-slate-500">
          Fishon.my (&quot;Fishon&quot;, &quot;we&quot;, &quot;our&quot;, or
          &quot;us&quot;) is operated by Kartel Motion Ventures (Business
          Registration No: 202203267096 (003441013-T)). We respect your privacy
          and are committed to protecting your personal information in
          accordance with the Personal Data Protection Act 2010 (PDPA) of
          Malaysia. This Privacy Policy explains how we collect, use, disclose,
          and safeguard your data when you use our website, mobile app, or
          related services (collectively, the &quot;Platform&quot;).
        </p>
        <hr className="my-10 border-slate-200" />
        <PrivacyInteractive />
      </div>
    </div>
  );
}
