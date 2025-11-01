"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IoChevronDown, IoChevronUp } from "react-icons/io5";

// Must mirror buckets used server-side
const PRICE_BUCKETS = [
  { key: "0-500", label: "RM0 – RM500" },
  { key: "501-1000", label: "RM501 – RM1000" },
  { key: "1001-2000", label: "RM1001 – RM2000" },
  { key: "2001-5000", label: "RM2001 – RM5000" },
  { key: "5001+", label: "RM5001+" },
] as const;

type Props = {
  orderby: string;
  priceRange?: string;
  tripType?: string;
  pickup?: string; // "1" | "true" | undefined
  childFriendly?: string; // "1" | "true" | undefined
  destination?: string;
  date?: string;
  adults?: number;
  children?: number;
  tripNames: string[]; // unique trip names coming from server
};

export default function FiltersBar({
  orderby,
  priceRange,
  tripType,
  pickup,
  childFriendly,
  destination,
  date,
  adults,
  children,
  tripNames,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [open, setOpen] = useState(true);

  // On mount, default collapsed on mobile (< md), open on desktop (>= md)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    setOpen(mq.matches);
    const handler = (e: MediaQueryListEvent) => setOpen(e.matches);
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", handler);
    } else {
      // Fallback for older browsers
      mq.addListener(handler);
    }
    return () => {
      if (typeof mq.removeEventListener === "function") {
        mq.removeEventListener("change", handler);
      } else {
        mq.removeListener(handler);
      }
    };
  }, []);

  const setParam = useCallback(
    (key: string, value: string | undefined) => {
      const qs = new URLSearchParams(sp?.toString());
      if (value == null || value === "") qs.delete(key);
      else qs.set(key, value);
      router.replace(`${pathname}?${qs.toString()}`, { scroll: false });
    },
    [pathname, router, sp]
  );

  const toggleBool = useCallback(
    (key: string, checked: boolean) => {
      const qs = new URLSearchParams(sp?.toString());
      if (checked) qs.set(key, "1");
      else qs.delete(key);
      router.replace(`${pathname}?${qs.toString()}`, { scroll: false });
    },
    [pathname, router, sp]
  );

  const clearAllUrl = useMemo(() => {
    const qs = new URLSearchParams();
    if (destination) qs.set("destination", destination);
    if (date) qs.set("date", date);
    if (adults && adults > 0) qs.set("adults", String(adults));
    if (children && children > 0) qs.set("children", String(children));
    // Default sort after reset
    qs.set("orderby", "recommended");
    return `${pathname}?${qs.toString()}`;
  }, [adults, children, date, destination, pathname]);

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="mt-5 overflow-hidden bg-white border shadow-md rounded-2xl border-slate-200/60 backdrop-blur-sm"
    >
      <summary className="flex items-center justify-between px-4 py-4 list-none transition-all duration-200 cursor-pointer sm:px-6 sm:py-5 md:hidden bg-gradient-to-r from-white to-slate-50 hover:from-slate-50 hover:to-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#ec2227]/10">
            <svg
              className="w-5 h-5 text-[#ec2227]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
          </div>
          <span className="text-lg font-bold text-slate-900">
            Filters & Sort
          </span>
        </div>
        {open ? (
          <IoChevronUp className="w-6 h-6 text-slate-600" />
        ) : (
          <IoChevronDown className="w-6 h-6 text-slate-600" />
        )}
      </summary>
      <div className="p-4 sm:p-6 bg-gradient-to-br from-white via-slate-50/30 to-white">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          {/* Sort */}
          <label className="flex flex-col gap-2 text-sm">
            <span className="flex items-center gap-2 font-semibold text-slate-700">
              <svg
                className="w-4 h-4 text-[#ec2227]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                />
              </svg>
              Sort by
            </span>
            <select
              name="orderby"
              value={orderby}
              onChange={(e) => setParam("orderby", e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-[#ec2227] focus:ring-2 focus:ring-[#ec2227]/20 transition-all duration-200 hover:border-slate-300 shadow-sm"
            >
              <option value="recommended">Recommended</option>
              <option value="price_low_high">Price: Low to High</option>
              <option value="price_high_low">Price: High to Low</option>
              <option value="capacity_desc">Capacity</option>
              <option value="name_asc">Name (A–Z)</option>
            </select>
          </label>

          {/* Filters row */}
          <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
            {/* Price range */}
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <svg
                  className="w-4 h-4 text-[#ec2227]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Price Range
              </label>
              <select
                name="price_range"
                value={priceRange || ""}
                onChange={(e) => setParam("price_range", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-[#ec2227] focus:ring-2 focus:ring-[#ec2227]/20 transition-all duration-200 hover:border-slate-300 shadow-sm"
              >
                <option value="">All Prices</option>
                {PRICE_BUCKETS.map((b) => (
                  <option key={b.key} value={b.key}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Trip type */}
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <svg
                  className="w-4 h-4 text-[#ec2227]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Trip Type
              </label>
              <select
                name="trip_type"
                value={tripType || ""}
                onChange={(e) => setParam("trip_type", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium focus:border-[#ec2227] focus:ring-2 focus:ring-[#ec2227]/20 transition-all duration-200 hover:border-slate-300 shadow-sm"
              >
                <option value="">All Trip Types</option>
                {tripNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap items-center gap-3 text-sm md:gap-4">
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#ec2227]/30 hover:bg-[#ec2227]/5 transition-all duration-200 cursor-pointer group shadow-sm">
              <input
                type="checkbox"
                name="pickup"
                checked={pickup === "1" || pickup === "true"}
                onChange={(e) => toggleBool("pickup", e.target.checked)}
                className="w-4 h-4 rounded text-[#ec2227] border-slate-300 focus:ring-[#ec2227] focus:ring-2 focus:ring-offset-0 transition-all"
              />
              <svg
                className="w-4 h-4 text-slate-600 group-hover:text-[#ec2227] transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                />
              </svg>
              <span className="font-medium text-slate-700 group-hover:text-slate-900">
                Pickup
              </span>
            </label>

            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#ec2227]/30 hover:bg-[#ec2227]/5 transition-all duration-200 cursor-pointer group shadow-sm">
              <input
                type="checkbox"
                name="child_friendly"
                checked={childFriendly === "1" || childFriendly === "true"}
                onChange={(e) => toggleBool("child_friendly", e.target.checked)}
                className="w-4 h-4 rounded text-[#ec2227] border-slate-300 focus:ring-[#ec2227] focus:ring-2 focus:ring-offset-0 transition-all"
              />
              <svg
                className="w-4 h-4 text-slate-600 group-hover:text-[#ec2227] transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              <span className="font-medium text-slate-700 group-hover:text-slate-900">
                Kid Friendly
              </span>
            </label>

            {/* Reset */}
            <a
              href={clearAllUrl}
              className="ml-auto inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm group"
              onClick={(e) => {
                e.preventDefault();
                router.replace(clearAllUrl, { scroll: false });
              }}
            >
              <svg
                className="w-4 h-4 text-slate-600 group-hover:text-[#ec2227] transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="text-slate-700 group-hover:text-slate-900">
                Reset All
              </span>
            </a>
          </div>
        </div>
      </div>
    </details>
  );
}
