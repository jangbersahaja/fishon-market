"use client";

import {
  Calendar,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Check,
  X,
} from "lucide-react";
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

const DAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
const DAYS_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Schedule type configurations
const SCHEDULE_CONFIG = {
  EVERYDAY: {
    icon: CalendarCheck,
    color: "text-[#ec2227]",
    bgColor: "bg-[#ec2227]/10",
  },
  WEEKDAYS: {
    icon: CalendarDays,
    color: "text-[#ec2227]",
    bgColor: "bg-[#ec2227]/10",
  },
  WEEKENDS: {
    icon: CalendarRange,
    color: "text-[#ec2227]",
    bgColor: "bg-[#ec2227]/10",
  },
  CUSTOM: {
    icon: Calendar,
    color: "text-[#ec2227]",
    bgColor: "bg-[#ec2227]/10",
  },
};

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

  const config = SCHEDULE_CONFIG[scheduleType] || SCHEDULE_CONFIG.CUSTOM;
  const IconComponent = config.icon;

  // Determine which days are operational based on schedule type
  const getOperationalDays = (): number[] => {
    switch (scheduleType) {
      case "EVERYDAY":
        return [0, 1, 2, 3, 4, 5, 6];
      case "WEEKDAYS":
        return [1, 2, 3, 4, 5];
      case "WEEKENDS":
        return [0, 6];
      case "CUSTOM":
        return operationalDays;
      default:
        return [];
    }
  };

  const activeDays = getOperationalDays();
  const activeDayCount = activeDays.length;

  // Render schedule description based on type
  const renderScheduleDescription = () => {
    switch (scheduleType) {
      case "EVERYDAY":
        return (
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#ec2227]">
              <Check className="w-3 h-3 text-white" />
            </div>
            <p className="text-sm text-gray-700">
              {t("everyday.prefix")}{" "}
              <span className="font-semibold text-gray-900">
                {t("everyday.highlight")}
              </span>
            </p>
          </div>
        );

      case "WEEKDAYS":
        return (
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#ec2227]">
              <Check className="w-3 h-3 text-white" />
            </div>
            <p className="text-sm text-gray-700">
              {t("weekdays.prefix")}{" "}
              <span className="font-semibold text-gray-900">
                {t("weekdays.highlight")}
              </span>
            </p>
          </div>
        );

      case "WEEKENDS":
        return (
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#ec2227]">
              <Check className="w-3 h-3 text-white" />
            </div>
            <p className="text-sm text-gray-700">
              {t("weekends.prefix")}{" "}
              <span className="font-semibold text-gray-900">
                {t("weekends.highlight")}
              </span>
            </p>
          </div>
        );

      case "CUSTOM":
        if (operationalDays.length === 0) {
          return (
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200">
                <X className="w-3 h-3 text-gray-500" />
              </div>
              <p className="text-sm text-gray-500">{t("custom.contact")}</p>
            </div>
          );
        }

        return <p className="text-sm text-gray-700">{t("custom.prefix")}</p>;

      default:
        return null;
    }
  };

  return (
    <div
      className={[
        "overflow-hidden rounded-2xl bg-white border border-gray-200",
        className,
      ].join(" ")}
    >
      {/* Header */}
      <div className="relative px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${config.bgColor}`}
            >
              <IconComponent className={`w-4 h-4 ${config.color}`} />
            </div>
            <h3 className="text-base font-semibold text-gray-900 sm:text-lg">
              {t("title")}
            </h3>
          </div>
          {/* Active days count badge */}
          <div className="px-2.5 py-1 text-xs font-semibold text-[#ec2227] bg-[#ec2227]/10 rounded-full">
            {activeDayCount}/7 {activeDayCount === 1 ? "day" : "days"}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Description */}
        <div className="mb-4">{renderScheduleDescription()}</div>

        {/* Visual day indicators - always show for visual consistency */}
        <div className="flex justify-between gap-1">
          {DAYS_SHORT.map((day, index) => {
            const isOperational = activeDays.includes(index);
            return (
              <div
                key={`${DAYS_ABBR[index]}-${index}`}
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className={[
                    "flex items-center justify-center w-9 h-9 text-xs font-semibold rounded-full transition-all",
                    isOperational
                      ? "bg-[#ec2227] text-white shadow-sm"
                      : "bg-gray-100 text-gray-400",
                  ].join(" ")}
                  title={DAYS_FULL[index]}
                >
                  {day}
                </div>
                <span
                  className={[
                    "text-[10px] font-medium",
                    isOperational ? "text-gray-700" : "text-gray-400",
                  ].join(" ")}
                >
                  {DAYS_ABBR[index]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Custom schedule - show operating days text */}
        {scheduleType === "CUSTOM" && operationalDays.length > 0 && (
          <p className="mt-3 text-xs text-gray-500 text-center">
            {t("custom.operatingDays")}:{" "}
            <span className="font-medium text-gray-700">
              {[...operationalDays]
                .sort((a, b) => a - b)
                .map((day) => DAYS_FULL[day])
                .join(", ")}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
