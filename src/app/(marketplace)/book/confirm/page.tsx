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
  searchParams: Promise<{
    id?: string | string[];
    payment?: string;
    reason?: string;
    error?: string;
  }>;
}) {
  const sp = await searchParams;
  // Handle case where id might be an array (multiple query params)
  const id = Array.isArray(sp.id) ? sp.id[0] : sp.id;
  const paymentStatus = sp.payment;
  const paymentReason = sp.reason;
  const errorType = sp.error;
  const session = await auth();

  // Handle error-only pages (no booking ID required)
  if (!id && errorType) {
    return (
      <main className="w-full px-4 py-6 mx-auto max-w-7xl sm:px-6">
        <div className="max-w-2xl mx-auto">
          <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="w-5 h-5 text-yellow-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-900">
                  Payment Error
                </h3>
                <p className="mt-1 text-sm text-yellow-700">
                  {errorType === "invalid_payment_response"
                    ? "Invalid payment response received. Please contact support."
                    : errorType === "invalid_payment_hash"
                      ? "Payment verification failed. Please contact support."
                      : errorType === "booking_not_found"
                        ? "Booking not found. Please contact support."
                        : errorType === "payment_gateway_error"
                          ? "Payment gateway error. Please contact support."
                          : errorType === "payment_processing_error"
                            ? "Payment processing error. Please try again."
                            : "An error occurred during payment processing."}
                </p>
                <div className="mt-4">
                  <Link
                    href="/"
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Return Home
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

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

  // Fetch conversation data for chat availability
  const conversation = await prisma.conversation.findUnique({
    where: { bookingId: booking.id },
    select: {
      id: true,
      status: true,
    },
  });

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
      {/* Payment Status Notifications */}
      {/* PAYMENT_PENDING Status - Show authorization/payment details */}
      {booking.status === "PAYMENT_PENDING" && booking.paymentFlow && (
        <div
          className={`p-4 mb-6 border rounded-lg ${
            booking.paymentFlow === "TOKENIZED"
              ? "border-blue-200 bg-blue-50"
              : "border-green-200 bg-green-50"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className={`w-5 h-5 ${
                  booking.paymentFlow === "TOKENIZED"
                    ? "text-blue-600"
                    : "text-green-600"
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3
                className={`text-sm font-medium ${
                  booking.paymentFlow === "TOKENIZED"
                    ? "text-blue-900"
                    : "text-green-900"
                }`}
              >
                {booking.paymentFlow === "TOKENIZED"
                  ? "💳 Card Authorized!"
                  : "✅ Payment Received!"}
              </h3>
              <p
                className={`mt-1 text-sm ${
                  booking.paymentFlow === "TOKENIZED"
                    ? "text-blue-700"
                    : "text-green-700"
                }`}
              >
                {booking.paymentFlow === "TOKENIZED" ? (
                  <>
                    Your card has been authorized for{" "}
                    <strong>RM {Number(booking.finalPrice).toFixed(2)}</strong>.
                    No charge will be made until the captain approves your
                    booking within 12 hours. Your card will only be charged if
                    the captain accepts your request.
                    {booking.paymentAuthorizedAt && (
                      <>
                        <br />
                        <span className="text-xs mt-1 block">
                          Authorization expires:{" "}
                          {new Date(
                            new Date(booking.paymentAuthorizedAt).getTime() +
                              7 * 24 * 60 * 60 * 1000
                          ).toLocaleDateString("en-MY", {
                            dateStyle: "medium",
                          })}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    Your payment of{" "}
                    <strong>RM {Number(booking.finalPrice).toFixed(2)}</strong>{" "}
                    has been received. The captain has 12 hours to approve your
                    booking. If the captain declines or doesn&apos;t respond,
                    you&apos;ll receive a full refund automatically.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Success after redirect from payment gateway */}
      {paymentStatus === "success" &&
        booking.status !== "PAYMENT_PENDING" &&
        booking.paymentFlow && (
          <div
            className={`p-4 mb-6 border rounded-lg ${
              booking.paymentFlow === "TOKENIZED"
                ? "border-blue-200 bg-blue-50"
                : "border-green-200 bg-green-50"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className={`w-5 h-5 ${
                    booking.paymentFlow === "TOKENIZED"
                      ? "text-blue-600"
                      : "text-green-600"
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3
                  className={`text-sm font-medium ${
                    booking.paymentFlow === "TOKENIZED"
                      ? "text-blue-900"
                      : "text-green-900"
                  }`}
                >
                  {booking.paymentFlow === "TOKENIZED"
                    ? "Card Authorized!"
                    : "Payment Received!"}
                </h3>
                <p
                  className={`mt-1 text-sm ${
                    booking.paymentFlow === "TOKENIZED"
                      ? "text-blue-700"
                      : "text-green-700"
                  }`}
                >
                  {booking.paymentFlow === "TOKENIZED" ? (
                    <>
                      Your card has been authorized for{" "}
                      <strong>
                        RM {Number(booking.finalPrice).toFixed(2)}
                      </strong>
                      . No charge will be made until the captain approves your
                      booking within 12 hours. Your card will only be charged if
                      the captain accepts your request.
                    </>
                  ) : (
                    <>
                      Your payment of{" "}
                      <strong>
                        RM {Number(booking.finalPrice).toFixed(2)}
                      </strong>{" "}
                      has been received. The captain has 12 hours to approve
                      your booking. If the captain declines or doesn&apos;t
                      respond, you&apos;ll receive a full refund automatically.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

      {paymentStatus === "failed" && (
        <div className="p-4 mb-6 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-red-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-900">
                Payment Failed
              </h3>
              <p className="mt-1 text-sm text-red-700">
                {paymentReason ||
                  "Your payment could not be processed. Please try again."}
              </p>
              {booking.status === "APPROVED" && (
                <div className="mt-3">
                  <Link
                    href={`/book/payment/${booking.id}`}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    Try Payment Again
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {errorType && (
        <div className="p-4 mb-6 border border-yellow-200 rounded-lg bg-yellow-50">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-yellow-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-900">
                Payment Error
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                {errorType === "invalid_payment_response"
                  ? "Invalid payment response received. Please contact support."
                  : errorType === "invalid_payment_hash"
                    ? "Payment verification failed. Please contact support."
                    : errorType === "booking_not_found"
                      ? "Booking not found. Please contact support."
                      : errorType === "payment_gateway_error"
                        ? "Payment gateway error. Please contact support."
                        : errorType === "payment_processing_error"
                          ? "Payment processing error. Please try again."
                          : "An error occurred during payment processing."}
              </p>
            </div>
          </div>
        </div>
      )}

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
                  : booking.status === "PAYMENT_PENDING"
                    ? booking.paymentFlow === "TOKENIZED"
                      ? "Card Authorized - Awaiting Approval"
                      : "Payment Received - Awaiting Approval"
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
                  : booking.status === "PAYMENT_PENDING"
                    ? booking.paymentFlow === "TOKENIZED"
                      ? "Your card has been authorized. Awaiting captain approval within 12 hours. No charge until approved."
                      : "Your payment has been received. Awaiting captain approval within 12 hours. Full refund if declined."
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

          {/* Countdown Timer for PENDING/PAYMENT_PENDING/APPROVED bookings */}
          {(booking.status === "PENDING" ||
            booking.status === "PAYMENT_PENDING" ||
            booking.status === "APPROVED") &&
            booking.expiresAt && (
              <div className="mt-4">
                <BookingCountdown
                  expiresAt={booking.expiresAt}
                  size="lg"
                  showIcon={true}
                />
              </div>
            )}

          {/* Payment Flow Info for PAYMENT_PENDING status */}
          {booking.status === "PAYMENT_PENDING" && booking.paymentFlow && (
            <div className="p-4 mt-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">
                    What happens next?
                  </h4>
                  <ul className="mt-2 space-y-2 text-sm text-gray-600">
                    {booking.paymentFlow === "TOKENIZED" ? (
                      <>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600">•</span>
                          <span>
                            Your card is{" "}
                            <strong>authorized but not charged</strong> (RM{" "}
                            {Number(booking.finalPrice).toFixed(2)} on hold)
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600">•</span>
                          <span>
                            Captain has <strong>12 hours</strong> to approve or
                            decline your request
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600">•</span>
                          <span>
                            If approved: Your card will be charged and trip is
                            confirmed
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600">•</span>
                          <span>
                            If declined or no response: Authorization is
                            released, <strong>no charge</strong> to your card
                          </span>
                        </li>
                      </>
                    ) : (
                      <>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600">•</span>
                          <span>
                            Your payment of{" "}
                            <strong>
                              RM {Number(booking.finalPrice).toFixed(2)}
                            </strong>{" "}
                            has been received
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600">•</span>
                          <span>
                            Captain has <strong>12 hours</strong> to approve or
                            decline your request
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600">•</span>
                          <span>
                            If approved: Your trip is confirmed, no further
                            action needed
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600">•</span>
                          <span>
                            If declined or no response:{" "}
                            <strong>Full refund</strong> will be processed
                            automatically
                          </span>
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Progress Timeline */}
        <div className="px-10 mb-5 sm:px-15">
          <BookingProgressTimeline
            currentStep={tripCompleted ? "completed" : (booking.status as any)}
            paymentFlow={booking.paymentFlow as "TOKENIZED" | "DIRECT" | null}
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

        {/* Smart Refresh - Auto-refreshes on tab focus, manual button for PENDING/PAYMENT_PENDING/APPROVED */}
        {(booking.status === "PENDING" ||
          booking.status === "PAYMENT_PENDING" ||
          booking.status === "APPROVED") && (
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
              guestName: booking.user?.name || "Guest",
              location: enrichedBooking.location,
              date: enrichedBooking.date,
              durationHour: String(enrichedBooking.durationHour || ""),
              startTime: enrichedBooking.startTime,
              days: enrichedBooking.days,
              adults: enrichedBooking.adults,
              children: enrichedBooking.children,
              unitPrice: enrichedBooking.unitPrice,
              totalPrice: enrichedBooking.totalPrice,
              platformFee: enrichedBooking.platformFee,
              captainEarnings: enrichedBooking.captainEarnings,
              status: enrichedBooking.status as any,
              note: enrichedBooking.note,
              rejectionReason: enrichedBooking.rejectionReason,
              cancellationReason: enrichedBooking.cancellationReason,
              timeSlots: enrichedBooking.timeSlots,
              participants: enrichedBooking.participants,
              emergencyContact: enrichedBooking.emergencyContact,
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
            bookingEmail={booking.user?.email || ""}
            captainName={enrichedBooking.charter?.captain?.displayName}
            captainPhone={enrichedBooking.charter?.captain?.phone}
            captainEmail={enrichedBooking.charter?.captain?.email}
            conversationId={conversation?.id}
            conversationStatus={conversation?.status}
            tripDate={enrichedBooking.date}
            finalPrice={Number(booking.finalPrice)}
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
