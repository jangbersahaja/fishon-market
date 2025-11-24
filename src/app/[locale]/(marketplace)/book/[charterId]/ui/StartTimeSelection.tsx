"use client";

import { convert24to12Hour } from "@/lib/helpers/booking-helpers";
import { useTranslations } from "next-intl";

interface StartTimeSelectionProps {
  startTimes?: string[];
  startTime: string;
  onStartTimeChange: (time: string) => void;
}

export default function StartTimeSelection({
  startTimes,
  startTime,
  onStartTimeChange,
}: StartTimeSelectionProps) {
  const t = useTranslations("booking.checkout.startTime");

  if (!startTimes || startTimes.length === 0) return null;

  return (
    <section className="pb-5 border-b border-black/10">
      <h2 className="mb-3 text-base font-semibold sm:text-lg">{t("title")}</h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {startTimes.map((time) => {
          const isSelected = time === startTime;

          return (
            <button
              key={time}
              type="button"
              onClick={() => onStartTimeChange(time)}
              className={`px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                isSelected
                  ? "bg-[#ec2227] text-white ring-2 ring-[#ec2227] ring-offset-2 shadow-sm"
                  : "bg-slate-50 text-gray-700 border border-gray-300 hover:border-[#ec2227] hover:bg-[#ec2227]/10"
              }`}
            >
              {convert24to12Hour(time)}
            </button>
          );
        })}
      </div>
      {!startTime && (
        <p className="mt-2 text-xs text-red-600">{t("warningMessage")}</p>
      )}
    </section>
  );
}
