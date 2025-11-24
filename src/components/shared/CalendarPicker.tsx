"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { IoCalendarClear } from "react-icons/io5";

// Local date helpers (no UTC conversion)
// Malaysia date format: DD/MM/YYYY
const DISPLAY_FORMATTER = new Intl.DateTimeFormat("en-MY", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function formatLocalYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseLocalYMD(s?: string | null): Date | undefined {
  if (!s) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || !mo || !d) return undefined;
  return new Date(y, mo - 1, d); // local midnight
}
function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function startDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0..6
}

interface RangeValue {
  startDate: string;
  endDate: string;
}

export interface PartialAvailability {
  date: string; // YYYY-MM-DD
  unavailableTimeRanges: { startTime: string; endTime: string }[]; // HH:MM format
}

export default function CalendarPicker({
  value,
  onChange,
  onRangeChange,
  disablePast = true,
  minDate,
  blockedDates = new Set(),
  partialAvailability = new Map(),
  className = "",
  buttonClassName = "",
  mode = "single",
  enableModeToggle = false,
  initialDays,
}: {
  value?: string; // "YYYY-MM-DD" for single mode
  onChange?: (v: string) => void; // For single mode
  onRangeChange?: (range: RangeValue) => void; // For range mode
  disablePast?: boolean;
  minDate?: Date; // Minimum selectable date (overrides disablePast)
  blockedDates?: Set<string>; // Set of YYYY-MM-DD date strings to block (full day)
  partialAvailability?: Map<string, PartialAvailability>; // Map of dates with time-based unavailability
  className?: string;
  buttonClassName?: string; // style the trigger if needed
  mode?: "single" | "range"; // Default mode
  enableModeToggle?: boolean; // Show toggle button to switch modes
  initialDays?: number; // Initial number of days for range mode
}) {
  const [open, setOpen] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log(`[CalendarPicker:${className}] Props received:`, {
      blockedDatesCount: blockedDates.size,
      blockedDatesSample: Array.from(blockedDates).slice(0, 5),
      partialAvailabilityCount: partialAvailability.size,
      partialAvailabilitySample: Array.from(partialAvailability.keys()).slice(
        0,
        5
      ),
    });
  }, [blockedDates, partialAvailability, className]);

  // Initialize mode based on initialDays
  const [currentMode, setCurrentMode] = useState<"single" | "range">(() => {
    if (initialDays && initialDays > 1) return "range";
    return mode;
  });

  // Initialize range based on value and initialDays
  const [rangeStart, setRangeStart] = useState<Date | null>(() => {
    if (initialDays && initialDays > 1 && value) {
      return parseLocalYMD(value) || null;
    }
    return null;
  });

  const [rangeEnd, setRangeEnd] = useState<Date | null>(() => {
    if (initialDays && initialDays > 1 && value) {
      const start = parseLocalYMD(value);
      if (start) {
        const end = new Date(start);
        end.setDate(end.getDate() + initialDays - 1);
        return end;
      }
    }
    return null;
  });

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const selected = parseLocalYMD(value);
  const [viewYear, setViewYear] = useState(
    selected?.getFullYear() ?? today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(
    selected?.getMonth() ?? today.getMonth()
  );

  // Sync range state with external value changes
  useEffect(() => {
    if (currentMode === "single") {
      // In single mode, clear range state
      if (rangeStart || rangeEnd) {
        setRangeStart(null);
        setRangeEnd(null);
      }
    }
  }, [value, currentMode, rangeStart, rangeEnd]);

  useEffect(() => {
    // keep view anchored to externally changed value
    if (selected) {
      setViewYear(selected.getFullYear());
      setViewMonth(selected.getMonth());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const dim = daysInMonth(viewYear, viewMonth);
  const firstDow = startDayOfMonth(viewYear, viewMonth);

  const weeks: (number | null)[][] = [];
  {
    let w: (number | null)[] = Array(firstDow).fill(null);
    for (let d = 1; d <= dim; d++) {
      w.push(d);
      if (w.length === 7) {
        weeks.push(w);
        w = [];
      }
    }
    if (w.length) {
      while (w.length < 7) w.push(null);
      weeks.push(w);
    }
  }

  const isPast = (y: number, m: number, d: number) => {
    const cand = new Date(y, m, d);
    cand.setHours(0, 0, 0, 0);

    // If minDate is provided, use it as the cutoff
    if (minDate) {
      const minDateTime = new Date(minDate);
      minDateTime.setHours(0, 0, 0, 0);
      return cand.getTime() < minDateTime.getTime();
    }

    // Otherwise, use disablePast with today
    if (!disablePast) return false;
    return cand.getTime() < today.getTime();
  };

  const isBlocked = (y: number, m: number, d: number) => {
    const dateStr = formatLocalYMD(new Date(y, m, d));
    return blockedDates.has(dateStr);
  };

  const hasPartialAvailability = (y: number, m: number, d: number) => {
    const dateStr = formatLocalYMD(new Date(y, m, d));
    const hasIt = partialAvailability.has(dateStr);

    // Debug logging for specific dates
    if (dateStr.startsWith("2025-12-1") && hasIt) {
      console.log(
        `[CalendarPicker] Date ${dateStr} has partial availability:`,
        {
          unavailableRanges:
            partialAvailability.get(dateStr)?.unavailableTimeRanges,
        }
      );
    }

    return hasIt;
  };

  const isInRange = (y: number, m: number, d: number) => {
    if (!rangeStart || !rangeEnd) return false;
    const date = new Date(y, m, d);
    date.setHours(0, 0, 0, 0);
    return date >= rangeStart && date <= rangeEnd;
  };

  const handleRangeClick = (date: Date) => {
    if (!rangeStart || rangeEnd) {
      // Start new range
      setRangeStart(date);
      setRangeEnd(null);
    } else {
      // Complete range
      if (date < rangeStart) {
        // User clicked earlier date - swap
        setRangeEnd(rangeStart);
        setRangeStart(date);
      } else if (date.getTime() === rangeStart.getTime()) {
        // Same date clicked - reset
        setRangeStart(null);
        setRangeEnd(null);
      } else {
        setRangeEnd(date);
      }
    }
  };

  const handleRangeConfirm = () => {
    if (rangeStart && rangeEnd && onRangeChange) {
      onRangeChange({
        startDate: formatLocalYMD(rangeStart),
        endDate: formatLocalYMD(rangeEnd),
      });
      setOpen(false);
    }
  };

  const t = useTranslations("booking.calendar");

  const monthNames = [
    t("months.january"),
    t("months.february"),
    t("months.march"),
    t("months.april"),
    t("months.may"),
    t("months.june"),
    t("months.july"),
    t("months.august"),
    t("months.september"),
    t("months.october"),
    t("months.november"),
    t("months.december"),
  ];
  const dow = [
    t("days.sun"),
    t("days.mon"),
    t("days.tue"),
    t("days.wed"),
    t("days.thu"),
    t("days.fri"),
    t("days.sat"),
  ];

  // Display text for button
  const buttonText = useMemo(() => {
    if (currentMode === "range" && rangeStart && rangeEnd) {
      try {
        const start = DISPLAY_FORMATTER.format(rangeStart);
        const end = DISPLAY_FORMATTER.format(rangeEnd);
        return `${start} - ${end}`;
      } catch {
        return t("selectDateRange");
      }
    } else if (currentMode === "single" && value) {
      try {
        return DISPLAY_FORMATTER.format(new Date(value));
      } catch {
        return value;
      }
    }
    return currentMode === "range" ? t("selectDateRange") : t("selectDate");
  }, [currentMode, rangeStart, rangeEnd, value, t]);

  return (
    <div className={["relative", className].join(" ")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "w-full rounded-lg flex gap-2 items-center border border-gray-300 py-2 px-3 text-left text-sm outline-none",
          buttonClassName,
        ].join(" ")}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <IoCalendarClear className="w-4 h-4 text-gray-600" />
        <span
          className={`w-full flex ${
            (currentMode === "single" && value) ||
            (currentMode === "range" && rangeStart && rangeEnd)
              ? ""
              : "text-gray-500"
          }`}
        >
          {buttonText}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t("chooseDate")}
          className="absolute z-20 mt-2 w-[min(20rem,100%)] rounded-xl border border-black/10 bg-white shadow-lg"
        >
          {/* Mode Toggle (if enabled) */}
          {enableModeToggle && (
            <div className="flex items-center justify-center gap-1 px-3 py-2 border-b border-black/10">
              <button
                type="button"
                onClick={() => {
                  setCurrentMode("single");
                  setRangeStart(null);
                  setRangeEnd(null);
                }}
                className={[
                  "px-3 py-1 text-xs font-medium rounded transition-colors",
                  currentMode === "single"
                    ? "bg-[#ec2227] text-white"
                    : "text-gray-600 hover:bg-gray-100",
                ].join(" ")}
              >
                {t("singleDay")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentMode("range");
                  setRangeStart(null);
                  setRangeEnd(null);
                }}
                className={[
                  "px-3 py-1 text-xs font-medium rounded transition-colors",
                  currentMode === "range"
                    ? "bg-[#ec2227] text-white"
                    : "text-gray-600 hover:bg-gray-100",
                ].join(" ")}
              >
                {t("multiDay")}
              </button>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-black/10">
            <button
              type="button"
              className="p-1 text-gray-700 rounded hover:bg-gray-100"
              onClick={() => {
                if (viewMonth === 0) {
                  setViewMonth(11);
                  setViewYear((y) => y - 1);
                } else {
                  setViewMonth((m) => m - 1);
                }
              }}
              aria-label={t("previousMonth")}
            >
              ‹
            </button>
            <div className="text-sm font-semibold">
              {monthNames[viewMonth]} {viewYear}
            </div>
            <button
              type="button"
              className="p-1 text-gray-700 rounded hover:bg-gray-100"
              onClick={() => {
                if (viewMonth === 11) {
                  setViewMonth(0);
                  setViewYear((y) => y + 1);
                } else {
                  setViewMonth((m) => m + 1);
                }
              }}
              aria-label={t("nextMonth")}
            >
              ›
            </button>
          </div>

          {/* Grid */}
          <div className="px-3 pt-2 pb-3">
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-gray-500">
              {dow.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 mt-1 text-center">
              {weeks.map((w, wi) =>
                w.map((d, di) => {
                  if (d === null)
                    return <div key={`${wi}-${di}`} className="h-8" />;
                  const isPastDate = isPast(viewYear, viewMonth, d);
                  const isBlockedDate = isBlocked(viewYear, viewMonth, d);
                  const disabled = isPastDate || isBlockedDate;
                  const hasPartial = hasPartialAvailability(
                    viewYear,
                    viewMonth,
                    d
                  );

                  // Debug logging for December dates
                  const debugDateStr = formatLocalYMD(
                    new Date(viewYear, viewMonth, d)
                  );
                  if (
                    debugDateStr.startsWith("2025-12-1") &&
                    (hasPartial || isBlockedDate)
                  ) {
                    console.log(`[CalendarPicker] Rendering ${debugDateStr}:`, {
                      hasPartial,
                      isBlockedDate,
                      disabled,
                      willShowOrangeDot: hasPartial && !disabled,
                    });
                  }

                  // Single mode selection
                  const isSel =
                    currentMode === "single" &&
                    !!selected &&
                    selected.getFullYear() === viewYear &&
                    selected.getMonth() === viewMonth &&
                    selected.getDate() === d;

                  // Range mode selection
                  const dateObj = new Date(viewYear, viewMonth, d);
                  dateObj.setHours(0, 0, 0, 0);
                  const inRange =
                    currentMode === "range" &&
                    rangeStart &&
                    rangeEnd &&
                    isInRange(viewYear, viewMonth, d);
                  const isRangeStart =
                    currentMode === "range" &&
                    rangeStart &&
                    dateObj.getTime() === rangeStart.getTime();
                  const isRangeEndDate =
                    currentMode === "range" &&
                    rangeEnd &&
                    dateObj.getTime() === rangeEnd.getTime();
                  const isRangeEdgeDate = isRangeStart || isRangeEndDate;

                  return (
                    <button
                      key={`${wi}-${di}`}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        const nd = new Date(viewYear, viewMonth, d);
                        nd.setHours(0, 0, 0, 0);

                        if (currentMode === "range") {
                          handleRangeClick(nd);
                        } else {
                          if (onChange) {
                            onChange(formatLocalYMD(nd));
                            setOpen(false);
                          }
                        }
                      }}
                      className={[
                        "h-8 text-sm transition-colors relative",
                        disabled
                          ? "cursor-not-allowed text-gray-300 line-through"
                          : "hover:bg-gray-100",
                        isSel
                          ? "bg-[#ec2227] text-white hover:bg-[#c11212] rounded"
                          : "",
                        isRangeEdgeDate
                          ? "bg-[#ec2227] text-white hover:bg-[#c11212] rounded"
                          : "",
                        inRange && !isRangeEdgeDate
                          ? "bg-red-100 text-gray-900"
                          : "",
                        !disabled && !isSel && !isRangeEdgeDate && !inRange
                          ? "rounded"
                          : "",
                      ].join(" ")}
                      aria-pressed={isSel || isRangeEdgeDate ? true : undefined}
                      title={
                        isBlockedDate
                          ? t("notAvailable")
                          : hasPartial
                            ? t("partialAvailability")
                            : undefined
                      }
                    >
                      {d}
                      {/* Partial availability indicator */}
                      {hasPartial && !disabled && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-500" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
            <div className="flex items-center justify-between mt-2">
              {currentMode === "single" ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const todayStr = formatLocalYMD(today);
                      if (onChange) {
                        onChange(todayStr);
                      }
                      setViewYear(today.getFullYear());
                      setViewMonth(today.getMonth());
                    }}
                    className="px-2 py-1 text-xs text-gray-700 rounded hover:bg-gray-100"
                  >
                    {t("today")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-3 py-1 text-xs font-semibold text-gray-700 rounded hover:bg-gray-100"
                  >
                    {t("close")}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setRangeStart(null);
                      setRangeEnd(null);
                    }}
                    className="px-2 py-1 text-xs text-gray-700 rounded hover:bg-gray-100"
                    disabled={!rangeStart && !rangeEnd}
                  >
                    {t("clear")}
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="px-3 py-1 text-xs font-semibold text-gray-700 rounded hover:bg-gray-100"
                    >
                      {t("cancel")}
                    </button>
                    <button
                      type="button"
                      onClick={handleRangeConfirm}
                      disabled={!rangeStart || !rangeEnd}
                      className={[
                        "px-3 py-1 text-xs font-semibold rounded",
                        rangeStart && rangeEnd
                          ? "bg-[#ec2227] text-white hover:bg-[#c11212]"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed",
                      ].join(" ")}
                    >
                      {t("confirm")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
