import { createMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { unstable_noStore as noStore } from "next/cache";
import RefundPolicyInteractive from "./RefundPolicyInteractive";

export const metadata: Metadata = createMetadata({
  title: "Refund Policy",
  description:
    "Understand Fishon.my refund policy for cancelled fishing charters and bookings",
  keywords: ["refund policy", "cancellation", "fishing charter"],
  canonicalUrl: "https://www.fishon.my/refund-policy",
});

type RouteParams = Promise<{ locale: string }>;

export async function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ms" }];
}

export default async function RefundPolicyPage({
  params,
}: {
  params: RouteParams;
}) {
  noStore();
  const { locale } = await params;
  setRequestLocale(locale);
  setRequestLocale(locale);
  return (
    <div className="relative isolate">
      <section className="bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:py-24">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Refund & Cancellation Policy
          </h1>
          <p className="text-slate-300 max-w-2xl text-sm sm:text-base leading-relaxed">
            Last updated: 4 October 2025
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-12 prose prose-slate dark:prose-invert prose-headings:scroll-mt-24">
        <p className="not-prose text-sm text-slate-500 mb-8">
          Fishon.my (&quot;Fishon&quot;, &quot;we&quot;, &quot;our&quot;, or
          &quot;us&quot;) is owned and operated by Kartel Motion Ventures
          (Business Registration No: 202203267096 (003441013-T)). This Refund &
          Cancellation Policy explains how cancellations, rescheduling, and
          refunds are handled for bookings made through our platform Fishon.my.
          By making a booking on Fishon.my, you agree to the terms outlined
          below.
        </p>
        <hr className="my-10 border-slate-200" />
        <RefundPolicyInteractive />
      </div>
    </div>
  );
}
