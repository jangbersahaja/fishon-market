import { PaymentPreviewForm } from "@/components/payment/PaymentPreviewForm";
import { PaymentSessionTimer } from "@/components/payment/PaymentSessionTimer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth/auth";
import { buildBookingPreviewSummary } from "@/lib/helpers/booking-preview-summary";
import { getCharterById } from "@/lib/services/charter-service";
import { calculatePricing } from "@/lib/services/pricing-service";
import { getTripById } from "@/lib/services/trip-service";
import { isForceMockMode } from "@/lib/payment/senangpay";
import {
  AlertCircle,
  Calendar,
  Clock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { redirect } from "next/navigation";

// Session timeout: 30 minutes
const PAYMENT_SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const PAYMENT_SESSION_TIMEOUT_MINUTES =
  PAYMENT_SESSION_TIMEOUT_MS / (60 * 1000);

interface BookingPreviewData {
  charterId: string;
  tripId: string;
  date: string;
  days: number;
  startTime: string;
  adults: number;
  children: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  note?: string;
  participants?: Array<{ name: string; phone: string; isBooker?: boolean }>;
  guestVerification?: { userId: string; email: string };
  sessionStart: number;
}

type CharterCancellationInfo = {
  cancellation?: {
    freeUntilHours?: number;
    afterPolicy?: string;
  };
};

function decodeBookingData(encoded: string): BookingPreviewData | null {
  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export default async function PaymentPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();

  // Decode booking data
  const encodedData = sp.data;
  if (!encodedData) {
    redirect("/");
  }

  const bookingData = decodeBookingData(encodedData);
  if (!bookingData) {
    redirect("/");
  }

  // Check session timeout
  const now = Date.now();
  const sessionExpiresAt =
    bookingData.sessionStart + PAYMENT_SESSION_TIMEOUT_MS;
  if (now > sessionExpiresAt) {
    redirect(
      `/book/${bookingData.charterId}?error=session_expired&message=${encodeURIComponent(
        "Your payment session expired. Please submit your booking details again."
      )}`
    );
  }

  // Fetch charter and trip details
  const charter = await getCharterById(bookingData.charterId);
  if (!charter) {
    redirect("/");
  }

  const trip = await getTripById(bookingData.tripId);
  if (!trip) {
    redirect("/");
  }

  // Calculate pricing (snapshot - will be re-validated on submit)
  const pricing = calculatePricing({
    tripPrice: trip.price,
    days: bookingData.days,
  });

  const bookingSummary = buildBookingPreviewSummary({
    booking: bookingData,
    charter,
    trip,
  });
  const expiresAt = new Date(sessionExpiresAt);
  const contactName = [bookingData.firstName, bookingData.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const participantList =
    bookingData.participants && bookingData.participants.length > 0
      ? bookingData.participants
      : [
          {
            name: contactName || bookingData.firstName || bookingData.lastName,
            phone: bookingData.phone,
            isBooker: true,
          },
        ];
  const cancellationPolicy = (charter as CharterCancellationInfo).cancellation;
  const cancellationHeadline = cancellationPolicy?.freeUntilHours
    ? `Free cancellation up to ${cancellationPolicy.freeUntilHours} hours before departure`
    : "Flexible cancellation before departure";
  const cancellationAfterText = cancellationPolicy?.afterPolicy
    ? `After this window: ${cancellationPolicy.afterPolicy}`
    : "After this window: Refunds follow captain policy and processing fees.";
  const policyHighlights: string[] = [];
  if (charter.policies?.childFriendly) {
    policyHighlights.push("Child-friendly crew and gear options available.");
  }
  if (charter.policies?.catchAndKeep) {
    policyHighlights.push("Catch & keep allowed within local regulations.");
  }
  if (charter.policies?.catchAndRelease) {
    policyHighlights.push("Catch & release encouraged for trophy species.");
  }
  if (!policyHighlights.length) {
    policyHighlights.push(
      "Captain will brief everyone on safety and catch policies at the dock."
    );
  }
  const contactBadgeLabel = bookingData.guestVerification
    ? "Guest verified"
    : session?.user
      ? "Signed in"
      : "Guest checkout";
  const paymentIdentityNote = bookingData.guestVerification
    ? `Guest verification lock: ${bookingData.guestVerification.email}`
    : session?.user?.email
      ? `Signed in as ${session.user.email}`
      : `Paying as guest (${bookingData.email})`;
  const formattedExpiryLabel = expiresAt.toLocaleString("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const enableMockPayment = isForceMockMode();

  return (
    <main className="bg-slate-50">
      <div className="w-full px-4 py-8 mx-auto max-w-7xl sm:px-6">
        <PaymentSessionTimer
          expiresAt={expiresAt}
          charterId={bookingData.charterId}
        />

        <header className="pb-6 space-y-3 border-b border-border">
          <div className="space-y-2">
            <p className="text-sm font-semibold tracking-wide uppercase text-primary">
              Payment Preview
            </p>
            <h1 className="text-3xl font-bold tracking-tight">
              Review & Complete Payment
            </h1>
            <p className="text-muted-foreground">
              Double-check your itinerary, traveling party, and policies before
              submitting payment.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="border-primary/40 text-primary">
              Session active
            </Badge>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Hold ends {formattedExpiryLabel}
            </span>
          </div>
        </header>

        <section className="mt-8">
          <div
            className="grid grid-cols-1 gap-5 lg:grid-cols-3"
            data-testid="payment-preview-grid"
          >
            <div className="space-y-5 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle role="heading" aria-level={2}>
                    Trip Summary
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Matches what you&apos;ll see on the confirmation screen.
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                          Charter
                        </p>
                        <p className="text-lg font-semibold">
                          {bookingSummary.charter.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {bookingSummary.charter.location}
                        </p>
                        <p className="inline-flex items-center gap-2 mt-2 text-xs font-medium text-muted-foreground">
                          Trip
                          <Badge
                            variant="secondary"
                            className="text-xs font-semibold"
                          >
                            {trip.name}
                          </Badge>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Calendar className="mt-0.5 h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                          Schedule
                        </p>
                        <p className="font-semibold">
                          {bookingSummary.schedule.primaryDateLabel}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {bookingSummary.schedule.daysLabel}
                          {bookingSummary.schedule.startTimeLabel && (
                            <>
                              {" • "}
                              {bookingSummary.schedule.startTimeLabel}
                            </>
                          )}
                        </p>
                        {bookingSummary.schedule.multiDayRangeLabel && (
                          <p className="text-sm text-muted-foreground">
                            {bookingSummary.schedule.multiDayRangeLabel}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Users className="mt-0.5 h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                          Guests
                        </p>
                        <p className="font-semibold">
                          {bookingSummary.guests.totalLabel}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {bookingSummary.guests.breakdownLabel}
                        </p>
                      </div>
                    </div>
                  </div>

                  {bookingSummary.note && (
                    <div className="p-4 border rounded-lg bg-muted/40">
                      <p className="mb-1 text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                        Special requests
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {bookingSummary.note}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle role="heading" aria-level={2}>
                    Pricing Snapshot
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    We&apos;ll re-validate these totals right before the charge.
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <dl className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">
                        {trip.name} × {bookingData.days}{" "}
                        {bookingData.days === 1 ? "day" : "days"}
                      </dt>
                      <dd>RM {pricing.subtotal.toFixed(2)}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">
                        Platform fee (10%)
                      </dt>
                      <dd>RM {pricing.platformFee.toFixed(2)}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">
                        Payment gateway fee (1.5%)
                      </dt>
                      <dd>RM {pricing.paymentGatewayFee.toFixed(2)}</dd>
                    </div>
                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between text-lg font-semibold">
                        <span>Total</span>
                        <span className="flex items-center gap-1">
                          RM {pricing.finalPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </dl>

                  <div className="p-3 text-xs border rounded-lg bg-muted/40 text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>
                        Availability, pricing, and card authorization are
                        checked again before your payment is sent to the
                        captain.
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle role="heading" aria-level={2}>
                    Complete Payment
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Charges remain pending until the captain confirms your trip.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <PaymentPreviewForm
                    bookingData={bookingData}
                    pricing={pricing}
                    charter={charter}
                    trip={trip as any}
                    session={session}
                    sessionExpiresAt={sessionExpiresAt}
                    enableMockPayment={enableMockPayment}
                  />
                  <div className="p-4 space-y-3 text-xs border rounded-lg bg-muted/30 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      <span>
                        Payments are encrypted and never stored on Fishon
                        servers.
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserRound className="w-4 h-4 text-primary" />
                      <span>{paymentIdentityNote}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-primary" />
                      <span>
                        We attach this session metadata (participants, pricing
                        snapshot, and contact details) to the payment so the
                        captain can review before authorizing.
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-5 ">
              <Card>
                <CardHeader>
                  <CardTitle role="heading" aria-level={2}>
                    Contacts
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    We&apos;ll send confirmations, reminders, and hold updates
                    to this person.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6 text-sm">
                  <div className="p-4 border border-dashed rounded-xl bg-muted/40">
                    <div className="flex items-center justify-between text-xs tracking-wide uppercase text-muted-foreground">
                      <span>Primary contact</span>
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase tracking-wide"
                      >
                        {contactBadgeLabel}
                      </Badge>
                    </div>
                    <dl className="mt-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="flex items-center gap-2 text-muted-foreground">
                          <UserRound className="w-4 h-4" /> Name
                        </dt>
                        <dd className="font-medium text-right">
                          {contactName || "Guest"}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="w-4 h-4" /> Email
                        </dt>
                        <dd className="font-medium text-right">
                          {bookingData.email}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-4 h-4" /> Phone
                        </dt>
                        <dd className="font-medium text-right">
                          {bookingData.phone}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="p-4 border rounded-xl bg-muted/30">
                    <div className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                      Emergency contact
                    </div>
                    <dl className="mt-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted-foreground">Name</dt>
                        <dd className="font-medium text-right">
                          {bookingData.emergencyName || "Not provided"}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted-foreground">Relationship</dt>
                        <dd className="font-medium text-right">
                          {bookingData.emergencyRelation || "Not provided"}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted-foreground">Phone</dt>
                        <dd className="font-medium text-right">
                          {bookingData.emergencyPhone || "Not provided"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle role="heading" aria-level={2}>
                    Participants
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Verify everyone on board. Edit participants before paying if
                    anything changed.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {participantList.map((participant, index) => (
                    <div
                      key={`${participant.name}-${index}`}
                      className="flex items-center justify-between px-3 py-3 text-sm border rounded-lg bg-background"
                    >
                      <div>
                        <p className="font-medium">{participant.name}</p>
                        <p className="text-muted-foreground">
                          {participant.phone || "No phone provided"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {participant.isBooker && (
                          <Badge variant="secondary">Booker</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Participant {index + 1}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle role="heading" aria-level={2}>
                    Cancellation Policy
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Highlights from the captain&apos;s policy. Full terms arrive
                    in your receipt.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="p-4 border border-dashed rounded-lg bg-muted/40">
                    <p className="font-semibold">{cancellationHeadline}</p>
                    <p className="text-muted-foreground">
                      {cancellationAfterText}
                    </p>
                  </div>
                  <ul className="space-y-3">
                    {policyHighlights.map((highlight) => (
                      <li key={highlight} className="flex items-start gap-2">
                        <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
