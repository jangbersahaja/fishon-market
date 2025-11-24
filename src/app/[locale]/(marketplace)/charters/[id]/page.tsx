import { FavoriteButton } from "@/components/account";
import {
  AboutSection,
  AmenitiesCard,
  BoatCard,
  BookingWidget,
  CaptainSection,
  CharterViewTracker,
  EnhancedReviewsList,
  GuestFeedback,
  LocationMap,
  OperationalScheduleCard,
  PhotoGallery,
  PoliciesCard,
  ShareButton,
  TripCard,
  VideoGallery,
} from "@/components/charter";
import SearchBox from "@/components/charters/SearchBox";
import StarRating from "@/components/ratings/StarRating";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import { calculateBlockedDates } from "@/lib/helpers/availability-helpers";
import { getCharterById } from "@/lib/services/charter-service";
import { isFavorited } from "@/lib/services/favorite-service";
import {
  getCharterRatingStats,
  getCharterReviews,
} from "@/lib/services/review-service";
import type { Charter, Trip } from "@fishon/ui";
import { MapPin } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export const revalidate = 300; // ISR: refresh detail every 5 minutes

type RouteParams = Promise<{ id: string; locale: string }>;
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
  const { id, locale } = await params;
  const resolvedSearchParams = await searchParams;
  const session = await auth();

  const charter = await getCharterById(id);

  // Check if charter is favorited by current user
  const isCharterFavorited = session?.user?.id
    ? await isFavorited(session.user.id, id)
    : false;

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
  // Format in local time (Malaysia GMT+8), not UTC
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const defaultDateIso = `${year}-${month}-${day}`;
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

  const t = await getTranslations({ locale, namespace: "charter" });

  const title = charter?.name || `Charter #${id}`;
  const location = charter?.location || "Malaysia";
  const address = charter?.address;
  const desc = charter?.description || t("defaultDescription");

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

  // Calculate blocked dates for the booking widget
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 3);

  // Fetch booked dates using time-based booking format
  const bookings = await prisma.booking.findMany({
    where: {
      charterId: id,
      date: {
        lte: endDate,
      },
      OR: [
        { status: "PAID" },
        {
          status: "PAYMENT_AUTHORIZED",
          acknowledgmentDeadline: { gte: new Date() },
        },
      ],
    },
    select: {
      date: true,
      days: true,
      startTime: true,
      timeSlots: true,
    },
    orderBy: {
      date: "asc",
    },
  });

  // Process bookings into full-day blocks and time-based blocks
  const fullDayBlocks = new Set<string>();
  const timeBasedBlocks: Array<{
    date: string;
    startTime: string;
    endTime: string;
    isFullDay: boolean;
  }> = [];

  bookings.forEach((booking) => {
    const hasTimeBased =
      booking.startTime &&
      booking.timeSlots &&
      Array.isArray(booking.timeSlots);

    if (hasTimeBased) {
      // Time-based booking: add each time slot
      const timeSlots = booking.timeSlots as Array<{
        date: string;
        startDateTime: string;
        endDateTime: string;
      }>;

      timeSlots.forEach((slot) => {
        const slotDate = new Date(slot.date);
        if (slotDate >= startDate && slotDate <= endDate) {
          const startTime = new Date(slot.startDateTime)
            .toTimeString()
            .substring(0, 5);
          const endTime = new Date(slot.endDateTime)
            .toTimeString()
            .substring(0, 5);

          timeBasedBlocks.push({
            date: slot.date.split("T")[0],
            startTime,
            endTime,
            isFullDay: false,
          });
        }
      });
    } else {
      // Full-day booking: block all days
      const bookingDate = new Date(booking.date);
      const startYear = bookingDate.getFullYear();
      const startMonth = bookingDate.getMonth();
      const startDay = bookingDate.getDate();

      for (let i = 0; i < booking.days; i++) {
        const blockedDate = new Date(startYear, startMonth, startDay + i);
        if (blockedDate >= startDate && blockedDate <= endDate) {
          const y = blockedDate.getFullYear();
          const m = String(blockedDate.getMonth() + 1).padStart(2, "0");
          const d = String(blockedDate.getDate()).padStart(2, "0");
          fullDayBlocks.add(`${y}-${m}-${d}`);
        }
      }
    }
  });

  const bookedDatesData = {
    fullDayBlocks: Array.from(fullDayBlocks).sort(),
    timeBasedBlocks,
  };

  const blockedDatesResult = calculateBlockedDates(
    charter?.schedule,
    charter?.unavailability,
    bookedDatesData,
    startDate,
    endDate
  );

  const blockedDates =
    blockedDatesResult instanceof Set
      ? new Set(
          Array.from(blockedDatesResult).filter(
            (v): v is string => typeof v === "string"
          )
        )
      : new Set(
          (blockedDatesResult as any[]).filter(
            (v): v is string => typeof v === "string"
          )
        );

  if (!charter) {
    return (
      <main className="bg-white min-h-dvh">
        <section className="max-w-3xl px-4 py-12 mx-auto sm:px-6">
          <h1 className="text-2xl font-bold">{t("notFoundTitle")}</h1>
          <p className="mt-2 text-gray-600">
            {t("notFoundDescription", { id })}
          </p>
          <div className="mt-4">
            <Link href={`/${locale}/home`} className="text-[#ec2227] underline">
              {t("backToBook")}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="bg-white min-h-dvh">
      {/* Track charter view */}
      <CharterViewTracker
        charterId={id}
        ownerId={charter.ownerId}
        userId={session?.user?.id}
      />

      <section className="bg-gradient-to-br from-[#ec2227] via-[#d11f24] to-[#b01a1f]">
        <div className="w-full px-3 py-3 mx-auto max-w-7xl">
          <SearchBox />
        </div>
        <div className="px-4 pt-5 mx-auto max-w-7xl sm:px-6">
          {/* Breadcrumbs */}
          <nav className="text-sm text-gray-100">
            <Link href={`/${locale}/home`} className="hover:underline">
              {t("breadcrumbHome")}
            </Link>{" "}
            <span>/</span> <span className="">{t("breadcrumbCharters")}</span>{" "}
            <span>/</span>{" "}
            <Link
              href={`/${locale}/search?destination=${charter.location.split(",")[1]}`}
              className="capitalize hover:underline"
            >
              {charter.location.split(",")[1]}
            </Link>{" "}
            <span>/</span>{" "}
            <Link
              href={`/${locale}/search?destination=${charter.location}`}
              className="capitalize hover:underline"
            >
              {charter.location.split(",")[0]}
            </Link>
          </nav>
          {/* Header */}
          <header className="flex flex-col gap-3 mt-10">
            <div className="flex items-start justify-between gap-4">
              <h1 className="flex-1 text-3xl font-semibold tracking-tight text-white uppercase sm:text-5xl font-oswald">
                {title}
              </h1>
              <div className="flex items-center gap-2 shrink-0">
                <ShareButton
                  charterId={id}
                  ownerId={charter.ownerId}
                  userId={session?.user?.id}
                  title={charter.name}
                  description={charter.description}
                  className="w-8 h-8 md:w-12 md:h-12"
                />
                <FavoriteButton
                  captainCharterId={id}
                  charterName={charter.name}
                  location={charter.location}
                  initialIsFavorited={isCharterFavorited}
                  charterData={charter}
                  className="w-8 h-8 text-white md:w-12 md:h-12 shrink-0 bg-white/10 hover:bg-white/20"
                  showLabel={false}
                />
              </div>
            </div>
            <div className="flex flex-col items-center justify-between gap-3 mt-2 md:flex-row">
              {address && (
                <div className="flex items-center gap-1 text-gray-100">
                  <MapPin className="inline-block w-4 h-4 mr-1" />
                  <span className="text-sm">{address}</span>
                </div>
              )}

              <div className="flex justify-end w-full gap-2 text-sm text-gray-700 md:w-fit">
                <StarRating
                  value={ratingAvg}
                  size={20}
                  textSize="text-md"
                  showValue
                  reviewCount={ratingCount}
                  variant="chrome"
                />
              </div>
            </div>
          </header>
          {/* Gallery */}
          <div className="p-3 pb-0 mt-3 -mx-3 bg-white rounded-t-2xl">
            <PhotoGallery
              images={images}
              title={title}
              charterId={id}
              ownerId={charter.ownerId}
              userId={session?.user?.id}
            />
          </div>
        </div>
      </section>
      <section className="px-4 pb-10 mx-auto max-w-7xl sm:px-6">
        {/* Main grid */}
        <div className="grid grid-cols-1 gap-5 mt-5 md:grid-cols-3">
          {/* Left column */}
          <div className="md:col-span-2">
            <AboutSection description={desc} />

            {/* Video Gallery */}
            {charter?.videos && charter.videos.length > 0 && (
              <VideoGallery
                videos={charter.videos}
                charterId={id}
                ownerId={charter.ownerId}
                userId={session?.user?.id}
              />
            )}

            {/* Operational Schedule */}
            {charter?.schedule && (
              <OperationalScheduleCard
                scheduleType={charter.schedule.type}
                operationalDays={charter.schedule.operationalDays}
              />
            )}

            <div className="grid grid-cols-1 gap-5">
              {/* Amenities */}
              <AmenitiesCard
                includes={charter?.includes ?? []}
                locale={locale}
              />

              {/* Trip Cards - Under the map in left column */}
              <div className="mt-6">
                <h2 className="mb-4 text-xl font-bold">
                  {t("availableTrips")}
                </h2>
                <div className="flex flex-col gap-3">
                  {trips.map((trip, idx) => {
                    // Since species and techniques are at charter level (not per-trip),
                    // only show them on the first trip card to avoid repetition
                    const showSpecies = idx === 0;
                    const showTechniques = idx === 0;

                    return (
                      <TripCard
                        key={trip.id || trip.name}
                        id={`trip-${idx}`}
                        name={trip.name}
                        price={trip.price}
                        duration={trip.duration}
                        description={trip.description}
                        species={charter?.species ?? []}
                        techniques={charter?.techniques ?? []}
                        maxAnglers={trip.maxAnglers}
                        startTimes={trip.startTimes}
                        showSpecies={showSpecies}
                        showTechniques={showTechniques}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Map */}
            <LocationMap title={title} mapEmbedSrc={mapEmbedSrc} />
          </div>

          {/* Right column: Booking Widget (Sticky) */}
          <div className="h-full md:self-start">
            <div className="h-fit md:sticky md:top-6">
              <BookingWidget
                trips={trips}
                charterId={charterIdParam}
                ownerId={charter.ownerId}
                userId={session?.user?.id}
                charterType={charter?.fishingType}
                personsMax={personsMax}
                childFriendly={!!charter?.policies?.childFriendly}
                blockedDates={blockedDates}
                defaultPersons={persons}
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 mt-5 md:grid-cols-5">
          <div className="col-span-3">
            {/* Captain */}
            <CaptainSection charter={charter} />
          </div>
          <div className="col-span-2">
            {/* Boat */}
            <BoatCard boat={uiBoat as any} locale={locale} />
          </div>
        </div>
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
          locale={locale}
        />
        {/* Reviews (Real database reviews) */}
        <EnhancedReviewsList reviews={reviews as any} />
      </section>
    </main>
  );
}
