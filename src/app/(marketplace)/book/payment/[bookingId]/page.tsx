import { BookingExpiredScreen } from "@/components/booking/BookingExpiredScreen";
import { DateNoLongerAvailableScreen } from "@/components/booking/DateNoLongerAvailableScreen";
import { ManualFlowPaymentForm } from "@/components/payment/ManualFlowPaymentForm";
import { PaymentContactCard } from "@/components/payment/shared/PaymentContactCard";
import { PaymentTripSummaryCard } from "@/components/payment/shared/PaymentTripSummaryCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import {
  checkDateAvailability,
  getNextAvailableDates,
} from "@/lib/helpers/availability-helpers";
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
import { redirect } from "next/navigation";

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const session = await auth();

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
    redirect("/");
  }

  // Check authorization: User must be logged in and own the booking
  const isAuthenticatedOwner =
    session?.user?.id && booking.userId === session.user.id;

  // Note: All bookings now have userId (including GUEST role)
  if (!isAuthenticatedOwner) {
    redirect(`/login?next=${encodeURIComponent(`/book/payment/${bookingId}`)}`);
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
      />
    );
  }

  if (booking.status !== "AWAITING_PAYMENT") {
    redirect(`/book/confirm?id=${bookingId}`);
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
      />
    );
  }

  // Fetch charter data separately (charter is in fishon-captain DB)
  const charter = await getCharterById(booking.charterId);
  if (!charter) {
    redirect("/");
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
        {/* Payment Deadline Timer */}
        {paymentDeadline && (
          <div className="p-4 mb-6 border rounded-lg bg-amber-50 border-amber-200">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-900">
                  Payment Due: {formattedDeadline}
                </p>
                <p className="text-sm text-amber-700">
                  Complete payment before this deadline to confirm your booking
                </p>
              </div>
            </div>
          </div>
        )}

        <header className="pb-6 space-y-3 border-b border-border">
          <div className="space-y-2">
            <p className="text-sm font-semibold tracking-wide uppercase text-primary">
              Manual Booking Payment
            </p>
            <h1 className="text-3xl font-bold tracking-tight">
              Complete Your Payment
            </h1>
            <p className="text-muted-foreground">
              Your booking has been approved by the captain. Complete payment to
              confirm your trip.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge
              variant="outline"
              className="text-green-700 border-green-500"
            >
              Captain Approved
            </Badge>
            <Badge
              variant="outline"
              className="border-amber-500 text-amber-700"
            >
              Payment Required
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
                    Payment Breakdown
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Total amount due for your booking
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <dl className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">
                        {enrichedBooking.tripName} × {booking.days}{" "}
                        {booking.days === 1 ? "day" : "days"}
                      </dt>
                      <dd>RM {enrichedBooking.unitPrice.toFixed(2)}</dd>
                    </div>
                    {booking.platformFee && (
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">Platform fee</dt>
                        <dd>RM {Number(booking.platformFee).toFixed(2)}</dd>
                      </div>
                    )}
                    {booking.serviceFee && (
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">
                          Payment gateway fee
                        </dt>
                        <dd>RM {Number(booking.serviceFee).toFixed(2)}</dd>
                      </div>
                    )}
                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between text-lg font-semibold">
                        <span>Total</span>
                        <span className="flex items-center gap-1">
                          RM {enrichedBooking.totalPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </dl>

                  <div className="p-3 text-xs border rounded-lg bg-muted/40 text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>
                        This booking has been approved by the captain. Your
                        payment will be processed immediately upon submission.
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Form */}
              <Card>
                <CardHeader>
                  <CardTitle role="heading" aria-level={2}>
                    Complete Payment
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Select your payment method and submit
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
                      <span>
                        Payments are encrypted and secured by Senang Pay
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserRound className="w-4 h-4 text-primary" />
                      <span>Booking for: {contactEmail}</span>
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
                    Participants ({participantList.length})
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Anglers joining this trip
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
                              {p.isBooker ? "Booker" : "Guest"}
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
                      Emergency Contact
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      In case of emergency
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
                        Phone Number
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
                      Cancellation Policy
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
