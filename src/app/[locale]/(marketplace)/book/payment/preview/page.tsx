import { PaymentGuard } from "@/components/payment/PaymentGuard";
import { PaymentPreviewForm } from "@/components/payment/PaymentPreviewForm";
import { PaymentSessionTimer } from "@/components/payment/PaymentSessionTimer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import { buildBookingPreviewSummary } from "@/lib/helpers/booking-preview-summary";
import { isForceMockMode } from "@/lib/payment/senangpay";
import { getCharterById } from "@/lib/services/charter-service";
import { calculatePricing } from "@/lib/services/pricing-service";
import { validatePromoCode } from "@/lib/services/promo-service";
import { getTripById } from "@/lib/services/trip-service";
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
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

// Session timeout: 30 minutes
const PAYMENT_SESSION_TIMEOUT_MS = 30 * 60 * 1000;

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
  promoCode?: string;
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
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ data?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const session = await auth();
  const t = await getTranslations({
    locale,
    namespace: "booking.paymentPreview",
  });

  // Decode booking data
  const encodedData = sp.data;
  if (!encodedData) {
    redirect(`/${locale}/home`);
  }

  const bookingData = decodeBookingData(encodedData);
  if (!bookingData) {
    redirect(`/${locale}/home`);
  }

  // Check session timeout
  const now = Date.now();
  const sessionExpiresAt =
    bookingData.sessionStart + PAYMENT_SESSION_TIMEOUT_MS;
  if (now > sessionExpiresAt) {
    redirect(
      `/${locale}/book/${bookingData.charterId}?error=session_expired&message=${encodeURIComponent(
        "Your payment session expired. Please submit your booking details again."
      )}`
    );
  }

  // Check if booking already exists for this session (prevent duplicate payments)
  // Match by: tripId, date, user (via email), and recent creation time
  const existingBooking = await prisma.booking.findFirst({
    where: {
      tripId: bookingData.tripId,
      date: new Date(bookingData.date),
      // Match user by email (works for both authenticated and guest users)
      user: {
        email: bookingData.email,
      },
      // Only check recent bookings (within session window)
      createdAt: {
        gte: new Date(bookingData.sessionStart),
      },
      // Exclude cancelled or failed bookings
      status: {
        notIn: ["CANCELLED", "REJECTED"],
      },
    },
    select: { id: true },
  });

  if (existingBooking) {
    // Booking already exists - redirect to confirmation page
    redirect(`/${locale}/book/confirm?id=${existingBooking.id}`);
  }

  // Fetch charter and trip details
  const charter = await getCharterById(bookingData.charterId);
  if (!charter) {
    redirect(`/${locale}/home`);
  }

  const trip = await getTripById(bookingData.tripId);
  if (!trip) {
    redirect(`/${locale}/home`);
  }

  // Validate promo code if provided
  let promoDiscount = 0;
  let appliedPromoCode: string | null = null;
  if (bookingData.promoCode && session?.user?.id) {
    const promoValidation = await validatePromoCode({
      code: bookingData.promoCode,
      userId: session.user.id,
      charterId: bookingData.charterId,
      subtotal: trip.price * bookingData.days,
    });

    if (promoValidation.valid && promoValidation.discount) {
      promoDiscount = promoValidation.discount.amount;
      appliedPromoCode = bookingData.promoCode;
    }
  }

  // Calculate pricing (snapshot - will be re-validated on submit)
  const pricing = calculatePricing({
    tripPrice: trip.price,
    days: bookingData.days,
    promoDiscount,
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
      <PaymentGuard
        sessionData={{
          tripId: bookingData.tripId,
          date: bookingData.date,
          email: bookingData.email,
          sessionStart: bookingData.sessionStart,
        }}
        locale={locale}
      />
      <div className="w-full px-4 py-8 mx-auto max-w-7xl sm:px-6">
        <PaymentSessionTimer
          expiresAt={expiresAt}
          charterId={bookingData.charterId}
        />

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
            <Badge variant="outline" className="border-primary/40 text-primary">
              {t("header.sessionActive")}
            </Badge>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />{" "}
              {t("header.holdEnds", { date: formattedExpiryLabel })}
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
                    {t("tripSummary.title")}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {t("tripSummary.description")}
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                          {t("tripSummary.charter")}
                        </p>
                        <p className="text-lg font-semibold">
                          {bookingSummary.charter.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {bookingSummary.charter.location}
                        </p>
                        <div className="inline-flex items-center gap-2 mt-2 text-xs font-medium text-muted-foreground">
                          {t("tripSummary.trip")}
                          <Badge
                            variant="secondary"
                            className="text-xs font-semibold"
                          >
                            {trip.name}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Calendar className="mt-0.5 h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                          {t("tripSummary.schedule")}
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
                          {t("tripSummary.guests")}
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
                        {t("tripSummary.specialRequests")}
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
                    {t("pricingSnapshot.title")}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {t("pricingSnapshot.description")}
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <dl className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">
                        {t("pricingSnapshot.day", {
                          tripName: trip.name,
                          count: bookingData.days,
                        })}
                      </dt>
                      <dd>RM {pricing.subtotal.toFixed(2)}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">
                        {t("pricingSnapshot.platformFee")}
                      </dt>
                      <dd>RM {pricing.platformFee.toFixed(2)}</dd>
                    </div>
                    {pricing.discount > 0 && appliedPromoCode && (
                      <div className="flex items-center justify-between">
                        <dt className="text-muted-foreground">
                          <div className="inline-flex items-center gap-2">
                            {t("pricingSnapshot.discount")}
                            <Badge
                              variant="secondary"
                              className="text-green-700 border-green-200 bg-green-50"
                            >
                              {appliedPromoCode}
                            </Badge>
                          </div>
                        </dt>
                        <dd className="font-semibold text-green-700">
                          -RM {pricing.discount.toFixed(2)}
                        </dd>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">
                        {t("pricingSnapshot.paymentGatewayFee")}
                      </dt>
                      <dd>RM {pricing.paymentGatewayFee.toFixed(2)}</dd>
                    </div>
                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between text-lg font-semibold">
                        <span>{t("pricingSnapshot.total")}</span>
                        <span className="flex items-center gap-1">
                          RM {pricing.finalPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </dl>

                  <div className="p-3 text-xs border rounded-lg bg-muted/40 text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>{t("pricingSnapshot.validationNote")}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

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
                      <span>{t("completePayment.securityNote")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserRound className="w-4 h-4 text-primary" />
                      <span>{paymentIdentityNote}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-primary" />
                      <span>{t("completePayment.metadataNote")}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-5 ">
              <Card>
                <CardHeader>
                  <CardTitle role="heading" aria-level={2}>
                    {t("contacts.title")}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {t("contacts.description")}
                  </p>
                </CardHeader>
                <CardContent className="space-y-6 text-sm">
                  <div className="p-4 border border-dashed rounded-xl bg-muted/40">
                    <div className="flex items-center justify-between text-xs tracking-wide uppercase text-muted-foreground">
                      <span>{t("contacts.primaryContact")}</span>
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
                          <UserRound className="w-4 h-4" /> {t("contacts.name")}
                        </dt>
                        <dd className="font-medium text-right">
                          {contactName || t("contacts.guest")}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="w-4 h-4" /> {t("contacts.email")}
                        </dt>
                        <dd className="font-medium text-right">
                          {bookingData.email}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-4 h-4" /> {t("contacts.phone")}
                        </dt>
                        <dd className="font-medium text-right">
                          {bookingData.phone}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="p-4 border rounded-xl bg-muted/30">
                    <div className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                      {t("contacts.emergencyContact")}
                    </div>
                    <dl className="mt-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted-foreground">
                          {t("contacts.name")}
                        </dt>
                        <dd className="font-medium text-right">
                          {bookingData.emergencyName ||
                            t("contacts.notProvided")}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted-foreground">
                          {t("contacts.relationship")}
                        </dt>
                        <dd className="font-medium text-right">
                          {bookingData.emergencyRelation ||
                            t("contacts.notProvided")}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted-foreground">
                          {t("contacts.phone")}
                        </dt>
                        <dd className="font-medium text-right">
                          {bookingData.emergencyPhone ||
                            t("contacts.notProvided")}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle role="heading" aria-level={2}>
                    {t("participants.title")}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {t("participants.description")}
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
                          {participant.phone || t("participants.noPhone")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {participant.isBooker && (
                          <Badge variant="secondary">
                            {t("participants.booker")}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {t("participants.participant")} {index + 1}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle role="heading" aria-level={2}>
                    {t("cancellationPolicy.title")}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {t("cancellationPolicy.description")}
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
