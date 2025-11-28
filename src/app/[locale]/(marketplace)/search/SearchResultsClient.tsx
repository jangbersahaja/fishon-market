"use client";

import CharterCard from "@/components/charters/CharterCard";
import CompactFiltersBar from "@/components/charters/CompactFiltersBar";
import FiltersModal from "@/components/charters/FiltersModal";
import MapScriptLoader from "@/components/maps/MapScriptLoader";
import ResultsMap from "@/components/search/ResultsMap";
import type { MapItem } from "@/utils/mapItems";
import type { Charter } from "@fishon/ui";
import { Map } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { type ReactNode, useCallback, useMemo, useState } from "react";

interface SearchResultsClientProps {
  locale: string;
  destination: string;
  date?: string;
  adults: number;
  childrenCount: number;
  priceRange?: string;
  priceBucketLabel?: string;
  orderby: string;
  tripType: string;
  pickupParam?: string;
  childFriendlyParam?: string;
  tripNames: string[];
  availableSpecies: { value: string; label: string }[];
  availableTechniques: string[];
  availableAmenities: string[];
  availableBoatTypes: string[];
  fishingTypes: string[];
  filtered: Charter[];
  mapItems: MapItem[];
  fallbackCenter: { lat: number; lng: number };
  ratingsMap: Map<
    string,
    { averageRating: number | null; reviewCount: number }
  >;
  /** Map of charter backendId to availability status (only when date is selected) */
  availabilityMap?: Record<string, boolean>;
  /** Server-rendered campaign slot for desktop sidebar */
  sidebarCampaign?: ReactNode;
  /** Server-rendered campaign slot for mobile bottom bar */
  mobileBottomCampaign?: ReactNode;
}

