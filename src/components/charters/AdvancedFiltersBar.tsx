"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IoChevronDown, IoChevronUp, IoClose } from "react-icons/io5";
import { CheckboxFilter } from "./filters/CheckboxFilter";
import { FilterSection } from "./filters/FilterSection";
import { RadioFilter } from "./filters/RadioFilter";
import { RangeFilter } from "./filters/RangeFilter";

// Icons
const SortIcon = () => (
  <svg
    className="w-4 h-4"
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
);

const PriceIcon = () => (
  <svg
    className="w-4 h-4"
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
);

const ClockIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg
    className="w-4 h-4"
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
);

const FishIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"
    />
  </svg>
);

const TechniqueIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
    />
  </svg>
);

const BoatIcon = () => (
  <svg
    className="w-4 h-4"
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
);

const StarIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
    />
  </svg>
);

const ShieldIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  </svg>
);

const SettingsIcon = () => (
  <svg
    className="w-4 h-4"
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
);

type Props = {
  // Sort & basic filters
  orderby: string;
  priceRange?: string;
  tripType?: string;
  pickup?: string;
  childFriendly?: string;
  destination?: string;
  date?: string;
  adults?: number;
  childrenCount?: number; // Use childrenCount to avoid React's children prop conflict

  // Advanced filter data
  tripNames: string[];
  availableSpecies: string[];
  availableTechniques: string[];
  availableAmenities: string[];
  availableBoatTypes: string[];
  fishingTypes: string[];
};

