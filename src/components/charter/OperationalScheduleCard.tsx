"use client";

import { useTranslations } from "next-intl";

/**
 * Operational Schedule Card Component
 *
 * Displays charter's operational schedule with visual day indicators
 * for CUSTOM schedules.
 */

interface OperationalScheduleCardProps {
  scheduleType: "EVERYDAY" | "WEEKDAYS" | "WEEKENDS" | "CUSTOM";
  operationalDays?: number[]; // 0-6 (Sunday-Saturday)
  className?: string;
}

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function OperationalScheduleCard({
  scheduleType,
  operationalDays = [],
  className = "",
}: OperationalScheduleCardProps) {
  const t = useTranslations("charter.schedule");

  // Get day names from translations
  const DAYS_FULL = [
    t("days.sunday"),
    t("days.monday"),
    t("days.tuesday"),
    t("days.wednesday"),
    t("days.thursday"),
    t("days.friday"),
    t("days.saturday"),
  ];

  // Render schedule description based on type
  const renderScheduleDescription = () => {
    switch (scheduleType) {
      case "EVERYDAY":
        return (
          <p className="text-sm text-gray-700">
            {t("everyday.prefix")}{" "}
            <span className="font-semibold">{t("everyday.highlight")}</span>
          </p>
        );

      case "WEEKDAYS":
        return (
          <p className="text-sm text-gray-700">
            {t("weekdays.prefix")}{" "}
            <span className="font-semibold">{t("weekdays.highlight")}</span>
          </p>
        );

      case "WEEKENDS":
        return (
          <p className="text-sm text-gray-700">
            {t("weekends.prefix")}{" "}
            <span className="font-semibold">{t("weekends.highlight")}</span>
          </p>
        );

      case "CUSTOM":
        if (operationalDays.length === 0) {
          return <p className="text-sm text-gray-500">{t("custom.contact")}</p>;
        }

        // Sort days and format list
        const sortedDays = [...operationalDays].sort((a, b) => a - b);
        const dayNames = sortedDays.map((day) => DAYS_FULL[day]);

        return (
          <div>
            <p className="mb-3 text-sm text-gray-700">{t("custom.prefix")}</p>
            <div className="flex flex-wrap gap-2">
              {DAYS_SHORT.map((day, index) => {
                const isOperational = operationalDays.includes(index);
                return (
                  <div
                    key={day}
                    className={[
                      "flex items-center justify-center w-10 h-10 text-xs font-medium rounded-full border-2 transition-colors",
                      isOperational
                        ? "bg-green-50 border-green-500 text-green-700"
                        : "bg-gray-50 border-gray-200 text-gray-400",
                    ].join(" ")}
                    title={DAYS_FULL[index]}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-gray-600">
              {t("custom.operatingDays")}: {dayNames.join(", ")}
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={["rounded-2xl bg-white p-5 shadow-lg", className].join(" ")}
    >
      <h3 className="pb-2 mb-2 text-base font-semibold border-b border-gray-200 sm:text-lg">
        {t("title")}
      </h3>
      {renderScheduleDescription()}
    </div>
  );
}
