import BookingSummaryCard from "@/app/(marketplace)/book/[charterId]/ui/BookingSummaryCard";
import {
  BookingCountdown,
  BookingDetails,
  BookingProgressTimeline,
  CancellationInfo,
  ReviewSection,
  TripPreparation,
} from "@/components/booking";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import {
  isCancelled,
  isTripCompleted,
  isTripInProgress,
} from "@/lib/helpers/booking-status-helpers";
import { enrichBookingWithTripData } from "@/lib/services/booking-display-service";
import Link from "next/link";
import { BookingConfirmActions } from "./BookingConfirmActions";
import { BookingStatusRefresh } from "./BookingStatusRefresh";

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const sp = await searchParams;
  // Handle case where id might be an array (multiple query params)
  const id = Array.isArray(sp.id) ? sp.id[0] : sp.id;
  const session = await auth();

  if (!id) {
    return (
      <main className="w-full px-4 py-6 mx-auto max-w-7xl sm:px-6">
        <h1 className="text-2xl font-bold">Booking not found</h1>
        <p className="mt-2 text-gray-600">Missing booking id.</p>
      </main>
    );
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
  });

  if (!booking) {
    return (
      <main className="w-full px-4 py-6 mx-auto max-w-7xl sm:px-6">
        <h1 className="text-2xl font-bold">Booking not found</h1>
        <p className="mt-2 text-gray-600">
          We couldn&apos;t find booking <code>{id}</code>.
        </p>
      </main>
    );
  }

  // Enrich booking with trip and charter data
  const enrichedBooking = await enrichBookingWithTripData(booking);

  const charterData = enrichedBooking.charter
    ? {
        id: enrichedBooking.charter.id,
        name: enrichedBooking.charter.name,
        // Use startingPoint from charter table for the starting point address
        address: enrichedBooking.charter.startingPoint,
        location: enrichedBooking.location,
        // Transform images from { url: string }[] to string[]
        images: enrichedBooking.charter.images?.map((img) => img.url) || [],
        boat: enrichedBooking.charter.boat
          ? {
              name: enrichedBooking.charter.boat.name,
              type: enrichedBooking.charter.boat.type,
              capacity: enrichedBooking.charter.boat.capacity,
              features: enrichedBooking.charter.features || [],
            }
          : undefined,
        // Transform includes from { name: string; isIncluded: boolean }[] to string[]
        includes:
          enrichedBooking.charter.includes
            ?.filter((item) => item.isIncluded)
            .map((item) => item.name) || [],
        // Transform coordinates from { latitude, longitude } to { lat, lng }
        coordinates: enrichedBooking.charter.coordinates
          ? {
              lat: enrichedBooking.charter.coordinates.latitude,
              lng: enrichedBooking.charter.coordinates.longitude,
            }
          : undefined,
      }
    : undefined;

  const captainData = enrichedBooking.charter?.captain
    ? {
        // Rename displayName to name for component compatibility
        name: enrichedBooking.charter.captain.displayName,
        avatarUrl: enrichedBooking.charter.captain.avatarUrl || undefined,
      }
    : null;

  // Determine booking state (using enriched booking with display fields)
  const tripInProgress = isTripInProgress(enrichedBooking);
  const tripCompleted = isTripCompleted(enrichedBooking);
  const tripCancelled = isCancelled(enrichedBooking);
  // Show trip preparation for paid bookings that haven't completed yet
  const shouldShowTripPreparation =
    booking.status === "PAID" && !tripCompleted && !tripCancelled;

  // Debug: Log TripPreparation data
  console.log("📋 TripPreparation Debug:", {
    bookingStatus: booking.status,
    tripInProgress,
    tripCompleted,
    tripCancelled,
    shouldShowTripPreparation,
    bookingDate: enrichedBooking.date,
    bookingStartTime: enrichedBooking.startTime,
    bookingDays: enrichedBooking.days,
    captainPhone: enrichedBooking.charter?.captain?.phone,
    startingPoint: enrichedBooking.charter?.startingPoint,
    latitude: enrichedBooking.charter?.coordinates?.latitude,
    longitude: enrichedBooking.charter?.coordinates?.longitude,
    hasCharter: !!enrichedBooking.charter,
    hasCaptain: !!enrichedBooking.charter?.captain,
  });

  return (
    <main className="w-full px-4 py-6 mx-auto max-w-7xl sm:px-6 sm:py-10">
      {/* Hero Section with Progress Timeline */}
      <div className="pb-10 space-y-6">
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-bold sm:text-3xl">
            {booking.status === "COMPLETED"
              ? "Trip Completed!"
              : booking.status === "PAID" && tripInProgress
                ? "Trip In Progress!"
                : booking.status === "PAID"
                  ? "Booking Confirmed!"
                  : booking.status === "APPROVED"
                    ? "Approved! Complete Payment"
                    : booking.status === "PENDING"
                      ? "Waiting For Captain Approval"
                      : booking.status === "REJECTED"
                        ? "Request Declined"
                        : booking.status === "EXPIRED"
                          ? "Booking Expired"
                          : booking.status === "CANCELLED"
                            ? "Booking Cancelled"
                            : "Booking Status"}
          </h1>

          <p className="max-w-2xl text-gray-600">
            {booking.status === "COMPLETED"
              ? "Your fishing trip has been completed. We hope you had an amazing experience! Please share your feedback."
              : booking.status === "PAID" && tripInProgress
                ? "Your fishing trip is currently in progress. Have a great time and stay safe!"
                : booking.status === "PAID"
                  ? "Your fishing trip is confirmed. Get ready for an amazing experience!"
                  : booking.status === "APPROVED"
                    ? "The captain has approved your request. Complete payment to confirm your booking."
                    : booking.status === "PENDING"
                      ? "Your booking request has been sent to the captain for review."
                      : booking.status === "REJECTED"
                        ? "The captain was unable to accommodate your request."
                        : booking.status === "EXPIRED"
                          ? "This booking hold has expired."
                          : booking.status === "CANCELLED"
                            ? "This booking has been cancelled."
                            : "View your booking details below."}
          </p>

          {/* Countdown Timer for PENDING/APPROVED bookings */}
          {(booking.status === "PENDING" || booking.status === "APPROVED") &&
            booking.expiresAt && (
              <div className="mt-4">
                <BookingCountdown
                  expiresAt={booking.expiresAt}
                  size="lg"
                  showIcon={true}
                />
              </div>
            )}
        </div>
        {/* Progress Timeline */}
        <div className="px-10 mb-5 sm:px-15">
          <BookingProgressTimeline
            currentStep={tripCompleted ? "completed" : (booking.status as any)}
          />
        </div>
      </div>

      <div className="flex items-end justify-between mb-2">
        <div className="flex flex-col text-sm text-gray-500 sm:flex-row">
          <span>Booking reference:</span>
          <code className="px-2 py-0.5 text-xs font-mono bg-gray-100 rounded">
            {booking.id}
          </code>
        </div>

        {/* Smart Refresh - Auto-refreshes on tab focus, manual button for PENDING/APPROVED */}
        {(booking.status === "PENDING" || booking.status === "APPROVED") && (
          <BookingStatusRefresh status={booking.status} />
        )}
      </div>

      {/* Main Grid: Content (left) | Summary + Actions (right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left Column - Main Content */}
        <div className="order-2 space-y-6 lg:col-span-3 lg:order-1">
          {/* Booking Details */}
          <BookingDetails
            booking={{
              id: enrichedBooking.id,
              charterName: enrichedBooking.charterName,
              tripName: enrichedBooking.tripName,
              guestName:
                booking.user?.name ||
                `${booking.guestFirstName} ${booking.guestLastName}` ||
                "Guest",
              location: enrichedBooking.location,
              date: enrichedBooking.date,
              durationHour: String(enrichedBooking.durationHour || ""),
              startTime: enrichedBooking.startTime,
              days: enrichedBooking.days,
              adults: enrichedBooking.adults,
              children: enrichedBooking.children,
              unitPrice: enrichedBooking.unitPrice,
              totalPrice: enrichedBooking.totalPrice,
              status: enrichedBooking.status as any,
              note: enrichedBooking.note,
              rejectionReason: enrichedBooking.rejectionReason,
              cancellationReason: enrichedBooking.cancellationReason,
            }}
          />

          {/* Cancellation Info (if cancelled) */}
          {tripCancelled && enrichedBooking.cancellationReason && (
            <CancellationInfo
              cancellationReason={enrichedBooking.cancellationReason}
              cancellationSource="customer"
            />
          )}

          {/* Trip Preparation (for upcoming paid bookings) */}
          {shouldShowTripPreparation && (
            <TripPreparation
              captainPhone={enrichedBooking.charter?.captain?.phone}
              startingPoint={enrichedBooking.charter?.startingPoint}
              location={enrichedBooking.location}
              latitude={enrichedBooking.charter?.coordinates?.latitude}
              longitude={enrichedBooking.charter?.coordinates?.longitude}
              bookingId={booking.id}
            />
          )}

          {/* Review Section (for completed trips) */}
          {tripCompleted && (
            <ReviewSection
              bookingId={booking.id}
              userId={session?.user?.id}
              charterName={enrichedBooking.charterName}
              tripDate={enrichedBooking.date}
              location={enrichedBooking.location}
            />
          )}

          {/* TODO: Implement chat feature */}

          {/* Booking Actions */}
          <BookingConfirmActions
            bookingId={enrichedBooking.id}
            charterId={enrichedBooking.charterId}
            status={enrichedBooking.status as any}
            userId={session?.user?.id}
            bookingEmail={
              booking.user?.email || enrichedBooking.guestEmail || ""
            }
          />
        </div>

        {/* Right Column - Summary + Actions */}
        <div className="order-1 space-y-6 lg:col-span-2 lg:order-2">
          {/* Charter Summary Card */}
          <BookingSummaryCard charter={charterData} captain={captainData} />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-8 mt-8 border-t border-gray-200">
        <Link
          href="/home"
          className="text-sm font-medium text-[#ec2227] hover:underline"
        >
          Browse More Charters
        </Link>
        <span className="text-gray-300">•</span>
        <Link
          href="/account/bookings"
          className="text-sm font-medium text-gray-600 hover:underline"
        >
          View All Bookings
        </Link>
        <span className="text-gray-300">•</span>
        <Link
          href="/help"
          className="text-sm font-medium text-gray-600 hover:underline"
        >
          Need Help?
        </Link>
      </div>
    </main>
  );
}
