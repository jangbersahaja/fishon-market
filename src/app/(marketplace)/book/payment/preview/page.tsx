import { PaymentPreviewForm } from "@/components/payment/PaymentPreviewForm";
import { PaymentSessionTimer } from "@/components/payment/PaymentSessionTimer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth/auth";
import { getCharterById } from "@/lib/services/charter-service";
import { calculatePricing } from "@/lib/services/pricing-service";
import { getTripById } from "@/lib/services/trip-service";
import {
  AlertCircle,
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  Users,
} from "lucide-react";
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
  sessionStart: number;
}

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

  const tripDate = new Date(bookingData.date);
  const expiresAt = new Date(sessionExpiresAt);

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Session Countdown Timer */}
      <PaymentSessionTimer
        expiresAt={expiresAt}
        charterId={bookingData.charterId}
      />

      <div className="mx-auto max-w-4xl space-y-6">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Review & Complete Payment</h1>
          <p className="text-muted-foreground">
            Please review your booking details before proceeding to payment
          </p>
        </div>

        {/* Session Warning */}
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Complete your payment within 30 minutes to secure this booking at
            the current price
          </AlertDescription>
        </Alert>

        {/* Booking Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-semibold">{charter.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {charter.location}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-semibold">
                    {tripDate.toLocaleDateString("en-MY", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {bookingData.days} {bookingData.days === 1 ? "day" : "days"}{" "}
                    • Starts at {bookingData.startTime}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-semibold">
                    {bookingData.adults + bookingData.children}{" "}
                    {bookingData.adults + bookingData.children === 1
                      ? "guest"
                      : "guests"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {bookingData.adults}{" "}
                    {bookingData.adults === 1 ? "adult" : "adults"}
                    {bookingData.children > 0 &&
                      `, ${bookingData.children} ${
                        bookingData.children === 1 ? "child" : "children"
                      }`}
                  </p>
                </div>
              </div>
            </div>

            {bookingData.note && (
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm font-semibold mb-1">Special Requests</p>
                <p className="text-sm text-muted-foreground">
                  {bookingData.note}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Price Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {trip.name} x {bookingData.days}{" "}
                {bookingData.days === 1 ? "day" : "days"}
              </span>
              <span>RM {pricing.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Platform fee (10%)</span>
              <span>RM {pricing.platformFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Payment gateway fee (1.5%)
              </span>
              <span>RM {pricing.paymentGatewayFee.toFixed(2)}</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-5 w-5" />
                  RM {pricing.finalPrice.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <PaymentPreviewForm
          bookingData={bookingData}
          pricing={pricing}
          charter={charter}
          trip={trip as any}
          session={session}
          sessionExpiresAt={sessionExpiresAt}
        />

        {/* Security Notice */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <p>
            Your payment information is secure and encrypted. We never store
            your card details.
          </p>
        </div>
      </div>
    </main>
  );
}
