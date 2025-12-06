// src/app/search/page.tsx
import SearchBox from "@/components/charters/SearchBox";
import { CampaignContainer } from "@/components/promotional";
import { isCharterAvailableOnDate } from "@/lib/helpers/availability-helpers";
import { batchCheckBookingsForDate } from "@/lib/helpers/availability-helpers.server";
import { getCharters } from "@/lib/services/charter-service";
import { getCharterRatingsBatch } from "@/lib/services/ratings-service";
import { buildMapItems } from "@/utils/mapItems";

import { expandDestinationSearchTerms } from "@/utils/destinationAliases";
import type { Charter } from "@fishon/ui";
import { ALL_SPECIES } from "@fishon/ui";
import { getLocale, setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";
import { Suspense } from "react";
import SearchResultsClient from "./SearchResultsClient";

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

type RouteParams = Promise<{ locale: string }>;
type SearchParams = {
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
};

export default async function SearchResults({
  params,
  searchParams,
}: {
  params: RouteParams;
  searchParams: Promise<SearchParams>;
}) {
  // Get locale from next-intl server context
  const { locale: paramLocale } = await params;
  setRequestLocale(paramLocale);

  const locale = await getLocale();

  // Await searchParams (Next.js 15 requirement)
  const search = await searchParams;

  const destination = search.destination || search.q || "";
  const destinationTerms = expandDestinationSearchTerms(destination);
  const date = search.date; // (availability integration later)

  // Parse guests; prefer explicit adults/children, but support legacy `guests`
  const adultsParam = toInt(search.adults, 0);
  const childrenParam = toInt(search.children, 0);
  const guestsParam = toInt(search.guests, 0);

  // If only `guests` is provided, treat them all as adults by default
  const adults = adultsParam || (guestsParam ? guestsParam : 0);
  const children = childrenParam;
  const totalGuests = (adults || 0) + (children || 0);

  // Parse filters - Basic
  const orderby = (search.orderby || "recommended").toLowerCase();
  const priceRange = search.price_range;
  const tripType = (search.trip_type || "").trim();
  const pickupParam = search.pickup;
  const childFriendlyParam = search.child_friendly;

  // Parse filters - Advanced
  const departureParam = search.departure;
  const durationParam = search.duration;
  const fishingTypeParam = search.fishing_type;
  const speciesParam = search.species?.split(",").filter(Boolean) || [];
  const techniquesParam = search.techniques?.split(",").filter(Boolean) || [];
  const amenitiesParam = search.amenities?.split(",").filter(Boolean) || [];
  const boatTypeParam = search.boat_type;
  const minRatingParam = search.min_rating
    ? parseFloat(search.min_rating)
    : undefined;
  const maxRatingParam = search.max_rating
    ? parseFloat(search.max_rating)
    : undefined;
  const licenseProvidedParam = search.license_provided;
  const catchAndKeepParam = search.catch_and_keep;
  const catchAndReleaseParam = search.catch_and_release;
  const charterStyleParam = search.charter_style;

  // Fetch charters from backend or dummy data
  const charters = await getCharters();

  // Fetch ratings for all charters in batch (server-side)
  const charterIds = charters.map((c) => (c as any).backendId ?? String(c.id));
  const ratingsMap = await getCharterRatingsBatch(charterIds);

  // Helper to get rating for a charter
  const getRating = (c: Charter): number | null => {
    const id = (c as any).backendId ?? String(c.id);
    return ratingsMap.get(id)?.averageRating ?? null;
  };

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
      // Checks both charter-level and trip-level species
      if (speciesParam.length > 0) {
        const charterMatch = speciesParam.some((s: string) =>
          c.species?.includes(s)
        );
        const tripMatch = c.trip?.some((trip) =>
          speciesParam.some((s: string) => trip.species?.includes(s))
        );
        if (!charterMatch && !tripMatch) return false;
      }

      // Techniques filter (charter must have at least one selected technique)
      // Checks both charter-level and trip-level techniques
      if (techniquesParam.length > 0) {
        const charterMatch = techniquesParam.some((t: string) =>
          c.techniques?.includes(t)
        );
        const tripMatch = c.trip?.some((trip) =>
          techniquesParam.some((t: string) => trip.techniques?.includes(t))
        );
        if (!charterMatch && !tripMatch) return false;
      }

      // Amenities filter (charter must have all selected amenities)
      if (amenitiesParam.length > 0) {
        const hasAll = amenitiesParam.every((a: string) =>
          c.includes?.includes(a)
        );
        if (!hasAll) return false;
      }

      // Boat type filter
      if (boatTypeParam && c.boat?.type !== boatTypeParam) return false;

      // Rating filter (now uses server-side ratings data)
      if (minRatingParam !== undefined || maxRatingParam !== undefined) {
        const rating = getRating(c) ?? 0;
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

  // Calculate availability for each charter when date is selected
  // This checks both schedule (operational days) AND existing bookings
  // Use backendId as key since c.id might be 0 for UUID-based backends
  const availabilityMap = new Map<string, boolean>();
  if (date) {
    // Debug: Log schedule data for all charters
    console.log("📅 [SEARCH] Checking availability for date:", date);
    console.log(
      "📅 [SEARCH] Charter schedule data:",
      filtered.map((c) => ({
        backendId: (c as any).backendId ?? String(c.id),
        name: c.name,
        schedule: c.schedule ?? "NO SCHEDULE SET",
        unavailability: c.unavailability?.length ?? 0,
      }))
    );

    // First, check schedule + unavailability + advance booking (client-side logic)
    const scheduleAvailability = new Map<string, boolean>();
    for (const c of filtered) {
      const backendId = (c as any).backendId ?? String(c.id);
      const { isAvailable, reason } = isCharterAvailableOnDate(
        date,
        c.schedule,
        c.unavailability,
        c.fishingType // Pass fishing type for 48h/72h advance booking check
      );
      scheduleAvailability.set(backendId, isAvailable);

      // Debug logging for availability check
      if (!isAvailable) {
        console.log("🚫 [SEARCH] Charter unavailable:", {
          charterId: backendId,
          charterName: c.name,
          date,
          fishingType: c.fishingType,
          schedule: c.schedule,
          reason,
        });
      }
    }

    // Then, batch check bookings for all charters (server-side DB query)
    // Get backend IDs for the booking check
    const charterBackendIds = filtered.map(
      (c) => (c as any).backendId ?? String(c.id)
    );
    const bookingsMap = await batchCheckBookingsForDate(
      charterBackendIds,
      date
    );

    // Combine: charter is available only if schedule allows AND no bookings
    for (const c of filtered) {
      const backendId = (c as any).backendId ?? String(c.id);
      const scheduleOk = scheduleAvailability.get(backendId) ?? true;
      const hasBooking = bookingsMap.get(backendId) ?? false;

      availabilityMap.set(backendId, scheduleOk && !hasBooking);
    }
  }

  // Sorting - with availability priority when date is selected
  filtered = filtered.sort((a, b) => {
    // If date is selected, available charters come first
    if (date) {
      const aBackendId = (a as any).backendId ?? String(a.id);
      const bBackendId = (b as any).backendId ?? String(b.id);
      const aAvailable = availabilityMap.get(aBackendId) ?? true;
      const bAvailable = availabilityMap.get(bBackendId) ?? true;
      if (aAvailable !== bAvailable) {
        return aAvailable ? -1 : 1; // Available first
      }
    }

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const device = isMobileUA ? "MOBILE" : "DESKTOP";
  const currentPage = "search";

  // Build map items for the fullscreen map (with locale, ratings, and availability)
  const mapItems = buildMapItems(filtered, {
    locale,
    ratingsMap,
    availabilityMap: date ? Object.fromEntries(availabilityMap) : undefined,
  });

  // Calculate fallback center from filtered charters
  const chartersWithCoords = filtered.filter(
    (c) => c.coordinates?.lat && c.coordinates?.lng
  );
  const fallbackCenter =
    chartersWithCoords.length > 0
      ? {
          lat:
            chartersWithCoords.reduce((sum, c) => sum + c.coordinates!.lat, 0) /
            chartersWithCoords.length,
          lng:
            chartersWithCoords.reduce((sum, c) => sum + c.coordinates!.lng, 0) /
            chartersWithCoords.length,
        }
      : { lat: 3.139, lng: 101.6869 }; // Default to KL

  // Convert ratingsMap to a plain object for serialization
  const ratingsMapObj = Object.fromEntries(ratingsMap);

  // Get price bucket label
  const priceBucketLabel = PRICE_BUCKETS.find(
    (b) => b.key === priceRange
  )?.label;

  // Render campaign components on the server
  const sidebarCampaign = (
    <CampaignContainer
      placementKey="search-sidebar"
      currentPage={currentPage}
      device="DESKTOP"
      locale={locale}
    />
  );

  const mobileBottomCampaign = (
    <CampaignContainer
      placementKey="search-bottom-bar"
      currentPage={currentPage}
      device="MOBILE"
      locale={locale}
    />
  );

  return (
    <main className="min-h-dvh bg-linear-to-br from-[#ec2227] via-[#d11f24] to-[#b01a1f]">
      {/* Responsive SearchBox: non-sticky on mobile, sticky on desktop under fixed navbar */}
      <div className="sticky top-0 z-40 w-full" style={{ willChange: "top" }}>
        <div className="w-full px-5 py-5 mx-auto max-w-7xl">
          <SearchBox />
        </div>
      </div>

      {/* SearchResultsClient wrapped in Suspense because it uses useSearchParams */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center text-white">
              <div className="inline-block w-8 h-8 border-4 border-white border-solid rounded-full animate-spin border-r-transparent" />
              <p className="mt-4 text-sm">Loading results...</p>
            </div>
          </div>
        }
      >
        <SearchResultsClient
          locale={locale}
          destination={destination}
          date={date}
          adults={adults}
          childrenCount={children}
          priceRange={priceRange}
          priceBucketLabel={priceBucketLabel}
          orderby={orderby}
          tripType={tripType}
          pickupParam={pickupParam}
          childFriendlyParam={childFriendlyParam}
          tripNames={tripNames}
          availableSpecies={availableSpecies}
          availableTechniques={availableTechniques}
          availableAmenities={availableAmenities}
          availableBoatTypes={availableBoatTypes}
          fishingTypes={fishingTypes}
          filtered={filtered}
          mapItems={mapItems}
          fallbackCenter={fallbackCenter}
          ratingsMap={new Map(Object.entries(ratingsMapObj))}
          availabilityMap={Object.fromEntries(availabilityMap)}
          sidebarCampaign={sidebarCampaign}
          mobileBottomCampaign={mobileBottomCampaign}
        />
      </Suspense>
    </main>
  );
}
