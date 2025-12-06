import BookingSummaryCard from "@/app/[locale]/(marketplace)/book/[charterId]/ui/BookingSummaryCard";
import {
  BookingCountdown,
  BookingDetails,
  CancellationInfo,
  ReviewSection,
  TripPreparation,
} from "@/components/booking";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import {
  getBookingHeroContent,
  getPaymentStatusConfig,
  getPaymentStatusContent,
  getWhatHappensNextSteps,
} from "@/lib/helpers/booking-hero-helpers";
import {
  isCancelled,
  isTripCompleted,
  isTripInProgress,
} from "@/lib/helpers/booking-status-helpers";
import { enrichBookingWithTripData } from "@/lib/services/booking-display-service";
import type { BookingStatus } from "@/lib/services/booking-service";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { BookingConfirmActions } from "./BookingConfirmActions";
import { BookingStatusRefresh } from "./BookingStatusRefresh";

// Note: With cacheComponents, dynamic rendering is automatic when using auth()

export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    id?: string | string[];
    payment?: string;
    reason?: string;
    error?: string;
  }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  
  const t = await getTranslations({ locale, namespace: "booking.confirm" });
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
      <main className="w-full px-4 py-6 mx-auto h-150 max-w-7xl sm:px-6">
        <div className="p-3 border border-yellow-200 rounded-lg bg-yellow-50">
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
                {t("paymentStatus.paymentErrorTitle")}
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                {errorType &&
                errorType in
                  {
                    invalid_payment_response: 1,
                    invalid_payment_hash: 1,
                    booking_not_found: 1,
                    payment_gateway_error: 1,
                    payment_processing_error: 1,
                  }
                  ? t(`paymentErrors.${errorType}`)
                  : t("paymentErrors.default")}
              </p>
              <div className="mt-4">
                <Link
                  href={`/${locale}/home`}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {t("returnHome")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!id) {
    return (
      <main className="w-full px-4 py-6 mx-auto h-150 max-w-7xl sm:px-6">
        <h1 className="text-2xl font-bold">{t("bookingNotFoundTitle")}</h1>
        <p className="mt-2 text-gray-600">{t("missingBookingId")}</p>
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
          role: true,
        },
      },
    },
  });

  if (!booking) {
    return (
      <main className="w-full px-4 py-6 mx-auto h-150 max-w-7xl sm:px-6">
        <h1 className="text-2xl font-bold">{t("bookingNotFoundTitle")}</h1>
        <p className="mt-2 text-gray-600">
          {t.rich("bookingNotFoundMessage", {
            id,
            code: (chunks) => <code>{chunks}</code>,
          })}
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

  // Debug conversation data
  console.log("💬 Conversation Debug:", {
    bookingId: booking.id,
    bookingStatus: booking.status,
    conversationId: conversation?.id,
    conversationStatus: conversation?.status,
    hasConversation: !!conversation,
  });

  // Enrich booking with trip and charter data
  const enrichedBooking = await enrichBookingWithTripData(booking);

  // Parse discount from JSON
  const discountData = booking.discount as {
    code: string;
    percentage?: number;
    amount: number;
  } | null;
  const discountAmount = discountData?.amount || 0;
  const promoCodeStr = discountData?.code || null;

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

  // Get hero section content (translated)
  const heroContent = getBookingHeroContent(
    booking.status as BookingStatus,
    booking.paymentFlow,
    tripInProgress,
    tripCompleted,
    t
  );

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
    <main className="bg-slate-50">
      <div className="w-full px-4 py-6 mx-auto max-w-7xl sm:px-6 sm:py-10">
        {/* Payment Status Notifications */}
        {/* PAYMENT_AUTHORIZED Status - Show authorization/payment details */}
        {booking.status === "PAYMENT_AUTHORIZED" &&
          booking.paymentFlow &&
          (() => {
            const config = getPaymentStatusConfig(
              booking.paymentFlow as "TOKENIZED" | "DIRECT"
            );
            const content = getPaymentStatusContent(
              booking.paymentFlow as "TOKENIZED" | "DIRECT",
              Number(booking.finalPrice),
              locale,
              booking.paymentAuthorizedAt
            );

            return (
              <div
                className={`p-3 mb-6 border rounded-lg ${config.colorClasses.container}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg
                      className={`w-5 h-5 ${config.colorClasses.icon}`}
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
                      className={`text-sm font-medium ${config.colorClasses.title}`}
                    >
                      {t(content.titleKey)}
                    </h3>
                    <p
                      className={`mt-1 text-sm ${config.colorClasses.message}`}
                    >
                      {t.rich(content.messageKey, {
                        ...content.messageValues,
                        strong: (chunks) => <strong>{chunks}</strong>,
                      })}
                      {content.showExpiry && (
                        <>
                          <br />
                          <span className="block mt-1 text-xs">
                            {t("paymentStatus.authorizationExpires")}{" "}
                            {content.expiryDate}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
        {/* Success after redirect from payment gateway */}
        {paymentStatus === "success" &&
          booking.status !== "PAYMENT_AUTHORIZED" &&
          booking.paymentFlow &&
          (() => {
            const config = getPaymentStatusConfig(
              booking.paymentFlow as "TOKENIZED" | "DIRECT"
            );
            const content = getPaymentStatusContent(
              booking.paymentFlow as "TOKENIZED" | "DIRECT",
              Number(booking.finalPrice),
              locale,
              null
            );

            return (
              <div
                className={`p-3 mb-6 border rounded-lg ${config.colorClasses.container}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg
                      className={`w-5 h-5 ${config.colorClasses.icon}`}
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
                      className={`text-sm font-medium ${config.colorClasses.title}`}
                    >
                      {t(content.titleKey)}
                    </h3>
                    <p
                      className={`mt-1 text-sm ${config.colorClasses.message}`}
                    >
                      {t.rich(content.messageKey, {
                        ...content.messageValues,
                        strong: (chunks) => <strong>{chunks}</strong>,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

        {paymentStatus === "failed" && (
          <div className="p-3 mb-6 border border-red-200 rounded-lg bg-red-50">
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
                  {t("paymentStatus.paymentFailedTitle")}
                </h3>
                <p className="mt-1 text-sm text-red-700">
                  {paymentReason || t("paymentStatus.paymentFailedMessage")}
                </p>
                {booking.status === "AWAITING_PAYMENT" && (
                  <div className="mt-3">
                    <Link
                      href={`/${locale}/book/payment/${booking.id}`}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      {t("tryPaymentAgain")}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {errorType && (
          <div className="p-3 mb-6 border border-yellow-200 rounded-lg bg-yellow-50">
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
                  {t("paymentStatus.paymentErrorTitle")}
                </h3>
                <p className="mt-1 text-sm text-yellow-700">
                  {errorType &&
                  [
                    "invalid_payment_response",
                    "invalid_payment_hash",
                    "booking_not_found",
                    "payment_gateway_error",
                    "payment_processing_error",
                  ].includes(errorType)
                    ? t(`paymentErrors.${errorType}`)
                    : t("paymentErrors.default")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section with Progress Timeline */}
        <div className="pb-10 space-y-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-2xl font-bold sm:text-3xl">
              {heroContent.title}
            </h1>

            <p className="max-w-2xl text-gray-600">{heroContent.description}</p>

            {/* Countdown Timer for PENDING/PAYMENT_AUTHORIZED/AWAITING_PAYMENT bookings */}
            {(booking.status === "PENDING" ||
              booking.status === "PAYMENT_AUTHORIZED" ||
              booking.status === "AWAITING_PAYMENT") &&
              booking.expiresAt && (
                <div className="mt-4">
                  <BookingCountdown
                    expiresAt={booking.expiresAt}
                    size="lg"
                    showIcon={true}
                  />
                </div>
              )}

            {/* Payment Flow Info for PAYMENT_AUTHORIZED status */}
            {booking.status === "PAYMENT_AUTHORIZED" &&
              booking.paymentFlow &&
              (() => {
                const steps = getWhatHappensNextSteps(
                  booking.paymentFlow as "TOKENIZED" | "DIRECT",
                  Number(booking.finalPrice)
                );

                return (
                  <div className="p-3 mt-4 border border-gray-200 rounded-lg bg-gray-50">
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
                          {t("whatHappensNext.title")}
                        </h4>
                        <ul className="mt-2 space-y-2 text-sm text-gray-600">
                          {steps.map((step, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className={step.icon}>•</span>
                              <span>
                                {step.values
                                  ? t.rich(step.key, {
                                      ...step.values,
                                      strong: (chunks) => (
                                        <strong>{chunks}</strong>
                                      ),
                                    })
                                  : t(step.key)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })()}
          </div>
        </div>

        <div className="flex items-end justify-between mb-2">
          <div className="flex flex-col text-sm text-gray-500 sm:flex-row">
            <span>{t("bookingReference")}</span>
            <code className="px-2 py-0.5 text-xs font-mono bg-gray-100 rounded">
              {booking.id}
            </code>
          </div>

          {/* Smart Refresh - Auto-refreshes on tab focus, manual button for PENDING/PAYMENT_AUTHORIZED/AWAITING_PAYMENT */}
          {(booking.status === "PENDING" ||
            booking.status === "PAYMENT_AUTHORIZED" ||
            booking.status === "AWAITING_PAYMENT") && (
            <BookingStatusRefresh status={booking.status} />
          )}
        </div>

        {/* Main Grid: Content (left) | Summary + Actions (right) */}
        <div className="grid grid-cols-1 gap-3 sm:gap-5 lg:grid-cols-3">
          {/* Left Column - Main Content */}
          <div className="order-2 space-y-3 sm:space-y-5 lg:col-span-2 lg:order-1">
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
                subtotal: enrichedBooking.subtotal,
                totalPrice: enrichedBooking.totalPrice,
                platformFee: enrichedBooking.platformFee,
                serviceFee: enrichedBooking.serviceFee,
                captainEarnings: enrichedBooking.captainEarnings,
                status: enrichedBooking.status as any,
                note: enrichedBooking.note,
                rejectionReason: enrichedBooking.rejectionReason,
                cancellationReason: enrichedBooking.cancellationReason,
                timeSlots: enrichedBooking.timeSlots,
                participants: enrichedBooking.participants,
                emergencyContact: enrichedBooking.emergencyContact,
                discount: discountAmount,
                promoCode: promoCodeStr,
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

            {/* Booking Actions */}
            <BookingConfirmActions
              bookingId={enrichedBooking.id}
              charterId={enrichedBooking.charterId}
              status={enrichedBooking.status as any}
              userId={session?.user?.id}
              userRole={booking.user?.role}
              bookingEmail={booking.user?.email || ""}
              captainName={enrichedBooking.charter?.captain?.displayName}
              captainPhone={enrichedBooking.charter?.captain?.phone}
              captainEmail={enrichedBooking.charter?.captain?.email}
              conversationId={conversation?.id}
              conversationStatus={conversation?.status}
              tripDate={enrichedBooking.date}
              finalPrice={Number(booking.finalPrice)}
              locale={locale}
            />
          </div>

          {/* Right Column - Summary + Actions */}
          <div className="order-1 space-y-6 lg:order-2">
            {/* Charter Summary Card */}
            <BookingSummaryCard charter={charterData} captain={captainData} />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-8 mt-8 border-t border-gray-200">
          <Link
            href={`/${locale}/home`}
            className="text-sm font-medium text-[#ec2227] hover:underline"
          >
            {t("browseMoreCharters")}
          </Link>
          <span className="text-gray-300">•</span>
          <Link
            href={`/${locale}/account/bookings`}
            className="text-sm font-medium text-gray-600 hover:underline"
          >
            {t("viewAllBookings")}
          </Link>
          <span className="text-gray-300">•</span>
          <Link
            href={`/${locale}/support/help`}
            className="text-sm font-medium text-gray-600 hover:underline"
          >
            {t("needHelp")}
          </Link>
        </div>
      </div>
    </main>
  );
}
