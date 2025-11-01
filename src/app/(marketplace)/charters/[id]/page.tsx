import BookingWidget from "@/components/charter/BookingWidget";
import EnhancedReviewsList from "@/components/charter/EnhancedReviewsList";
import { PhotoGallery } from "@/components/charter/PhotoGallery";
import { VideoGallery } from "@/components/charter/VideoGallery";
import StarRating from "@/components/ratings/StarRating";
import { getCharterById } from "@/lib/services/charter-service";
import {
  getCharterRatingStats,
  getCharterReviews,
} from "@/lib/services/review-service";
import type { Charter, Trip } from "@fishon/ui";
import {
  AboutSection,
  AmenitiesCard,
  BoatCard,
  CaptainSection,
  GuestFeedback,
  LocationMap,
  OperationalScheduleCard,
  PoliciesCard,
  summariseBadges,
  TargetSpeciesCard,
  TechniqueCard,
} from "@fishon/ui/charter";
import type { Metadata } from "next";
import Link from "next/link";

export const revalidate = 300; // ISR: refresh detail every 5 minutes

type RouteParams = Promise<{ id: string }>;
type RouteSearchParams = Promise<{
  booking_persons?: string;
  booking_days?: string;
  trip_index?: string;
}>;

function toInt(v: string | undefined, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function getImagesArray(c?: Charter): string[] {
  if (!c)
    return ["/placeholder-1.jpg", "/placeholder-2.jpg", "/placeholder-3.jpg"];
  if (Array.isArray(c.images) && c.images.length > 0) return c.images;
  if (c.imageUrl) return [c.imageUrl];
  return ["/placeholder-1.jpg", "/placeholder-2.jpg", "/placeholder-3.jpg"];
}

export async function generateMetadata(props: {
  params: RouteParams;
}): Promise<Metadata> {
  const params = await props.params;
  const id = params.id;
  const charter = await getCharterById(id);

  const title = charter?.name || `Charter #${id}`;
  const location = charter?.location ? ` — ${charter.location}` : "";
  const desc =
    charter?.description ||
    "Book fishing charters around Malaysia. Find availability, pricing and trip details.";
  const images = getImagesArray(charter);

  return {
    title: `${title}${location} — Fishon.my`,
    description: desc,
    robots: { index: false, follow: true },
    openGraph: {
      title: `${title}${location} — Fishon.my`,
      description: desc,
      images: images.length ? [{ url: images[0] }] : [{ url: "/og-image.jpg" }],
    },
  };
}

export default async function CharterViewPage({
  params,
  searchParams,
}: {
  params: RouteParams;
  searchParams: RouteSearchParams;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;

  const charter = await getCharterById(id);

  // Fetch real reviews and stats (id from route is already a string/cuid)
  const reviews = charter ? await getCharterReviews(id) : [];
  const stats = charter
    ? await getCharterRatingStats(id)
    : {
        averageRating: 0,
        totalReviews: 0,
        ratingBreakdown: {},
        badgeSummary: [],
      };

  const ratingAvg = stats.averageRating;
  const ratingCount = stats.totalReviews;

  const persons = toInt(resolvedSearchParams.booking_persons, 2);

  const trips: Trip[] = Array.isArray(charter?.trip) ? charter!.trip : [];
  const tripIndex = Math.min(
    Math.max(toInt(resolvedSearchParams.trip_index, 0), 0),
    Math.max(trips.length - 1, 0)
  );
  const selectedTrip = trips[tripIndex];
  // Build a basic checkout link using current context (fallbacks applied)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const defaultDateIso = today.toISOString().slice(0, 10);
  const checkoutParams = new URLSearchParams();
  const charterIdParam = id; // cuid or numeric string already in route
  checkoutParams.set("charterId", charterIdParam);
  checkoutParams.set("trip_index", String(tripIndex));
  checkoutParams.set("date", defaultDateIso);
  checkoutParams.set("days", "1");
  checkoutParams.set("adults", String(persons > 0 ? persons : 1));
  // children not tracked in this page yet; default 0
  checkoutParams.set("children", "0");
  // const checkoutHref = `/checkout?${checkoutParams.toString()}`; // old CTA removed; navigation handled by BookingWidget

  const title = charter?.name || `Charter #${id}`;
  const location = charter?.location || "Malaysia";
  const address = charter?.address;
  const desc =
    charter?.description ||
    "A great fishing charter operating in Malaysia. Trips available for lakes, rivers, inshore and offshore.";

  const images: string[] = getImagesArray(charter);

  const boat = charter?.boat;
  const uiBoat = boat
    ? {
        name: boat.name,
        type: boat.type,
        lengthFeet:
          typeof boat.length === "string"
            ? parseFloat(boat.length)
            : (boat as any).lengthFeet,
        capacity: boat.capacity,
        features: boat.features,
      }
    : undefined;
  const tripMaxAnglers =
    selectedTrip?.maxAnglers && selectedTrip.maxAnglers > 0
      ? selectedTrip.maxAnglers
      : undefined;
  const boatCapacity =
    typeof boat?.capacity === "number" && boat!.capacity > 0
      ? boat!.capacity
      : undefined;
  const personsMax = tripMaxAnglers ?? boatCapacity;

  const mapEmbedSrc = charter?.coordinates
    ? `https://www.google.com/maps?q=${charter.coordinates.lat},${charter.coordinates.lng}&z=13&output=embed`
    : `https://www.google.com/maps?q=${encodeURIComponent(
        address || location
      )}&z=13&output=embed`;

  if (!charter) {
    return (
      <main className="bg-white min-h-dvh">
        <section className="max-w-3xl px-4 py-12 mx-auto sm:px-6">
          <h1 className="text-2xl font-bold">Charter not found</h1>
          <p className="mt-2 text-gray-600">
            We couldn&apos;t find the charter with ID <code>{id}</code>. Please
            check the URL or return to the listings.
          </p>
          <div className="mt-4">
            <Link href="/home" className="text-[#ec2227] underline">
              Back to Book
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mb-6 bg-white min-h-dvh">
      <section className="px-4 mx-auto max-w-7xl sm:px-6">
        {/* Breadcrumbs */}
        <nav className="pt-6 text-sm text-gray-500">
          <Link href="/home" className="hover:underline">
            Home
          </Link>{" "}
          <span>/</span> <span className="">Charters</span> <span>/</span>{" "}
          <Link
            href={`/search?destination=${charter.location.split(",")[1]}`}
            className="hover:underline"
          >
            {charter.location.split(",")[1]}
          </Link>{" "}
          <span>/</span>{" "}
          <Link
            href={`/search?destination=${charter.location}`}
            className="hover:underline"
          >
            {charter.location.split(",")[0]}
          </Link>
        </nav>

        {/* Header */}
        <header className="flex flex-col gap-1 mt-4">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            {title}
          </h1>
          {address && <p className="text-sm text-gray-500">{address}</p>}

          <div className="flex items-center gap-2 mt-1 text-sm text-gray-700">
            <StarRating
              value={ratingAvg}
              size={16}
              showValue
              reviewCount={ratingCount}
            />
          </div>
        </header>

        {/* Gallery */}
        <div className="mt-6">
          <PhotoGallery images={images} title={title} />
        </div>

        {/* Main grid */}
        <section className="grid grid-cols-1 gap-6 mt-6 md:grid-cols-5">
          {/* Left column */}
          <div className="md:col-span-3">
            {/* Video Gallery */}
            {charter?.videos && charter.videos.length > 0 && (
              <VideoGallery videos={charter.videos} />
            )}

            <AboutSection description={desc} />

            <div className="grid grid-cols-1 gap-5">
              {/* Amenities */}
              <AmenitiesCard includes={charter?.includes ?? []} />

              {/* Operational Schedule */}
              {charter?.schedule && (
                <OperationalScheduleCard
                  scheduleType={charter.schedule.type}
                  operationalDays={charter.schedule.operationalDays}
                />
              )}

              {/* Species + Techniques */}
              <TargetSpeciesCard species={charter?.species ?? []} />
              <TechniqueCard techniques={charter?.techniques ?? []} />
            </div>

            {/* Map */}
            <LocationMap title={title} mapEmbedSrc={mapEmbedSrc} />
          </div>

          {/* Right column: Booking */}
          <div className="h-full md:col-span-2 md:self-start">
            <div className="h-fit md:sticky md:top-6">
              <BookingWidget
                trips={trips}
                schedule={charter?.schedule}
                unavailability={charter?.unavailability}
                defaultPersons={persons}
                personsMax={personsMax}
                childFriendly={!!charter?.policies?.childFriendly}
                charterId={charterIdParam}
              />
            </div>
          </div>
        </section>

        {/* Captain */}
        <CaptainSection charter={charter} />

        {/* Boat */}
        <BoatCard boat={uiBoat as any} />

        <PoliciesCard
          policies={charter.policies as any}
          pickup={
            {
              available: !!charter.pickup?.available,
              fee: charter.pickup?.fee ?? null,
              areas: charter.pickup?.areas ?? [],
              notes: charter.pickup?.notes,
            } as any
          }
        />

        {/* Feedback summary */}
        <GuestFeedback
          reviews={reviews as any}
          ratingAvg={ratingAvg}
          ratingCount={ratingCount}
          summariseBadges={summariseBadges as any}
        />

        {/* Reviews (Real database reviews) */}
        <EnhancedReviewsList reviews={reviews as any} />
      </section>
    </main>
  );
}
