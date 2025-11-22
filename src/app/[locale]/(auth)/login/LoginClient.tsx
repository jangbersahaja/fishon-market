"use client";

import { useAuthModal } from "@/components/auth/AuthModalContext";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginClient() {
  const { openModal } = useAuthModal();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "admin_only") {
      setError(t("adminAccessOnly"));
    }
    openModal("signin", undefined, { showHomeButton: true });
  }, [openModal, searchParams, t]);

  return (
    <main className="flex items-center justify-center min-h-screen bg-[#ec2227]">
      <div className="text-center max-w-md w-full px-4">
        {error && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow-lg">
            <div className="flex items-center gap-2 text-red-600">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="font-semibold text-sm">{error}</p>
            </div>
          </div>
        )}
        {/* Loading spinner */}
        <div
          className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-white border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
          role="status"
        >
          <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
            {tCommon("loading")}
          </span>
        </div>
        <p className="mt-4 text-white text-sm font-medium">
          {t("loadingSignIn")}
        </p>
      </div>
    </main>
  );
}
