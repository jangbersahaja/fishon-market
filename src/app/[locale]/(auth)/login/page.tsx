import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Sign In - Fishon",
  description:
    "Sign in to your Fishon account to book fishing charters and manage your bookings.",
};

// Loading fallback for LoginClient which uses useSearchParams
function LoginFallback() {
  return (
    <main className="flex items-center justify-center min-h-screen bg-[#ec2227]">
      <div className="text-center">
        <div
          className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-white border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
          role="status"
        >
          <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
            Loading...
          </span>
        </div>
      </div>
    </main>
  );
}

type RouteParams = Promise<{ locale: string }>;

export default async function LoginPage({
  params,
}: {
  params: RouteParams;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginClient />
    </Suspense>
  );
}
