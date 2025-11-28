"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

interface MobileStickyBarProps {
  minPrice: number;
  onBookNow?: () => void;
}

export function MobileStickyBar({ minPrice, onBookNow }: MobileStickyBarProps) {
  const t = useTranslations("charter.mobileStickyBar");

  const handleClick = useCallback(() => {
    if (onBookNow) {
      onBookNow();
    } else {
      // Scroll to booking widget
      const bookingWidget = document.querySelector("[data-booking-widget]");
      if (bookingWidget) {
        bookingWidget.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [onBookNow]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">{t("from")}</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-primary">
                RM{minPrice}
              </span>
              <span className="text-sm text-gray-500">{t("perTrip")}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClick}
            className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white transition-colors rounded-full bg-primary hover:bg-primary/90"
          >
            {t("bookNow")}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
