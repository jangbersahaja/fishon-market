import { BookingExpiredScreen } from "@/components/booking/BookingExpiredScreen";
import { DateNoLongerAvailableScreen } from "@/components/booking/DateNoLongerAvailableScreen";
import { ManualFlowPaymentForm } from "@/components/payment/ManualFlowPaymentForm";
import { PaymentCancelledBanner } from "@/components/payment/PaymentCancelledBanner";
import { PaymentContactCard } from "@/components/payment/shared/PaymentContactCard";
import { PaymentTripSummaryCard } from "@/components/payment/shared/PaymentTripSummaryCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import {
  checkDateAvailability,
  getNextAvailableDates,
} from "@/lib/helpers/availability-helpers.server";
import { isForceMockMode } from "@/lib/payment/senangpay";
import { enrichBookingWithTripData } from "@/lib/services/booking-display-service";
import { getCharterById } from "@/lib/services/charter-service";
import {
  AlertCircle,
  Check,
  Clock,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function PaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; bookingId: string }>;
  searchParams: Promise<{ payment?: string; message?: string }>;
}) {
  const { locale, bookingId } = await params;
  setRequestLocale(locale);
  
  const sp = await searchParams;
  const session = await auth();
  const t = await getTranslations({ locale, namespace: "booking.payment" });

  // Check for payment cancellation/failure from return page
  const showRetryBanner = sp.payment === "cancelled" || sp.payment === "failed";
  const retryMessage = sp.message ? decodeURIComponent(sp.message) : undefined;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  if (!booking) {
    redirect(`/${locale}/home`);
  }

  // Check authorization: User must be logged in and own the booking
  const isAuthenticatedOwner =
    session?.user?.id && booking.userId === session.user.id;

  // Note: All bookings now have userId (including GUEST role)
  if (!isAuthenticatedOwner) {
    redirect(
      `/${locale}/login?next=${encodeURIComponent(`/${locale}/book/payment/${bookingId}`)}`
    );
  }

  // CHECK 1: Booking status must be AWAITING_PAYMENT
  if (booking.status === "EXPIRED") {
    const enrichedBooking = await enrichBookingWithTripData(booking);
    const expirationType = booking.captainDecisionAt
      ? "AWAITING_PAYMENT"
      : "PENDING";

    return (
      <BookingExpiredScreen
        booking={{
          id: booking.id,
          status: "EXPIRED",
          date: booking.date,
          startTime: booking.startTime || "08:00",
          expiresAt: booking.expiresAt,
          charter: {
            id: booking.charterId,
            title: enrichedBooking.charterName,
            location: undefined,
          },
        }}
        expirationType={expirationType as "PENDING" | "AWAITING_PAYMENT"}
        locale={locale}
      />
    );
  }

  if (booking.status !== "AWAITING_PAYMENT") {
    redirect(`/${locale}/book/confirm?id=${bookingId}`);
  }

  // CHECK 2: Verify date is still available
  const availabilityCheck = await checkDateAvailability({
    charterId: booking.charterId,
    date: booking.date,
    days: booking.days,
    startTime: booking.startTime,
    excludeBookingId: booking.id,
  });

  if (!availabilityCheck.isAvailable) {
    const enrichedBooking = await enrichBookingWithTripData(booking);
    const alternativeDates = await getNextAvailableDates(
      booking.charterId,
      new Date(),
      5,
      booking.days,
      booking.startTime
    );

    return (
      <DateNoLongerAvailableScreen
        booking={{
          id: booking.id,
          date: booking.date,
          charter: {
            id: booking.charterId,
            title: enrichedBooking.charterName,
            location: undefined,
          },
        }}
        alternativeDates={alternativeDates}
        locale={locale}
      />
    );
  }

  // Fetch charter data separately (charter is in fishon-captain DB)
  const charter = await getCharterById(booking.charterId);
  if (!charter) {
    redirect(`/${locale}/home`);
  }

  // Fetch enriched booking data
  const enrichedBooking = await enrichBookingWithTripData(booking);

  // Calculate payment deadline info
  const paymentDeadline = booking.paymentDeadline || booking.expiresAt;
  const formattedDeadline = paymentDeadline
    ? new Date(paymentDeadline).toLocaleString("en-MY", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  // Get user details
  const contactName = booking.user?.name || session?.user?.name || "Guest";
  const contactEmail = booking.user?.email || session?.user?.email || "";
  const contactPhone = booking.user?.phone || "";

  // Format date display
  const tripDate = new Date(booking.date);
  const primaryDateLabel = tripDate.toLocaleDateString("en-MY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const daysLabel =
    booking.days === 1 ? "1 day trip" : `${booking.days} days trip`;

  // Parse participants from guests JSON
  const guestsData = booking.guests as any;
  const participants = guestsData?.participants || [];
  const participantList =
    participants.length > 0
      ? participants
      : [
          {
            name: contactName,
            phone: contactPhone,
            isBooker: true,
          },
        ];

  // Cancellation policy
  const cancellationPolicy = charter?.policies;
  const cancellationHeadline = "Flexible cancellation before departure";
  const cancellationAfterText =
    "After this window: Refunds follow captain policy and processing fees.";

  const policyHighlights: string[] = [];
  if (cancellationPolicy?.childFriendly) {
    policyHighlights.push("Child-friendly crew and gear options available.");
  }
  if (cancellationPolicy?.catchAndKeep) {
    policyHighlights.push("Catch & keep allowed within local regulations.");
  }
  if (cancellationPolicy?.catchAndRelease) {
    policyHighlights.push("Catch & release encouraged for trophy species.");
  }
  if (!policyHighlights.length) {
    policyHighlights.push(
      "Captain will brief everyone on safety and catch policies at the dock."
    );
  }

  // Enable mock payment in development mode
  const enableMockPayment = isForceMockMode();

  return (
    <main className="bg-slate-50">
      <div className="w-full px-4 py-8 mx-auto max-w-7xl sm:px-6">
        {/* Payment Retry Banner */}
        {showRetryBanner && <PaymentCancelledBanner message={retryMessage} />}

        {/* Payment Deadline Timer */}
        {paymentDeadline && (
          <div className="p-4 mb-6 border rounded-lg bg-amber-50 border-amber-200">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-900">
                  {t("deadlineTimer.title")}: {formattedDeadline}
                </p>
                <p className="text-sm text-amber-700">
                  {t("deadlineTimer.description")}
                </p>
              </div>
            </div>
          </div>
        )}

        <header className="pb-6 space-y-3 border-b border-border">
          <div className="space-y-2">
            <p className="text-sm font-semibold tracking-wide uppercase text-primary">
              {t("header.badge")}
            </p>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("header.title")}
            </h1>
            <p className="text-muted-foreground">{t("header.description")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge
              variant="outline"
              className="text-green-700 border-green-500"
            >
              {t("header.captainApproved")}
            </Badge>
            <Badge
              variant="outline"
              className="border-amber-500 text-amber-700"
            >
              {t("header.paymentRequired")}
            </Badge>
          </div>
        </header>

        <section className="mt-8">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Left Column - Main Content */}
            <div className="space-y-5 lg:col-span-2">
              {/* Trip Summary Card - Shared Component */}
              <PaymentTripSummaryCard
                charterName={enrichedBooking.charterName}
                location={enrichedBooking.location}
                tripName={enrichedBooking.tripName}
                primaryDateLabel={primaryDateLabel}
                daysLabel={daysLabel}
                startTime={booking.startTime || undefined}
                totalGuests={enrichedBooking.adults + enrichedBooking.children}
                guestBreakdown={`${enrichedBooking.adults} Adult${enrichedBooking.adults !== 1 ? "s" : ""}${enrichedBooking.children > 0 ? `, ${enrichedBooking.children} Child${enrichedBooking.children !== 1 ? "ren" : ""}` : ""}`}
                note={booking.note || undefined}
              />

              {/* Pricing Card */}
              <Card>
                <CardHeader>
                  <CardTitle role="heading" aria-level={2}>
                    {t("paymentBreakdown.title")}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {t("paymentBreakdown.description")}
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <dl className="space-y-3 text-sm">
                    {/* Trip Price (combined subtotal + platformFee) */}
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">
                        {enrichedBooking.tripName} × {booking.days}{" "}
                        {t("paymentBreakdown.day", { count: booking.days })}
                      </dt>
                      <dd>
                        RM{" "}
                        {(
                          enrichedBooking.unitPrice +
                          (Number(booking.platformFee) || 0)
                        ).toFixed(2)}
                      </dd>
                    </div>
                    {(() => {
                      const discountData = booking.discount as {
                        code: string;
                        amount: number;
                      } | null;
                      return (
                        discountData &&
                        discountData.amount > 0 && (
                          <div className="flex items-center justify-between">
                            <dt className="text-muted-foreground">
                              <div className="inline-flex items-center gap-2">
                                {t("paymentBreakdown.discount")}
                                <Badge
                                  variant="secondary"
                                  className="text-green-700 border-green-200 bg-green-50"
                                >
                                  {discountData.code}
                                </Badge>
                              </div>
                            </dt>
                            <dd className="font-semibold text-green-700">
                              -RM {discountData.amount.toFixed(2)}
                            </dd>
                          </div>
                        )
                      );
                    })()}
                    {booking.serviceFee && (
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">
                          {t("paymentBreakdown.serviceFee")}
                        </dt>
                        <dd>RM {Number(booking.serviceFee).toFixed(2)}</dd>
                      </div>
                    )}
                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between text-lg font-semibold">
                        <span>{t("paymentBreakdown.total")}</span>
                        <span className="flex items-center gap-1">
                          RM {enrichedBooking.totalPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </dl>

                  <div className="p-3 text-xs border rounded-lg bg-muted/40 text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>{t("paymentBreakdown.approvalNote")}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Form */}
              <Card>
                <CardHeader>
                  <CardTitle role="heading" aria-level={2}>
                    {t("completePayment.title")}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {t("completePayment.description")}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ManualFlowPaymentForm
                    bookingId={booking.id}
                    amount={enrichedBooking.totalPrice}
                    charterId={booking.charterId}
                    enableMockPayment={enableMockPayment}
                  />

                  <div className="p-4 space-y-3 text-xs border rounded-lg bg-muted/30 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      <span>{t("completePayment.securityNote")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserRound className="w-4 h-4 text-primary" />
                      <span>
                        {t("completePayment.bookingFor")}: {contactEmail}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Contact & Info */}
            <div className="space-y-5">
              {/* Contact Information - Shared Component */}
              <PaymentContactCard
                contactName={contactName}
                contactEmail={contactEmail}
                contactPhone={contactPhone || undefined}
              />

              {/* Participants Card */}
              <Card>
                <CardHeader>
                  <CardTitle role="heading" aria-level={2}>
                    {t("participants.title")} ({participantList.length})
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {t("participants.description")}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {participantList.map((p: any, idx: number) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                            <span className="text-xs font-medium">
                              {idx + 1}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{p.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {p.isBooker
                                ? t("participants.booker")
                                : t("participants.guest")}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Emergency Contact Card */}
              {guestsData?.emergencyContact && (
                <Card>
                  <CardHeader>
                    <CardTitle role="heading" aria-level={2}>
                      {t("emergencyContact.title")}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {t("emergencyContact.description")}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <p className="font-medium">
                        {guestsData.emergencyContact.name}
                      </p>
                      <p className="text-muted-foreground">
                        {guestsData.emergencyContact.relationship}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("emergencyContact.phoneNumber")}
                      </p>
                      <p className="font-medium">
                        {guestsData.emergencyContact.phone}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Cancellation Policy Card */}
              {cancellationHeadline && (
                <Card>
                  <CardHeader>
                    <CardTitle role="heading" aria-level={2}>
                      {t("cancellationPolicy.title")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-primary" />
                      <div>
                        <p className="font-semibold">{cancellationHeadline}</p>
                        {cancellationAfterText && (
                          <p className="mt-1 text-muted-foreground">
                            {cancellationAfterText}
                          </p>
                        )}
                      </div>
                    </div>
                    {policyHighlights.length > 0 && (
                      <div className="pt-4 space-y-2 border-t">
                        {policyHighlights.map((highlight, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Check className="w-4 h-4 text-green-600" />
                            <span>{highlight}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Booking Reference */}
              <Card>
                <CardHeader>
                  <CardTitle role="heading" aria-level={2}>
                    Booking Reference
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-3 font-mono text-xs break-all border rounded-lg bg-muted">
                    {booking.id}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Save this reference for your records
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