export default function SearchResultsClient({
  locale,
  destination,
  date,
  adults,
  childrenCount,
  priceRange,
  priceBucketLabel,
  orderby,
  tripType,
  pickupParam,
  childFriendlyParam,
  tripNames,
  availableSpecies,
  availableTechniques,
  availableAmenities,
  availableBoatTypes,
  fishingTypes,
  filtered,
  mapItems,
  fallbackCenter,
  ratingsMap,
  availabilityMap,
  sidebarCampaign,
  mobileBottomCampaign,
}: SearchResultsClientProps) {
  const t = useTranslations("search");
  const tCharter = useTranslations("charter");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);

  // Helper to get rating for a charter
  const getRating = (c: Charter): number | null => {
    const id = (c as any).backendId ?? String(c.id);
    return ratingsMap.get(id)?.averageRating ?? null;
  };

  // Helper to get review count for a charter
  const getReviewCount = (c: Charter): number => {
    const id = (c as any).backendId ?? String(c.id);
    return ratingsMap.get(id)?.reviewCount ?? 0;
  };

  // Calculate active filters count for the map overlay
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (priceRange) count++;
    if (tripType) count++;
    if (pickupParam === "1") count++;
    if (childFriendlyParam === "1") count++;
    if (searchParams?.get("departure")) count++;
    if (searchParams?.get("duration")) count++;
    if (searchParams?.get("fishing_type")) count++;
    if (searchParams?.get("species")) count++;
    if (searchParams?.get("techniques")) count++;
    if (searchParams?.get("amenities")) count++;
    if (searchParams?.get("boat_type")) count++;
    if (searchParams?.get("min_rating") || searchParams?.get("max_rating"))
      count++;
    if (searchParams?.get("license_provided") === "1") count++;
    if (searchParams?.get("catch_and_keep") === "1") count++;
    if (searchParams?.get("catch_and_release") === "1") count++;
    if (searchParams?.get("charter_style")) count++;
    return count;
  }, [priceRange, tripType, pickupParam, childFriendlyParam, searchParams]);

  // Build clearAllUrl for FiltersModal
  const clearAllUrl = useMemo(() => {
    const qs = new URLSearchParams();
    if (destination) qs.set("destination", destination);
    if (date) qs.set("date", date);
    if (adults > 0) qs.set("adults", String(adults));
    if (childrenCount > 0) qs.set("children", String(childrenCount));
    qs.set("orderby", "recommended");
    return `${pathname}?${qs.toString()}`;
  }, [destination, date, adults, childrenCount, pathname]);

  // Unique ID for this map instance
  const mapIdBase = "search-main";
  const openBtnId = `${mapIdBase}-open-map`;

  // Function to open the map overlay (used by FiltersModal's "Show on Map" button)
  const openMapOverlay = useCallback(() => {
    const openBtn = document.getElementById(openBtnId);
    if (openBtn) {
      openBtn.click();
    }
  }, [openBtnId]);

  return (
    <>
      {/* Load Google Maps script */}
      <MapScriptLoader />
      {/* Hero with animated background */}
      <div className="relative overflow-hidden text-white">
        {/* Animated wave background */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Gradient orbs */}
          <div className="absolute top-0 rounded-full left-1/4 w-96 h-96 bg-white/5 blur-3xl animate-pulse" />
          <div className="absolute bottom-0 delay-700 rounded-full right-1/4 w-96 h-96 bg-white/5 blur-3xl animate-pulse" />

          {/* Animated waves */}
          <svg
            className="absolute bottom-0 left-0 w-full h-32 opacity-20"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
          >
            <path
              fill="currentColor"
              fillOpacity="0.3"
              d="M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,133.3C672,117,768,107,864,122.7C960,139,1056,181,1152,181.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            >
              <animate
                attributeName="d"
                dur="10s"
                repeatCount="indefinite"
                values="
                  M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,133.3C672,117,768,107,864,122.7C960,139,1056,181,1152,181.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
                  M0,160L48,144C96,128,192,96,288,90.7C384,85,480,107,576,122.7C672,139,768,149,864,133.3C960,117,1056,75,1152,69.3C1248,64,1344,96,1392,112L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
                  M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,133.3C672,117,768,107,864,122.7C960,139,1056,181,1152,181.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
              />
            </path>
          </svg>

          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `linear-gradient(white 1px, transparent 1px),
                               linear-gradient(90deg, white 1px, transparent 1px)`,
              backgroundSize: "50px 50px",
            }}
          />
        </div>

        <div className="relative p-5 mx-auto max-w-7xl">
          <nav className="mb-4 text-sm text-white/80">
            <Link
              href={`/${locale}/home`}
              className="transition-colors hover:text-white hover:underline"
            >
              {tCharter("breadcrumbHome")}
            </Link>
            <span className="mx-2">/</span>
            <span className="font-medium text-white">
              {t("searchCharters")}
            </span>
          </nav>

          {/* Header / Filters Summary */}
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              {t("pageTitle")}
            </h1>
            <p className="max-w-3xl text-xs text-white/90 sm:text-base">
              {destination ? (
                <>
                  {t("showingTripsNear")}{" "}
                  <span className="font-bold text-white">{destination}</span>
                </>
              ) : (
                <>{t("exploreAllCharters")}</>
              )}
              {(adults > 0 || childrenCount > 0) && (
                <>
                  {" "}
                  • {t("forGuests")}
                  {adults > 0 && (
                    <>
                      {" "}
                      <span className="font-bold text-white">
                        {adults}
                      </span>{" "}
                      {adults > 1 ? t("adults") : t("adult")}
                    </>
                  )}
                  {childrenCount > 0 && (
                    <>
                      {" "}
                      +{" "}
                      <span className="font-bold text-white">
                        {childrenCount}
                      </span>{" "}
                      {childrenCount > 1 ? t("children") : t("child")}
                    </>
                  )}
                </>
              )}
              {date && (
                <>
                  {" "}
                  • {t("onDate")}{" "}
                  <span className="font-bold text-white">{date}</span>
                </>
              )}
              {priceRange && priceBucketLabel && (
                <>
                  {" "}
                  • {t("budget")}{" "}
                  <span className="font-bold text-white">
                    {priceBucketLabel}
                  </span>
                </>
              )}
            </p>
            {filtered.length > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full w-fit bg-white/20 backdrop-blur-sm">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-white">
                  {filtered.length}{" "}
                  {filtered.length === 1
                    ? t("charterFound")
                    : t("chartersFound")}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="p-5 mx-auto max-w-7xl">
        {/* Desktop: 2-column layout with sidebar | Mobile: single column with bottom bar */}
        <div className="flex flex-col gap-10 lg:flex-row ">
          {/* Desktop Sidebar - Hidden on mobile */}
          <aside className="hidden lg:block lg:w-[300px] lg:flex-shrink-0">
            <div className="sticky space-y-10 top-30">
              {/* View on Map Button (Desktop) */}
              <button
                id={openBtnId}
                type="button"
                className="flex items-center justify-center w-full gap-3 px-4 py-4 font-semibold text-white transition-all rounded-xl bg-[#ec2227] hover:bg-[#d11f24] shadow-lg hover:shadow-xl border-2 border-white hover:border-white/30 "
              >
                <Map className="w-5 h-5" />
                <span>View on Map</span>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-white/20">
                  {mapItems.length}
                </span>
              </button>

              {/* Promotional Campaign Sidebar (Desktop Only) */}
              {sidebarCampaign}
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Compact Sort & Filters Bar */}
            <CompactFiltersBar
              orderby={orderby}
              priceRange={priceRange}
              tripType={tripType}
              pickup={pickupParam}
              childFriendly={childFriendlyParam}
              destination={destination}
              date={date}
              adults={adults}
              childrenCount={childrenCount}
              tripNames={tripNames}
              availableSpecies={availableSpecies}
              availableTechniques={availableTechniques}
              availableAmenities={availableAmenities}
              availableBoatTypes={availableBoatTypes}
              fishingTypes={fishingTypes}
              filteredCount={filtered.length}
            />

            {/* Results */}
            <div className="grid grid-cols-1 gap-10 my-10 lg:grid-cols-2">
              {filtered.length === 0 && (
                <div className="p-12 text-center bg-white border shadow-sm col-span-full rounded-2xl border-slate-200">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 rounded-full bg-[#ec2227]/10">
                      <svg
                        className="w-12 h-12 text-[#ec2227]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="mb-2 text-xl font-bold text-slate-900">
                        {t("noChartersFoundTitle")}
                      </h3>
                      <p className="max-w-md mx-auto text-sm text-slate-600">
                        {t("noChartersFoundDescription")}
                      </p>
                    </div>
                    <Link
                      href={`/${locale}/search`}
                      className="mt-4 inline-block px-6 py-3 bg-[#ec2227] hover:bg-[#d11f24] text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      {t("clearAllFilters")}
                    </Link>
                  </div>
                </div>
              )}

              {filtered.map((c) => {
                const charterId = (c as any).backendId ?? String(c.id);
                const isUnavailable =
                  date && availabilityMap
                    ? availabilityMap[charterId] === false
                    : false;

                return (
                  <CharterCard
                    key={charterId}
                    charter={c}
                    context={{
                      date,
                      adults,
                      children: childrenCount,
                      guestsParam: 0,
                    }}
                    averageRating={getRating(c)}
                    reviewCount={getReviewCount(c)}
                    isUnavailable={isUnavailable}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile Bottom Bar Campaign (Mobile Only) */}
        {mobileBottomCampaign && (
          <div className="lg:hidden">{mobileBottomCampaign}</div>
        )}
      </section>

      {/* Map Component (handles both mobile FAB and fullscreen overlay) */}
      <ResultsMap
        idBase={mapIdBase}
        items={mapItems}
        initialCenter={fallbackCenter}
        sectionTitle="Search Results"
        showDesktopInlineMap={false}
        onOpenFilters={() => setIsFiltersModalOpen(true)}
        activeFiltersCount={activeFiltersCount}
      />

      {/* Filters Modal (shared between CompactFiltersBar and Map) */}
      <FiltersModal
        isOpen={isFiltersModalOpen}
        onClose={() => setIsFiltersModalOpen(false)}
        onShowOnMap={openMapOverlay}
        clearAllUrl={clearAllUrl}
        priceRange={priceRange}
        tripType={tripType}
        pickup={pickupParam}
        childFriendly={childFriendlyParam}
        destination={destination}
        date={date}
        adults={adults}
        childrenCount={childrenCount}
        tripNames={tripNames}
        availableSpecies={availableSpecies}
        availableTechniques={availableTechniques}
        availableAmenities={availableAmenities}
        availableBoatTypes={availableBoatTypes}
        fishingTypes={fishingTypes}
        filteredCount={filtered.length}
      />
    </>
  );
}
