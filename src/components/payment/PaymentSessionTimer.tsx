"use client";

import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const PAYMENT_SESSION_WARNING_MS = 5 * 60 * 1000; // 5 minutes

interface PaymentSessionTimerProps {
  expiresAt: Date;
  charterId: string;
}

export function PaymentSessionTimer({
  expiresAt,
  charterId,
}: PaymentSessionTimerProps) {
  const router = useRouter();
  const t = useTranslations("booking.paymentPreview.sessionTimer");
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [warningShown, setWarningShown] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = expiresAt.getTime() - Date.now();

      if (remaining <= 0) {
        // Session expired - redirect with warning
        toast.error(t("expired"));
        router.push(
          `/book/${charterId}?error=session_expired&message=${encodeURIComponent(
            t("expiredMessage")
          )}`
        );
        return;
      }

      if (remaining <= PAYMENT_SESSION_WARNING_MS && !warningShown) {
        toast.warning(t("warningMinutes"), {
          duration: 5000,
        });
        setWarningShown(true);
      }

      setTimeLeft(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, charterId, router, warningShown, t]);

  const minutes = Math.floor(timeLeft / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
  const isUrgent = timeLeft <= PAYMENT_SESSION_WARNING_MS;

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border transition-colors",
        isUrgent
          ? "bg-red-50 border-red-300 animate-pulse"
          : "bg-amber-50 border-amber-300"
      )}
    >
      <div className="flex items-center gap-2">
        <Clock
          className={cn(
            "h-5 w-5",
            isUrgent ? "text-red-600" : "text-amber-600"
          )}
        />
        <div>
          <p
            className={cn(
              "text-sm font-semibold",
              isUrgent ? "text-red-900" : "text-amber-900"
            )}
          >
            {t("expiresIn")}
          </p>
          <p
            className={cn(
              "text-lg font-bold tabular-nums",
              isUrgent ? "text-red-600" : "text-amber-600"
            )}
          >
            {minutes.toString().padStart(2, "0")}:
            {seconds.toString().padStart(2, "0")}
          </p>
        </div>
      </div>
    </div>
  );
}
