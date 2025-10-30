// src/app/search/page.tsx
import CharterCard from "@/components/charters/CharterCard";
import FiltersBar from "@/components/charters/FiltersBar";
import SearchBox from "@/components/charters/SearchBox";
import { getCharters } from "@/lib/services/charter-service";
import { expandDestinationSearchTerms } from "@/utils/destinationAliases";
import type { Charter } from "@fishon/ui";
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
  searchParams: {
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
  };
}) {
  const destination = searchParams.destination || searchParams.q || "";
  const destinationTerms = expandDestinationSearchTerms(destination);
  const date = searchParams.date; // (availability integration later)

  // Parse guests; prefer explicit adults/children, but support legacy `guests`
  const adultsParam = toInt(searchParams.adults, 0);
  const childrenParam = toInt(searchParams.children, 0);
  const guestsParam = toInt(searchParams.guests, 0);

  // If only `guests` is provided, treat them all as adults by default
  const adults = adultsParam || (guestsParam ? guestsParam : 0);
  const children = childrenParam;
  const totalGuests = (adults || 0) + (children || 0);

  // Parse filters
  const orderby = (searchParams.orderby || "recommended").toLowerCase();
  const priceRange = searchParams.price_range;
  const tripType = (searchParams.trip_type || "").trim();
  const pickupParam = searchParams.pickup;
  const childFriendlyParam = searchParams.child_friendly;

  // Fetch charters from backend or dummy data
  const charters = await getCharters();

  let filtered = charters
    .filter((c) => matchesDestination(c, destinationTerms, destination))
    .filter((c) => capacityAllows(c, totalGuests))
    .filter((c) => childFriendlyOk(c, childFriendlyParam))
    .filter((c) => pickupOk(c, pickupParam))
    .filter((c) => priceInBucket(c, priceRange))
    .filter((c) => (tripType ? hasTripType(c, tripType) : true));
  // Helper to build filter chip links

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

  return (
    <main className="bg-white min-h-dvh">
      {/* Responsive SearchBox: non-sticky on mobile, sticky on desktop under fixed navbar */}
      <div className="sticky top-0 z-40 w-full" style={{ willChange: "top" }}>
        <div className="w-full px-3 py-3 mx-auto max-w-7xl">
          <SearchBox />
        </div>
      </div>
      <section className="px-5 py-3 mx-auto mt-5 max-w-7xl sm:px-5">
        <nav className="text-sm text-gray-500">
          <Link href="/home" className="hover:underline">
            Home
          </Link>{" "}
          <span>/</span> <span className="text-gray-700">Search</span>
        </nav>
        {/* Header / Filters Summary */}
        <div className="flex flex-col gap-1 mt-4">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Search results
          </h1>
          <p className="text-sm text-gray-600">
            {destination ? (
              <>
                Showing trips near{" "}
                <span className="font-semibold">{destination}</span>
              </>
            ) : (
              <>All available charters</>
            )}
            {(adults > 0 || children > 0) && (
              <>
                {" "}
                • for
                {adults > 0 && (
                  <>
                    {" "}
                    <span className="font-semibold">{adults}</span> adult
                    {adults > 1 ? "s" : ""}
                  </>
                )}
                {children > 0 && (
                  <>
                    {" "}
                    + <span className="font-semibold">{children}</span> child
                    {children > 1 ? "ren" : ""}
                  </>
                )}
              </>
            )}
            {date && (
              <>
                {" "}
                • on <span className="font-semibold">{date}</span>
              </>
            )}
            {priceRange && (
              <>
                {" "}
                • budget{" "}
                <span className="font-semibold">
                  {PRICE_BUCKETS.find((b) => b.key === priceRange)?.label}
                </span>
              </>
            )}
            {filtered.length > 0 && (
              <>
                {" "}
                • <span className="font-semibold">{filtered.length}</span> match
                {filtered.length === 1 ? "" : "es"}
              </>
            )}
          </p>
        </div>

        {/* Sort & Filters */}
        <FiltersBar
          orderby={orderby}
          priceRange={priceRange}
          tripType={tripType}
          pickup={pickupParam}
          childFriendly={childFriendlyParam}
          destination={destination}
          date={date}
          adults={adults}
          tripNames={tripNames}
        />

        {/* Results */}
        <div className="grid grid-cols-1 gap-6 mt-6 md:grid-cols-2">
          {filtered.length === 0 && (
            <div className="p-6 text-sm text-center text-gray-700 bg-white border col-span-full rounded-xl border-black/10">
              No charters match your search.
              <div className="mt-2 text-xs text-gray-500">
                Try a broader destination or reduce the number of guests.
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
      </section>
    </main>
  );
}
