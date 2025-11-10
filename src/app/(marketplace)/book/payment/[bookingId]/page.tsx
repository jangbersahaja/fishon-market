import { BookingExpiredScreen } from "@/components/booking/BookingExpiredScreen";
import { DateNoLongerAvailableScreen } from "@/components/booking/DateNoLongerAvailableScreen";
import { PaymentConfigurationError } from "@/components/payment/PaymentConfigurationError";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import {
  checkDateAvailability,
  getNextAvailableDates,
} from "@/lib/helpers/availability-helpers";
import { triggerPaymentSideEffects } from "@/lib/payment/payment-side-effects";
import {
  formatAmount,
  generatePaymentHash,
  getMerchantId,
  getSecretKey,
  getSenangPayUrl,
  isForceMockMode,
  sanitizeName,
  sanitizePhone,
  validateSenangPayConfig,
} from "@/lib/payment/senangpay";
import { enrichBookingWithTripData } from "@/lib/services/booking-display-service";
import { Shield } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MockPaymentForm } from "./MockPaymentForm";
import { PaymentForm } from "./PaymentForm";

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const session = await auth();

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    redirect("/");
  }

  // Check authorization: User must be logged in and own the booking
  // OR booking must be a guest booking (userId is null)
  const isAuthenticatedOwner =
    session?.user?.id && booking.userId === session.user.id;
  const isGuestBooking = !booking.userId && booking.guestEmail;

  if (!isAuthenticatedOwner && !isGuestBooking) {
    redirect(`/login?next=${encodeURIComponent(`/book/payment/${bookingId}`)}`);
  }

  // CHECK 1: Booking status must be APPROVED
  if (booking.status === "EXPIRED") {
    // Show BookingExpiredScreen with appropriate messaging
    const enrichedBooking = await enrichBookingWithTripData(booking);
    const expirationType = booking.captainDecisionAt ? "APPROVED" : "PENDING";

    return (
      <BookingExpiredScreen
        booking={{
          id: booking.id,
          status: "EXPIRED",
          date: booking.date,
          startTime: booking.startTime || "08:00", // Trip departure time (e.g., "08:00" = 8 AM)
          expiresAt: booking.expiresAt,
          charter: {
            id: booking.charterId,
            title: enrichedBooking.charterName,
            location: undefined, // TODO: Add location to enriched data
          },
        }}
        expirationType={expirationType as "PENDING" | "APPROVED"}
      />
    );
  }

  if (booking.status !== "APPROVED") {
    redirect(`/book/confirm?id=${bookingId}`);
  }

  // CHECK 2: Verify date is still available (no PAID conflicts)
  // This catches edge cases where another angler paid between approval and now
  const availabilityCheck = await checkDateAvailability({
    charterId: booking.charterId,
    date: booking.date,
    days: booking.days,
    startTime: booking.startTime,
    excludeBookingId: booking.id, // Exclude current booking
  });

  if (!availabilityCheck.isAvailable) {
    // Date is no longer available - show friendly screen
    const enrichedBooking = await enrichBookingWithTripData(booking);

    // Fetch alternative available dates (next 5)
    const alternativeDates = await getNextAvailableDates(
      booking.charterId,
      new Date(), // Start from today
      5, // Get 5 alternatives
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
            location: undefined, // TODO: Add location to enriched data
          },
        }}
        alternativeDates={alternativeDates}
      />
    );
  }

  // All checks passed - proceed with payment
  const enrichedBooking = await enrichBookingWithTripData(booking);

  // ========================================
  // SENANG PAY INTEGRATION
  // ========================================

  // Check payment gateway configuration
  const configValidation = validateSenangPayConfig();
  const forceMock = isForceMockMode();

  // SECURITY: If not configured and NOT in force mock mode, show error
  if (!configValidation.isConfigured && !forceMock) {
    return <PaymentConfigurationError errors={configValidation.errors || []} />;
  }

  // Prepare payment data for Senang Pay
  let paymentData = null;
  let paymentUrl = null;

  if (!forceMock) {
    // Real Senang Pay integration
    const merchantId = getMerchantId();
    const secretKey = getSecretKey();

    if (!merchantId || !secretKey) {
      return (
        <PaymentConfigurationError
          errors={["Merchant ID or Secret Key not configured"]}
        />
      );
    }

    const amount = formatAmount(enrichedBooking.totalPrice);
    const orderId = booking.id;
    const detail = `Charter Booking: ${enrichedBooking.charterName} - ${enrichedBooking.tripName}`;

    // Generate payment hash
    const hash = generatePaymentHash({
      merchantId,
      secretKey,
      detail,
      amount,
      orderId,
    });

    // Get user details for payment
    const rawName =
      booking.guestFirstName && booking.guestLastName
        ? `${booking.guestFirstName} ${booking.guestLastName}`
        : session?.user?.name || "Guest";

    const rawPhone = booking.guestPhone || "";

    // Sanitize name and phone to meet Senang Pay requirements
    // Name: only letters and spaces (no special characters)
    // Phone: only digits (no spaces, dashes, parentheses)
    const userName = sanitizeName(rawName);
    const userPhone = sanitizePhone(rawPhone);
    const userEmail = booking.guestEmail || session?.user?.email || "";

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

    paymentData = {
      merchantId,
      detail,
      amount,
      orderId,
      hash,
      name: userName,
      email: userEmail,
      phone: userPhone,
      returnUrl: `${appUrl}/book/payment/return`,
      callbackUrl: `${appUrl}/api/payment/senangpay-callback`,
    };

    paymentUrl = getSenangPayUrl();
  }

  // Mock payment handler (development only)
  async function handlePayment() {
    "use server";
    console.log("🚀 [PAYMENT] handlePayment called for bookingId:", bookingId);

    const session = await auth();

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    console.log(
      "📦 [PAYMENT] Booking found:",
      booking
        ? { id: booking.id, status: booking.status, date: booking.date }
        : "NOT FOUND"
    );

    if (!booking) return;

    // Check authorization: must be authenticated owner OR guest booking
    const isAuthenticatedOwner =
      session?.user?.id && booking.userId === session.user.id;
    const isGuestBooking = !booking.userId && booking.guestEmail;

    if (!isAuthenticatedOwner && !isGuestBooking) {
      console.log("❌ [PAYMENT] Authorization failed");
      return;
    }

    if (booking.status !== "APPROVED") {
      console.log(
        "❌ [PAYMENT] Booking status not APPROVED, current status:",
        booking.status
      );
      return;
    }

    // CRITICAL: Re-check availability before processing payment
    // This prevents race conditions where multiple users try to pay simultaneously
    const { checkDateAvailability } = await import(
      "@/lib/helpers/availability-helpers"
    );

    console.log("🔍 [PAYMENT] Checking availability before payment:", {
      bookingId: booking.id,
      charterId: booking.charterId,
      date: booking.date,
      startTime: booking.startTime,
      days: booking.days,
    });

    const availabilityCheck = await checkDateAvailability({
      charterId: booking.charterId,
      date: booking.date,
      days: booking.days,
      startTime: booking.startTime,
      excludeBookingId: booking.id,
    });

    console.log("✅ [PAYMENT] Availability check result:", availabilityCheck);

    if (!availabilityCheck.isAvailable) {
      console.log("❌ [PAYMENT] Date no longer available - blocking payment");

      // Update booking status to EXPIRED since date is no longer available
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: "EXPIRED",
          rejectionReason:
            "Date was booked by another angler while you were completing payment. Please select another available date.",
        },
      });

      // Date is no longer available - redirect back to payment page
      // The page render will show DateNoLongerAvailableScreen
      revalidatePath(`/book/payment/${bookingId}`, "page");
      redirect(`/book/payment/${bookingId}`);
    }

    // Mock payment - just update status to PAID
    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
    });

    console.log("✅ Payment completed for booking:", bookingId);

    // Trigger all payment side effects (captain webhook, angler notification, page revalidation)
    await triggerPaymentSideEffects({
      bookingId: updated.id,
      source: "mock",
    });

    redirect(`/book/confirm?id=${bookingId}`);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl px-4 py-12 mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Payment</h1>
          <p className="mt-2 text-gray-600">Complete your booking payment</p>
        </div>

        {/* Payment Card */}
        <div className="p-8 bg-white border rounded-lg shadow-sm">
          {/* Booking Summary */}
          <div className="pb-6 mb-8 border-b">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Booking Summary
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Booking ID:</dt>
                <dd className="font-medium text-gray-900">{booking.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Charter:</dt>
                <dd className="font-medium text-gray-900">
                  {enrichedBooking.charterName}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Trip:</dt>
                <dd className="font-medium text-gray-900">
                  {enrichedBooking.tripName}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Date:</dt>
                <dd className="font-medium text-gray-900">
                  {new Date(booking.date).toLocaleDateString("en-MY", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
              {booking.startTime && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Start Time:</dt>
                  <dd className="font-medium text-gray-900">
                    {booking.startTime}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-600">Guests:</dt>
                <dd className="font-medium text-gray-900">
                  {enrichedBooking.adults} Adult(s)
                  {enrichedBooking.children > 0 &&
                    `, ${enrichedBooking.children} Child(ren)`}
                </dd>
              </div>
            </dl>
          </div>

          {/* Amount */}
          <div className="p-6 mb-8 rounded-lg bg-gray-50">
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-medium text-gray-700">
                Total Amount
              </span>
              <div className="text-right">
                <div className="text-3xl font-bold text-[#ec2227]">
                  RM {enrichedBooking.totalPrice.toFixed(2)}
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  ({booking.days} day{booking.days > 1 ? "s" : ""} × RM{" "}
                  {enrichedBooking.unitPrice.toFixed(2)})
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          {forceMock ? (
            // Development: Mock Payment
            <MockPaymentForm
              bookingId={booking.id}
              amount={enrichedBooking.totalPrice.toFixed(2)}
              onSubmit={handlePayment}
            />
          ) : paymentData && paymentUrl ? (
            // Production: Real Senang Pay Integration
            <>
              {/* Security Notice */}
              <div className="p-4 mb-6 border border-blue-200 rounded-lg bg-blue-50">
                <div className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Secure Payment via Senang Pay</p>
                    <p className="mt-1">
                      You will be redirected to Senang Pay&apos;s secure payment
                      page. After completing payment, you will be redirected
                      back to view your booking confirmation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Senang Pay Payment Form */}
              <PaymentForm paymentUrl={paymentUrl} paymentData={paymentData} />

              {/* Security Notice */}
              <div className="mt-6 text-xs text-center text-gray-500">
                <p>
                  🔒 Your payment information is secure and encrypted by Senang
                  Pay
                </p>
              </div>
            </>
          ) : null}
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <a
            href={`/book/confirm?id=${bookingId}`}
            className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
          >
            ← Back to booking details
          </a>
        </div>
      </div>
    </main>
  );
}
