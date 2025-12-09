import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { unstable_noStore as noStore } from "next/cache";
import { Suspense } from "react";
import RegisterClient from "./RegisterClient";

export const metadata: Metadata = {
  title: "Create Account - Fishon",
  description:
    "Create your Fishon account to start booking amazing fishing charters in Malaysia.",
};

type RouteParams = Promise<{ locale: string }>;

export async function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ms" }];
}

export default async function RegisterPage({
  params,
}: {
  params: RouteParams;
}) {
  noStore();

  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense fallback={<div className="w-full h-screen bg-[#ec2227]" />}>
      <RegisterClient locale={locale} />
    </Suspense>
  );
}
