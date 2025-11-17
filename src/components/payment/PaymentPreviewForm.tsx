"use client";

import { PaymentMethodSelector } from "@/components/payment/shared/PaymentMethodSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBookingStorage } from "@/hooks/useBookingStorage";
import type { Charter, Trip } from "@fishon/ui";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
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
  participants?: Array<{ name: string; phone: string; isBooker?: boolean }>;
  guestVerification?: { userId: string; email: string };
  sessionStart: number;
}

interface PricingBreakdown {
  tripPrice: number;
  finalPrice: number;
  platformFee: number;
  captainEarnings: number;
  subtotal: number;
  paymentGatewayFee: number;
  days: number;
}

interface PaymentPreviewFormProps {
  bookingData: BookingPreviewData;
  pricing: PricingBreakdown;
  charter: Charter;
  trip: Trip;
  session: any;
  sessionExpiresAt: number;
  enableMockPayment?: boolean;
}

export function PaymentPreviewForm({
  bookingData,
  pricing,
  charter,
  trip,
  session,
  sessionExpiresAt,
  enableMockPayment = false,
}: PaymentPreviewFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("FPX");
  const { addBooking } = useBookingStorage();

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
      const basePayload = {
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
        participants: bookingData.participants,
        paymentMethod,
        ...(paymentMethod === "CARD" && {
          cardNumber,
          cardExpMonth,
          cardExpYear,
          cardCvv,
        }),
      };

      const guestVerification = bookingData.guestVerification;
      const endpoint = guestVerification
        ? "/api/bookings/create-guest"
        : "/api/bookings/create";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          guestVerification
            ? {
                verifiedEmail: guestVerification.email,
                verifiedUserId: guestVerification.userId,
                firstName: bookingData.firstName,
                lastName: bookingData.lastName,
                ...basePayload,
              }
            : basePayload
        ),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create booking");
      }

      // Handle different payment flows
      if (result.requiresRedirect && result.redirectUrl) {
        if (result.booking?.id) {
          addBooking({
            id: result.booking.id,
            charterName: charter.name,
            date: bookingData.date,
            status: result.booking.status ?? "PAYMENT_AUTHORIZED",
          });
        }
        window.location.href = result.redirectUrl;
        return;
      }

      if (result.booking?.id) {
        addBooking({
          id: result.booking.id,
          charterName: charter.name,
          date: bookingData.date,
          status: result.booking.status ?? "PAYMENT_AUTHORIZED",
        });
        router.push(`/book/confirm?id=${result.booking.id}`);
        return;
      }

      toast.success("Booking created successfully!");
      router.push(`/book/${bookingData.charterId}`);
      return;
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
          {/* Payment Method Selection - Shared Component */}
          <PaymentMethodSelector
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            enableMockPayment={enableMockPayment}
            cardNumber={cardNumber}
            cardExpMonth={cardExpMonth}
            cardExpYear={cardExpYear}
            cardCvv={cardCvv}
            onCardNumberChange={setCardNumber}
            onCardExpMonthChange={setCardExpMonth}
            onCardExpYearChange={setCardExpYear}
            onCardCvvChange={setCardCvv}
          />

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
