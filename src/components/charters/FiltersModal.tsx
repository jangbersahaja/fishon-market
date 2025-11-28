"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { IoClose } from "react-icons/io5";
import { CheckboxFilter } from "./filters/CheckboxFilter";
import { FilterSection } from "./filters/FilterSection";
import { RadioFilter } from "./filters/RadioFilter";
import { RangeFilter } from "./filters/RangeFilter";

// Icons
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

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** Optional callback to show results on map (opens map overlay after closing modal) */
  onShowOnMap?: () => void;
  priceRange?: string;
  tripType?: string;
  pickup?: string;
  childFriendly?: string;
  destination?: string;
  date?: string;
  adults?: number;
  childrenCount?: number;
  tripNames: string[];
  availableSpecies: Array<{ value: string; label: string }>;
  availableTechniques: string[];
  availableAmenities: string[];
  availableBoatTypes: string[];
  fishingTypes: string[];
  filteredCount: number;
  clearAllUrl: string;
};

export default function FiltersModal(props: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

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

  // Price range options
  const PRICE_RANGE_OPTIONS = [
    { value: "", label: "All Prices" },
    { value: "0-500", label: "RM0 – RM500" },
    { value: "501-1000", label: "RM501 – RM1000" },
    { value: "1001-2000", label: "RM1001 – RM2000" },
    { value: "2001-5000", label: "RM2001 – RM5000" },
    { value: "5001+", label: "RM5001+" },
  ];

  // Departure time options
  const DEPARTURE_TIMES = [
    { value: "", label: "Any Time" },
    { value: "morning", label: "Morning (6am - 12pm)" },
    { value: "afternoon", label: "Afternoon (12pm - 6pm)" },
    { value: "evening", label: "Evening (6pm - 12am)" },
    { value: "night", label: "Night (12am - 6am)" },
  ];

  // Duration options
  const DURATION_OPTIONS = [
    { value: "", label: "Any Duration" },
    { value: "short", label: "Short (< 4 hours)" },
    { value: "half", label: "Half Day (4-6 hours)" },
    { value: "full", label: "Full Day (7-10 hours)" },
    { value: "extended", label: "Extended (> 10 hours)" },
  ];

  // Fishing type options
  const FISHING_TYPE_OPTIONS = [
    { value: "", label: "All Types" },
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
    { value: "", label: "Any Style" },
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

  // Trip type options (with "All" option)
  const TRIP_TYPE_OPTIONS = [
    { value: "", label: "All Trip Types" },
    ...props.tripNames.map((name) => ({ value: name, label: name })),
  ];

  if (!props.isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={props.onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-white to-slate-50">
            <h2 className="text-xl font-bold text-slate-900">Filters</h2>
            <button
              type="button"
              onClick={props.onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <IoClose className="w-6 h-6" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid md:grid-cols-2">
              {/* Left column */}
              <div className="border-r-0 md:border-r border-slate-200">
                {/* Price Range */}
                <FilterSection
                  title="Price Range"
                  icon={<PriceIcon />}
                  defaultOpen
                >
                  <RadioFilter
                    name="price_range"
                    options={PRICE_RANGE_OPTIONS}
                    selected={props.priceRange || ""}
                    onChange={(value) =>
                      setParam("price_range", value || undefined)
                    }
                  />
                </FilterSection>

                {/* Trip Type */}
                <FilterSection
                  title="Trip Type"
                  icon={<CalendarIcon />}
                  defaultOpen
                >
                  <RadioFilter
                    name="trip_type"
                    options={TRIP_TYPE_OPTIONS}
                    selected={props.tripType || ""}
                    onChange={(value) =>
                      setParam("trip_type", value || undefined)
                    }
                  />
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
                    onChange={(value) =>
                      setParam("duration", value || undefined)
                    }
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
                  defaultOpen
                >
                  <CheckboxFilter
                    options={props.availableSpecies}
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
                    onChange={(values) =>
                      handleMultiSelect("techniques", values)
                    }
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
                    onChange={(values) =>
                      handleMultiSelect("amenities", values)
                    }
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
                    onChange={(values) =>
                      handleMultiSelect("boat_type", values)
                    }
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
                <FilterSection
                  title="Policies & Features"
                  icon={<ShieldIcon />}
                >
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

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col gap-3">
            {/* Primary action row */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  router.push(props.clearAllUrl);
                  props.onClose();
                }}
                className="px-6 py-3 bg-white border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={() => {
                  props.onClose();
                  // If opened from map, trigger the map callback after modal closes
                  if (props.onShowOnMap) {
                    setTimeout(() => {
                      props.onShowOnMap?.();
                    }, 100);
                  }
                }}
                className="flex-1 px-6 py-3 bg-[#ec2227] hover:bg-[#d11f24] text-white font-semibold rounded-xl transition-colors"
              >
                {props.filteredCount === 0
                  ? "No Exact Matches"
                  : props.onShowOnMap
                    ? `Show ${props.filteredCount} on Map`
                    : `Show ${props.filteredCount} Result${props.filteredCount === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        </div>
      </div>

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
    </>
  );
}
