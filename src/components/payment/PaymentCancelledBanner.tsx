"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

interface PaymentCancelledBannerProps {
  message?: string;
}

export function PaymentCancelledBanner({
  message,
}: PaymentCancelledBannerProps) {
  const t = useTranslations("booking.paymentPreview");

  return (
    <Alert className="mb-6 border-amber-200 bg-amber-50">
      <AlertCircle className="w-5 h-5 text-amber-600" />
      <AlertTitle className="text-amber-800">
        <span className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          {t("retryBanner.title")}
        </span>
      </AlertTitle>
      <AlertDescription className="text-amber-700">
        {message || t("retryBanner.description")}
      </AlertDescription>
    </Alert>
  );
}