export default function AdvancedFiltersBar(props: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Track active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (props.priceRange) count++;
    if (props.tripType) count++;
    if (props.pickup === "1") count++;
    if (props.childFriendly === "1") count++;
    // Add more filter checks here as needed
    return count;
  }, [props]);

  // On mount, detect mobile
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
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
    if (props.destination) qs.set("destination", props.destination);
    if (props.date) qs.set("date", props.date);
    if (props.adults && props.adults > 0)
      qs.set("adults", String(props.adults));
    if (props.childrenCount && props.childrenCount > 0)
      qs.set("children", String(props.childrenCount));
    qs.set("orderby", "recommended");
    return `${pathname}?${qs.toString()}`;
  }, [
    props.adults,
    props.childrenCount,
    props.date,
    props.destination,
    pathname,
  ]);

  // Multi-select filters state (from URL)
  const selectedSpecies = useMemo(
    () => sp?.get("species")?.split(",").filter(Boolean) || [],
    [sp]
  );
  const selectedTechniques = useMemo(
    () => sp?.get("techniques")?.split(",").filter(Boolean) || [],
    [sp]
  );
  const selectedAmenities = useMemo(
    () => sp?.get("amenities")?.split(",").filter(Boolean) || [],
    [sp]
  );

  const handleMultiSelect = useCallback(
    (key: string, values: string[]) => {
      setParam(key, values.length > 0 ? values.join(",") : undefined);
    },
    [setParam]
  );

  // Price range state (simplified buckets)
  const PRICE_BUCKETS = [
    { key: "0-500", label: "RM0 – RM500" },
    { key: "501-1000", label: "RM501 – RM1000" },
    { key: "1001-2000", label: "RM1001 – RM2000" },
    { key: "2001-5000", label: "RM2001 – RM5000" },
    { key: "5001+", label: "RM5001+" },
  ];

  // Departure time options
  const DEPARTURE_TIMES = [
    { value: "morning", label: "Morning (6am - 12pm)" },
    { value: "afternoon", label: "Afternoon (12pm - 6pm)" },
    { value: "evening", label: "Evening (6pm - 12am)" },
    { value: "night", label: "Night (12am - 6am)" },
  ];

  // Duration options
  const DURATION_OPTIONS = [
    { value: "short", label: "Short (< 4 hours)" },
    { value: "half", label: "Half Day (4-6 hours)" },
    { value: "full", label: "Full Day (7-10 hours)" },
    { value: "extended", label: "Extended (> 10 hours)" },
  ];

  // Fishing type options
  const FISHING_TYPE_OPTIONS = [
    {
      value: "inshore",
      label: "Inshore",
      description: "Calm waters, nearshore",
    },
    { value: "offshore", label: "Offshore", description: "Deep sea fishing" },
    { value: "lake", label: "Lake", description: "Freshwater lake fishing" },
    {
      value: "stream",
      label: "Stream",
      description: "River and stream fishing",
    },
  ];

  // Charter style
  const CHARTER_STYLE_OPTIONS = [
    {
      value: "private",
      label: "Private",
      description: "Whole boat for your group",
    },
    {
      value: "shared",
      label: "Shared",
      description: "Share with other anglers",
    },
  ];

  return (
    <div className="mt-5">
      {/* Mobile filter button */}
      {isMobile && (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center justify-between w-full px-4 py-4 transition-colors bg-white border shadow-md rounded-2xl border-slate-200/60 hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#ec2227]/10">
              <SettingsIcon />
            </div>
            <span className="text-lg font-bold text-slate-900">
              Filters & Sort
            </span>
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold text-white bg-[#ec2227] rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </div>
          {open ? (
            <IoChevronUp className="w-6 h-6 text-slate-600" />
          ) : (
            <IoChevronDown className="w-6 h-6 text-slate-600" />
          )}
        </button>
      )}

      {/* Desktop: always visible, Mobile: conditional */}
      {(!isMobile || open) && (
        <div className="overflow-hidden bg-white border shadow-md rounded-2xl border-slate-200/60">
          {/* Header with sort and reset */}
          <div className="flex flex-col gap-4 px-4 py-4 border-b bg-gradient-to-r from-white to-slate-50 sm:px-6 sm:flex-row sm:items-center sm:justify-between border-slate-200">
            {/* Sort dropdown */}
            <label className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center">
              <span className="flex items-center gap-2 font-semibold text-slate-700 whitespace-nowrap">
                <SortIcon />
                Sort by
              </span>
              <select
                name="orderby"
                value={props.orderby}
                onChange={(e) => setParam("orderby", e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium focus:border-[#ec2227] focus:ring-2 focus:ring-[#ec2227]/20 transition-all hover:border-slate-300 shadow-sm min-w-[200px]"
              >
                <option value="recommended">Recommended</option>
                <option value="price_low_high">Price: Low to High</option>
                <option value="price_high_low">Price: High to Low</option>
                <option value="capacity_desc">Capacity</option>
                <option value="rating_desc">Highest Rated</option>
                <option value="name_asc">Name (A–Z)</option>
              </select>
            </label>

            {/* Reset button */}
            <button
              type="button"
              onClick={() => router.replace(clearAllUrl, { scroll: false })}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm group"
            >
              <IoClose className="w-4 h-4 text-slate-600 group-hover:text-[#ec2227] transition-colors" />
              <span className="text-slate-700 group-hover:text-slate-900">
                Reset All
              </span>
            </button>
          </div>

          {/* Filter sections in two columns on desktop */}
          <div className="grid md:grid-cols-2">
            {/* Left column */}
            <div className="border-r-0 md:border-r border-slate-200">
              {/* Price Range */}
              <FilterSection
                title="Price Range"
                icon={<PriceIcon />}
                defaultOpen
              >
                <select
                  name="price_range"
                  value={props.priceRange || ""}
                  onChange={(e) => setParam("price_range", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium focus:border-[#ec2227] focus:ring-2 focus:ring-[#ec2227]/20 transition-all hover:border-slate-300 shadow-sm"
                >
                  <option value="">All Prices</option>
                  {PRICE_BUCKETS.map((b) => (
                    <option key={b.key} value={b.key}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </FilterSection>

              {/* Trip Type */}
              <FilterSection title="Trip Type" icon={<CalendarIcon />}>
                <select
                  name="trip_type"
                  value={props.tripType || ""}
                  onChange={(e) => setParam("trip_type", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium focus:border-[#ec2227] focus:ring-2 focus:ring-[#ec2227]/20 transition-all hover:border-slate-300 shadow-sm"
                >
                  <option value="">All Trip Types</option>
                  {props.tripNames.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </FilterSection>

              {/* Departure Time */}
              <FilterSection title="Departure Time" icon={<ClockIcon />}>
                <RadioFilter
                  name="departure"
                  options={DEPARTURE_TIMES}
                  selected={sp?.get("departure") || ""}
                  onChange={(value) =>
                    setParam("departure", value || undefined)
                  }
                />
              </FilterSection>

              {/* Duration */}
              <FilterSection title="Duration" icon={<ClockIcon />}>
                <RadioFilter
                  name="duration"
                  options={DURATION_OPTIONS}
                  selected={sp?.get("duration") || ""}
                  onChange={(value) => setParam("duration", value || undefined)}
                />
              </FilterSection>

              {/* Fishing Type */}
              <FilterSection title="Fishing Type" icon={<FishIcon />}>
                <RadioFilter
                  name="fishing_type"
                  options={FISHING_TYPE_OPTIONS}
                  selected={sp?.get("fishing_type") || ""}
                  onChange={(value) =>
                    setParam("fishing_type", value || undefined)
                  }
                />
              </FilterSection>
            </div>

            {/* Right column */}
            <div>
              {/* Target Species */}
              <FilterSection
                title="Target Species"
                icon={<FishIcon />}
                badge={selectedSpecies.length}
              >
                <CheckboxFilter
                  options={props.availableSpecies.map((s) => ({
                    value: s,
                    label: s,
                  }))}
                  selected={selectedSpecies}
                  onChange={(values) => handleMultiSelect("species", values)}
                  emptyMessage="No species data available"
                />
              </FilterSection>

              {/* Fishing Techniques */}
              <FilterSection
                title="Techniques"
                icon={<TechniqueIcon />}
                badge={selectedTechniques.length}
              >
                <CheckboxFilter
                  options={props.availableTechniques.map((t) => ({
                    value: t,
                    label: t,
                  }))}
                  selected={selectedTechniques}
                  onChange={(values) => handleMultiSelect("techniques", values)}
                  emptyMessage="No techniques data available"
                />
              </FilterSection>

              {/* Amenities */}
              <FilterSection
                title="Amenities"
                icon={<BoatIcon />}
                badge={selectedAmenities.length}
              >
                <CheckboxFilter
                  options={props.availableAmenities.map((a) => ({
                    value: a,
                    label: a,
                  }))}
                  selected={selectedAmenities}
                  onChange={(values) => handleMultiSelect("amenities", values)}
                  emptyMessage="No amenities data available"
                />
              </FilterSection>

              {/* Boat Type */}
              <FilterSection title="Boat Type" icon={<BoatIcon />}>
                <CheckboxFilter
                  options={props.availableBoatTypes.map((bt) => ({
                    value: bt,
                    label: bt,
                  }))}
                  selected={
                    sp?.get("boat_type")?.split(",").filter(Boolean) || []
                  }
                  onChange={(values) => handleMultiSelect("boat_type", values)}
                  emptyMessage="No boat types available"
                />
              </FilterSection>

              {/* Review Score */}
              <FilterSection title="Review Score" icon={<StarIcon />}>
                <RangeFilter
                  min={0}
                  max={5}
                  step={0.5}
                  value={[
                    Number(sp?.get("min_rating") || 0),
                    Number(sp?.get("max_rating") || 5),
                  ]}
                  onChange={([min, max]) => {
                    if (min > 0) setParam("min_rating", String(min));
                    else setParam("min_rating", undefined);
                    if (max < 5) setParam("max_rating", String(max));
                    else setParam("max_rating", undefined);
                  }}
                  formatLabel={(val) => `${val} ⭐`}
                />
              </FilterSection>

              {/* Policies */}
              <FilterSection title="Policies & Features" icon={<ShieldIcon />}>
                <div className="space-y-2.5">
                  <label className="flex items-center gap-2.5 py-1 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={props.pickup === "1"}
                      onChange={(e) => toggleBool("pickup", e.target.checked)}
                      className="w-4 h-4 rounded text-[#ec2227] border-slate-300 focus:ring-[#ec2227]"
                    />
                    <span className="text-sm text-slate-700 group-hover:text-slate-900">
                      Pickup Available
                    </span>
                  </label>
                  <label className="flex items-center gap-2.5 py-1 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={props.childFriendly === "1"}
                      onChange={(e) =>
                        toggleBool("child_friendly", e.target.checked)
                      }
                      className="w-4 h-4 rounded text-[#ec2227] border-slate-300 focus:ring-[#ec2227]"
                    />
                    <span className="text-sm text-slate-700 group-hover:text-slate-900">
                      Kid Friendly
                    </span>
                  </label>
                  <label className="flex items-center gap-2.5 py-1 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={sp?.get("license_provided") === "1"}
                      onChange={(e) =>
                        toggleBool("license_provided", e.target.checked)
                      }
                      className="w-4 h-4 rounded text-[#ec2227] border-slate-300 focus:ring-[#ec2227]"
                    />
                    <span className="text-sm text-slate-700 group-hover:text-slate-900">
                      License Provided
                    </span>
                  </label>
                  <label className="flex items-center gap-2.5 py-1 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={sp?.get("catch_and_keep") === "1"}
                      onChange={(e) =>
                        toggleBool("catch_and_keep", e.target.checked)
                      }
                      className="w-4 h-4 rounded text-[#ec2227] border-slate-300 focus:ring-[#ec2227]"
                    />
                    <span className="text-sm text-slate-700 group-hover:text-slate-900">
                      Catch & Keep
                    </span>
                  </label>
                  <label className="flex items-center gap-2.5 py-1 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={sp?.get("catch_and_release") === "1"}
                      onChange={(e) =>
                        toggleBool("catch_and_release", e.target.checked)
                      }
                      className="w-4 h-4 rounded text-[#ec2227] border-slate-300 focus:ring-[#ec2227]"
                    />
                    <span className="text-sm text-slate-700 group-hover:text-slate-900">
                      Catch & Release
                    </span>
                  </label>
                </div>
              </FilterSection>

              {/* Charter Style */}
              <FilterSection title="Charter Style" icon={<BoatIcon />}>
                <RadioFilter
                  name="charter_style"
                  options={CHARTER_STYLE_OPTIONS}
                  selected={sp?.get("charter_style") || ""}
                  onChange={(value) =>
                    setParam("charter_style", value || undefined)
                  }
                />
              </FilterSection>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .slider-thumb-red::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ec2227;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider-thumb-red::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ec2227;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          border: none;
        }
      `}</style>
    </div>
  );
}
