"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { IoClose } from "react-icons/io5";
import FiltersModal from "./FiltersModal";

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

const FilterIcon = () => (
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
  orderby: string;
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
};

export default function CompactFiltersBar(props: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const setParam = useCallback(
    (key: string, value: string | undefined) => {
      const qs = new URLSearchParams(sp?.toString());
      if (value == null || value === "") qs.delete(key);
      else qs.set(key, value);
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

  // Count active filters (excluding sort, destination, date, guests)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (props.priceRange) count++;
    if (props.tripType) count++;
    if (props.pickup === "1") count++;
    if (props.childFriendly === "1") count++;
    if (sp?.get("departure")) count++;
    if (sp?.get("duration")) count++;
    if (sp?.get("fishing_type")) count++;
    if (sp?.get("species")) count++;
    if (sp?.get("techniques")) count++;
    if (sp?.get("amenities")) count++;
    if (sp?.get("boat_type")) count++;
    if (sp?.get("min_rating") || sp?.get("max_rating")) count++;
    if (sp?.get("license_provided") === "1") count++;
    if (sp?.get("catch_and_keep") === "1") count++;
    if (sp?.get("catch_and_release") === "1") count++;
    if (sp?.get("charter_style")) count++;
    return count;
  }, [props, sp]);

  return (
    <>
      <div className="flex flex-col items-center justify-between gap-3 p-3 bg-white shadow-sm sm:flex-row rounded-xl border-2 border-[#ec2227] sm:gap-4">
        {/* Sort by */}
        <div className="flex items-center w-full gap-2 sm:w-fit">
          <SortIcon />
          <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
            Sort by
          </span>
          <select
            name="orderby"
            value={props.orderby}
            onChange={(e) => setParam("orderby", e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium focus:border-[#ec2227] focus:ring-2 focus:ring-[#ec2227]/20 transition-all hover:border-slate-300 w-full sm:w-auto"
          >
            <option value="recommended">Recommended</option>
            <option value="price_low_high">Price: Low to High</option>
            <option value="price_high_low">Price: High to Low</option>
            <option value="capacity_desc">Capacity</option>
            <option value="rating_desc">Highest Rated</option>
            <option value="name_asc">Name (A–Z)</option>
          </select>
        </div>

        <div className="flex justify-end w-full gap-3 sm:w-fit sm:gap-4">
          {/* Reset button */}
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={() => router.replace(clearAllUrl, { scroll: false })}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg border border-slate-200 bg-white text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all group"
            >
              <IoClose className="w-4 h-4 text-slate-600 group-hover:text-[#ec2227] transition-colors" />
              <span className="text-slate-700 group-hover:text-slate-900">
                Reset All
              </span>
            </button>
          )}

          {/* Filters button */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg border border-slate-200 bg-white text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all relative"
          >
            <FilterIcon />
            <span className="text-slate-700">Filters</span>
            {activeFiltersCount > 0 && (
              <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-[#ec2227] rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters Modal */}
      <FiltersModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        clearAllUrl={clearAllUrl}
        {...props}
      />
    </>
  );
}
