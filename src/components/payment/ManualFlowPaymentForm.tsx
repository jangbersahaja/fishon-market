"use client";

import { PaymentMethodSelector } from "@/components/payment/shared/PaymentMethodSelector";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface ManualFlowPaymentFormProps {
  bookingId: string;
  amount: number;
  charterId: string;
  enableMockPayment?: boolean;
}

export function ManualFlowPaymentForm({
  bookingId,
  amount,
  enableMockPayment = false,
}: ManualFlowPaymentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("CARD");

  // Card details for CARD payment
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpMonth, setCardExpMonth] = useState("");
  const [cardExpYear, setCardExpYear] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate card details if Card payment selected
      if (paymentMethod === "CARD") {
        if (!cardNumber || !cardExpMonth || !cardExpYear || !cardCvv) {
          toast.error("Please fill in all card details");
          setIsSubmitting(false);
          return;
        }
      }

      // Call manual flow payment API endpoint
      const response = await fetch("/api/bookings/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: bookingId,
          paymentMethod,
          ...(paymentMethod === "CARD" && {
            cardNumber,
            cardExpMonth,
            cardExpYear,
            cardCvv,
          }),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Payment failed");
      }

      // Handle payment gateway redirect
      if (result.requiresRedirect && result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }

      // Payment successful - redirect to confirmation
      toast.success("Payment completed successfully!");
      router.push(`/book/confirm?id=${bookingId}`);
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || "Failed to process payment");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
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

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing Payment...
            </>
          ) : (
            <>Pay RM {amount.toFixed(2)}</>
          )}
        </Button>

        {/* Back Link */}
        <div className="text-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/book/confirm?id=${bookingId}`)}
            disabled={isSubmitting}
          >
            ← Back to booking details
          </Button>
        </div>
      </div>
    </form>
  );
}
