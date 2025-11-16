"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Charter, Trip } from "@fishon/ui";
import { Building2, CreditCard, Loader2, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

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

interface PricingBreakdown {
  tripPrice: number;
  finalPrice: number;
  platformFee: number;
  serviceFee: number;
  captainEarnings: number;
}

interface PaymentPreviewFormProps {
  bookingData: BookingPreviewData;
  pricing: PricingBreakdown;
  charter: Charter;
  trip: Trip;
  session: any;
  sessionExpiresAt: number;
}

export function PaymentPreviewForm({
  bookingData,
  pricing,
  charter,
  trip,
  session,
  sessionExpiresAt,
}: PaymentPreviewFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("CARD");

  // Card details for TOKENIZED flow
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpMonth, setCardExpMonth] = useState("");
  const [cardExpYear, setCardExpYear] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Pre-submission validation (availability, pricing, session)
      const validationResponse = await fetch("/api/bookings/validate-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...bookingData,
          finalPrice: pricing.finalPrice,
        }),
      });

      const validation = await validationResponse.json();

      if (!validation.valid) {
        if (validation.code === "SESSION_EXPIRED") {
          toast.error("Payment session expired. Redirecting...");
          router.push(
            `/book/${bookingData.charterId}?error=session_expired&message=${encodeURIComponent(
              validation.error || "Session expired"
            )}`
          );
          return;
        }

        if (validation.code === "DATE_UNAVAILABLE") {
          toast.error(validation.error || "Date no longer available");
          router.push(`/book/${bookingData.charterId}`);
          return;
        }

        if (validation.code === "PRICE_CHANGED") {
          toast.error(
            `Price changed to RM ${validation.newPrice?.toFixed(2)}. Please review and try again.`
          );
          router.push(`/book/${bookingData.charterId}`);
          return;
        }

        toast.error(validation.error || "Validation failed");
        setIsSubmitting(false);
        return;
      }

      // Validate card details for Card payment
      if (paymentMethod === "CARD") {
        if (!cardNumber || !cardExpMonth || !cardExpYear || !cardCvv) {
          toast.error("Please fill in all card details");
          setIsSubmitting(false);
          return;
        }
      }

      // Prepare booking payload
      const payload = {
        tripId: bookingData.tripId,
        date: bookingData.date,
        days: bookingData.days,
        adults: bookingData.adults,
        children: bookingData.children,
        startTime: bookingData.startTime,
        note: bookingData.note,
        phone: bookingData.phone,
        emergencyName: bookingData.emergencyName,
        emergencyPhone: bookingData.emergencyPhone,
        emergencyRelation: bookingData.emergencyRelation,
        paymentMethod,
        ...(paymentMethod === "CARD" && {
          cardNumber,
          cardExpMonth,
          cardExpYear,
          cardCvv,
        }),
      };

      // Call the existing /api/bookings/create endpoint
      const response = await fetch("/api/bookings/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create booking");
      }

      // Handle different payment flows
      if (result.paymentUrl) {
        // DIRECT flow (FPX/E-wallet): Redirect to gateway
        window.location.href = result.paymentUrl;
      } else if (result.redirectTo) {
        // TOKENIZED flow: Card authorization succeeded
        router.push(result.redirectTo);
      } else {
        // Fallback
        toast.success("Booking created successfully!");
        router.push(`/book/confirm?id=${result.booking?.id}`);
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || "Failed to process payment");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
            <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent cursor-pointer">
              <RadioGroupItem value="CARD" id="card" />
              <Label
                htmlFor="card"
                className="flex items-center gap-2 cursor-pointer flex-1"
              >
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Credit/Debit Card</p>
                  <p className="text-sm text-muted-foreground">
                    Visa, Mastercard
                  </p>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent cursor-pointer">
              <RadioGroupItem value="FPX" id="fpx" />
              <Label
                htmlFor="fpx"
                className="flex items-center gap-2 cursor-pointer flex-1"
              >
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Online Banking (FPX)</p>
                  <p className="text-sm text-muted-foreground">
                    All Malaysian banks
                  </p>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent cursor-pointer">
              <RadioGroupItem value="EWALLET" id="ewallet" />
              <Label
                htmlFor="ewallet"
                className="flex items-center gap-2 cursor-pointer flex-1"
              >
                <Smartphone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">E-Wallet</p>
                  <p className="text-sm text-muted-foreground">
                    Touch 'n Go, GrabPay, etc.
                  </p>
                </div>
              </Label>
            </div>
          </RadioGroup>

          {/* Card Details (only show if Card selected) */}
          {paymentMethod === "CARD" && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  maxLength={19}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expMonth">Month</Label>
                  <Input
                    id="expMonth"
                    placeholder="MM"
                    value={cardExpMonth}
                    onChange={(e) => setCardExpMonth(e.target.value)}
                    maxLength={2}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expYear">Year</Label>
                  <Input
                    id="expYear"
                    placeholder="YY"
                    value={cardExpYear}
                    onChange={(e) => setCardExpYear(e.target.value)}
                    maxLength={2}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    placeholder="123"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    maxLength={3}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>Pay RM {pricing.finalPrice.toFixed(2)}</>
            )}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
