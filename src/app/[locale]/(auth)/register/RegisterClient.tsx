"use client";

import { useAuthModal } from "@/components/auth/AuthModalContext";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

export default function RegisterClient() {
  const { openModal } = useAuthModal();
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");

  useEffect(() => {
    openModal("register", undefined, { showHomeButton: true });
  }, [openModal]);

  return (
    <main className="flex items-center justify-center min-h-screen bg-[#ec2227]">
      <div className="text-center">
        <div
          className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-white border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
          role="status"
        >
          <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
            {tCommon("loading")}
          </span>
        </div>
        <p className="mt-4 text-sm font-medium text-white">
          {t("loadingRegistration")}
        </p>
      </div>
    </main>
  );
}
