// src/app/search/page.tsx
import CharterCard from "@/components/charters/CharterCard";
import CompactFiltersBar from "@/components/charters/CompactFiltersBar";
import SearchBox from "@/components/charters/SearchBox";
import { CampaignContainer } from "@/components/promotional";
import { getAverageRating } from "@/lib/helpers/ratings";
import { getCharters } from "@/lib/services/charter-service";

import { expandDestinationSearchTerms } from "@/utils/destinationAliases";
import type { Charter } from "@fishon/ui";
import { ALL_SPECIES } from "@fishon/ui";
import { getLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import Link from "next/link";

// Helpers
function minPrice(c: Charter): number | undefined {
  if (!Array.isArray(c.trip) || c.trip.length === 0) return undefined;
  return Math.min(...c.trip.map((t: any) => t.price));
}

function hasTripType(c: Charter, typeNeedle?: string) {
  if (!typeNeedle) return true;
  const n = typeNeedle.trim().toLowerCase();
  return (c.trip || []).some((t: any) =>
    (t.name || "").toLowerCase().includes(n)
  );
}

function pickupOk(c: Charter, want?: string) {
  if (!want) return true;
  const need = want === "1" || want === "true";
  if (!need) return true;
  return !!(c.pickup && (c.pickup.available || c.pickup.included));
}

function childFriendlyOk(c: Charter, want?: string) {
  if (!want) return true;
  const need = want === "1" || want === "true";
  if (!need) return true;
  return !!(c.policies && c.policies.childFriendly);
}

function toInt(v: string | undefined, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

function matchesDestination(c: Charter, terms: string[], rawDest?: string) {
  if (!rawDest || !rawDest.trim()) return true;
  if (terms.length === 0) return true;

  const hay = `${c.location} ${c.name} ${c.address ?? ""}`.toLowerCase();
  return terms.some((term) => term && hay.includes(term));
}

function capacityAllows(c: Charter, guests: number) {
  if (!guests) return true;
  return typeof c.boat.capacity === "number" ? c.boat.capacity >= guests : true;
}

// Price range buckets (RM)
const PRICE_BUCKETS = [
  { key: "0-500", label: "RM0 – RM500", min: 0, max: 500 },
  { key: "501-1000", label: "RM501 – RM1000", min: 501, max: 1000 },
  { key: "1001-2000", label: "RM1001 – RM2000", min: 1001, max: 2000 },
  { key: "2001-5000", label: "RM2001 – RM5000", min: 2001, max: 5000 },
  { key: "5001+", label: "RM5001+", min: 5001, max: Number.POSITIVE_INFINITY },
];

function priceInBucket(c: Charter, key?: string) {
  if (!key) return true;
  const bucket = PRICE_BUCKETS.find((b) => b.key === key);
  if (!bucket) return true;
  const p = minPrice(c);
  if (p == null) return false;
  return p >= bucket.min && p <= bucket.max;
}

// (removed unused parseCSV function)

// Minimal uniqSorted helper for trip type options
function uniqSorted<T>(arr: T[]): T[] {
  return Array.from(new Set(arr.filter(Boolean) as T[]));
}

export default async function SearchResults({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    destination?: string;
    date?: string; // YYYY-MM-DD
    adults?: string;
    children?: string;
    guests?: string; // alternate single number
    orderby?: string;
    price_range?: string; // one of PRICE_BUCKETS keys
    trip_type?: string; // e.g., Half-Day, Full-Day, Night (from trip.name)
    pickup?: string; // 1/true
    child_friendly?: string; // 1/true
    // New advanced filters
    departure?: string;
    duration?: string;
    fishing_type?: string;
    species?: string; // comma-separated IDs
    techniques?: string; // comma-separated
    amenities?: string; // comma-separated
    boat_type?: string;
    min_rating?: string;
    max_rating?: string;
    license_provided?: string;
    catch_and_keep?: string;
    catch_and_release?: string;
    charter_style?: string;
  }>;
}) {
  // Get locale and translations from next-intl server context
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "search" });
  const tCharter = await getTranslations({ locale, namespace: "charter" });

  // Await searchParams (Next.js 15 requirement)
  const params = await searchParams;

  const destination = params.destination || params.q || "";
  const destinationTerms = expandDestinationSearchTerms(destination);
  const date = params.date; // (availability integration later)

  // Parse guests; prefer explicit adults/children, but support legacy `guests`
  const adultsParam = toInt(params.adults, 0);
  const childrenParam = toInt(params.children, 0);
  const guestsParam = toInt(params.guests, 0);

  // If only `guests` is provided, treat them all as adults by default
  const adults = adultsParam || (guestsParam ? guestsParam : 0);
  const children = childrenParam;
  const totalGuests = (adults || 0) + (children || 0);

  // Parse filters - Basic
  const orderby = (params.orderby || "recommended").toLowerCase();
  const priceRange = params.price_range;
  const tripType = (params.trip_type || "").trim();
  const pickupParam = params.pickup;
  const childFriendlyParam = params.child_friendly;

  // Parse filters - Advanced
  const departureParam = params.departure;
  const durationParam = params.duration;
  const fishingTypeParam = params.fishing_type;
  const speciesParam = params.species?.split(",").filter(Boolean) || [];
  const techniquesParam = params.techniques?.split(",").filter(Boolean) || [];
  const amenitiesParam = params.amenities?.split(",").filter(Boolean) || [];
  const boatTypeParam = params.boat_type;
  const minRatingParam = params.min_rating
    ? parseFloat(params.min_rating)
    : undefined;
  const maxRatingParam = params.max_rating
    ? parseFloat(params.max_rating)
    : undefined;
  const licenseProvidedParam = params.license_provided;
  const catchAndKeepParam = params.catch_and_keep;
  const catchAndReleaseParam = params.catch_and_release;
  const charterStyleParam = params.charter_style;

  // Fetch charters from backend or dummy data
  const charters = await getCharters();

  let filtered = charters
    .filter((c) => matchesDestination(c, destinationTerms, destination))
    .filter((c) => capacityAllows(c, totalGuests))
    .filter((c) => childFriendlyOk(c, childFriendlyParam))
    .filter((c) => pickupOk(c, pickupParam))
    .filter((c) => priceInBucket(c, priceRange))
    .filter((c) => (tripType ? hasTripType(c, tripType) : true))
    // Advanced filters
    .filter((c) => {
      // Departure time filter (check if any trip has start time in the selected range)
      if (departureParam && c.trip && c.trip.length > 0) {
        const hasMatchingDeparture = c.trip.some((trip) => {
          if (!trip.startTimes || trip.startTimes.length === 0) return false;
          return trip.startTimes.some((time) => {
            const hour = parseInt(time.split(":")[0]);
            switch (departureParam) {
              case "morning":
                return hour >= 6 && hour < 12;
              case "afternoon":
                return hour >= 12 && hour < 18;
              case "evening":
                return hour >= 18 && hour < 24;
              case "night":
                return hour >= 0 && hour < 6;
              default:
                return true;
            }
          });
        });
        if (!hasMatchingDeparture) return false;
      }

      // Duration filter (check if any trip matches the duration range)
      if (durationParam && c.trip && c.trip.length > 0) {
        const hasMatchingDuration = c.trip.some((trip) => {
          if (!trip.duration) return false;
          // Extract hours from duration string (e.g., "4 hours", "8 hours")
          const match = trip.duration.match(/(\d+)/);
          if (!match) return false;
          const hours = parseInt(match[1]);

          switch (durationParam) {
            case "short":
              return hours < 4;
            case "half":
              return hours >= 4 && hours <= 6;
            case "full":
              return hours >= 7 && hours <= 10;
            case "extended":
              return hours > 10;
            default:
              return true;
          }
        });
        if (!hasMatchingDuration) return false;
      }

      // Fishing type filter
      if (fishingTypeParam && c.fishingType !== fishingTypeParam) return false;

      // Species filter (charter must have at least one selected species)
      if (speciesParam.length > 0) {
        const hasMatch = speciesParam.some((s) => c.species?.includes(s));
        if (!hasMatch) return false;
      }

      // Techniques filter (charter must have at least one selected technique)
      if (techniquesParam.length > 0) {
        const hasMatch = techniquesParam.some((t) => c.techniques?.includes(t));
        if (!hasMatch) return false;
      }

      // Amenities filter (charter must have all selected amenities)
      if (amenitiesParam.length > 0) {
        const hasAll = amenitiesParam.every((a) => c.includes?.includes(a));
        if (!hasAll) return false;
      }

      // Boat type filter
      if (boatTypeParam && c.boat?.type !== boatTypeParam) return false;

      // Rating filter
      if (minRatingParam !== undefined || maxRatingParam !== undefined) {
        const rating = getAverageRating(c.id) ?? 0;
        if (minRatingParam !== undefined && rating < minRatingParam)
          return false;
        if (maxRatingParam !== undefined && rating > maxRatingParam)
          return false;
      }

      // License provided filter
      if (licenseProvidedParam === "1" && !c.licenseProvided) return false;

      // Catch and keep filter
      if (catchAndKeepParam === "1" && !c.policies?.catchAndKeep) return false;

      // Catch and release filter
      if (catchAndReleaseParam === "1" && !c.policies?.catchAndRelease)
        return false;

      // Charter style filter (tier)
      if (charterStyleParam && c.tier !== charterStyleParam) return false;

      return true;
    });

  // Sorting
  filtered = filtered.sort((a, b) => {
    const aMin = minPrice(a) ?? Number.POSITIVE_INFINITY;
    const bMin = minPrice(b) ?? Number.POSITIVE_INFINITY;
    switch (orderby) {
      case "price_low_high":
      case "price_asc":
        return aMin - bMin;
      case "price_high_low":
      case "price_desc":
        return bMin - aMin;
      case "capacity_desc":
        return (b.boat.capacity || 0) - (a.boat.capacity || 0);
      case "name_asc":
        return a.name.localeCompare(b.name);
      case "recommended":
      default: {
        // Simple recommendation: destination match score desc, then price asc
        const nd = (s: string) => (s || "").toLowerCase();
        const score = (c: Charter) => {
          if (destinationTerms.length === 0) return 0;
          const hay = `${nd(c.location)} ${nd(c.name)} ${nd(c.address || "")}`;
          return destinationTerms.some((term) => hay.includes(term)) ? 1 : 0;
        };
        const sA = score(a);
        const sB = score(b);
        if (sB !== sA) return sB - sA;
        return aMin - bMin;
      }
    }
  });

  const tripNames = uniqSorted(
    charters.flatMap((c) => (c.trip || []).map((t) => t.name)).filter(Boolean)
  ).sort((a, b) => a.localeCompare(b));

  // Extract unique species from all charters and map to local names
  const availableSpecies = uniqSorted(charters.flatMap((c) => c.species || []))
    .map((speciesId) => {
      const speciesData = ALL_SPECIES.find(
        (s: { id: string; local_name: string; english_name: string }) =>
          s.id === speciesId
      );
      return {
        value: speciesId,
        label:
          speciesData?.local_name || speciesData?.english_name || speciesId,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  // Extract unique techniques from all charters
  const availableTechniques = uniqSorted(
    charters.flatMap((c) => c.techniques || [])
  ).sort((a, b) => a.localeCompare(b));

  // Extract unique amenities (from includes array)
  const availableAmenities = uniqSorted(
    charters.flatMap((c) => c.includes || [])
  ).sort((a, b) => a.localeCompare(b));

  // Extract unique boat types
  const availableBoatTypes = uniqSorted(
    charters.map((c) => c.boat?.type).filter(Boolean)
  ).sort((a, b) => a.localeCompare(b));

  // Extract unique fishing types
  const fishingTypes = uniqSorted(
    charters.map((c) => c.fishingType).filter(Boolean)
  ).sort((a, b) => a.localeCompare(b));

  // Device detection for campaign targeting (server-side)
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || "";
  const isMobileUA =
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent
    );
  const device = isMobileUA ? "MOBILE" : "DESKTOP";
  const currentPage = "search";

  return (
    <main className="min-h-dvh bg-gradient-to-br from-[#ec2227] via-[#d11f24] to-[#b01a1f]">
      {/* Responsive SearchBox: non-sticky on mobile, sticky on desktop under fixed navbar */}
      <div className="sticky top-0 z-40 w-full" style={{ willChange: "top" }}>
        <div className="w-full px-3 py-3 mx-auto max-w-7xl">
          <SearchBox />
        </div>
      </div>

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
            <p className="max-w-3xl text-sm text-white/90 sm:text-lg">
              {destination ? (
                <>
                  {t("showingTripsNear")}{" "}
                  <span className="font-bold text-white">{destination}</span>
                </>
              ) : (
                <>{t("exploreAllCharters")}</>
              )}
              {(adults > 0 || children > 0) && (
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
                  {children > 0 && (
                    <>
                      {" "}
                      + <span className="font-bold text-white">
                        {children}
                      </span>{" "}
                      {children > 1 ? t("children") : t("child")}
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
              {priceRange && (
                <>
                  {" "}
                  • {t("budget")}{" "}
                  <span className="font-bold text-white">
                    {PRICE_BUCKETS.find((b) => b.key === priceRange)?.label}
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

      <section className="px-5 py-6 mx-auto max-w-7xl sm:px-5 sm:py-8">
        {/* Desktop: 2-column layout with sidebar | Mobile: single column with bottom bar */}
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* Desktop Sidebar - Hidden on mobile */}
          <aside className="hidden lg:block lg:w-[300px] lg:flex-shrink-0">
            <div className="sticky space-y-4 top-20">
              {/* Promotional Campaign Sidebar (Desktop Only) */}
              <CampaignContainer
                placementKey="search-sidebar"
                currentPage={currentPage}
                device="DESKTOP"
                locale={locale}
              />
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
              childrenCount={childrenParam}
              tripNames={tripNames}
              availableSpecies={availableSpecies}
              availableTechniques={availableTechniques}
              availableAmenities={availableAmenities}
              availableBoatTypes={availableBoatTypes}
              fishingTypes={fishingTypes}
              filteredCount={filtered.length}
            />

            {/* Results */}
            <div className="grid grid-cols-1 gap-10 mt-8 md:grid-cols-2 lg:gap-15">
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

              {filtered.map((c) => (
                <CharterCard
                  key={(c as any).backendId ?? `d:${String(c.id)}`}
                  charter={c}
                  context={{ date, adults, children, guestsParam }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Bottom Bar Campaign (Mobile Only) */}
        <div className="lg:hidden">
          <CampaignContainer
            placementKey="search-bottom-bar"
            currentPage={currentPage}
            device="MOBILE"
            locale={locale}
          />
        </div>
      </section>
    </main>
  );
}
