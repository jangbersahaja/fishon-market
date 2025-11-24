"use client";

import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface CancellationInfoProps {
  cancellationReason?: string | null;
  cancellationSource?: "customer" | "captain";
}

export function CancellationInfo({
  cancellationReason,
  cancellationSource = "customer",
}: CancellationInfoProps) {
  const t = useTranslations("booking.cancellationInfo");

  if (!cancellationReason) {
    return null;
  }

  const isCaptainCancellation = cancellationSource === "captain";

  return (
    <div className="p-3 border border-red-200 rounded-lg sm:p-5 bg-red-50">
      <div className="flex gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="mb-1 font-semibold text-red-900">
            {isCaptainCancellation
              ? t("cancelledByCaptain")
              : t("bookingCancelled")}
          </h4>
          <p className="text-sm text-red-800">{cancellationReason}</p>
          {isCaptainCancellation && (
            <p className="mt-2 text-xs text-red-700">{t("refundNotice")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
