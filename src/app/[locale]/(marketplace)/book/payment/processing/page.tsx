"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Payment Processing Page
 *
 * This page is shown after successful payment while waiting for the
 * callback webhook to create the booking. It polls for the booking
 * to be created and redirects to confirmation once ready.
 *
 * This handles the race condition where:
 * - User returns from payment gateway before callback processes
 * - Callback creates booking asynchronously
 */

export default function PaymentProcessingPage({
  searchParams,
}: {
  searchParams: { session?: string; tx?: string };
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"polling" | "success" | "timeout">(
    "polling"
  );
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 30; // 30 seconds max wait
  const pollInterval = 1000; // 1 second

  useEffect(() => {
    if (!searchParams.tx) {
      router.replace("/");
      return;
    }

    const pollForBooking = async () => {
      try {
        const response = await fetch(
          `/api/bookings/by-transaction?tx=${searchParams.tx}`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.bookingId) {
            setStatus("success");
            // Short delay to show success state
            setTimeout(() => {
              router.replace(
                `/book/confirm?id=${data.bookingId}&payment=success`
              );
            }, 1000);
            return;
          }
        }

        // Continue polling
        setAttempts((prev) => prev + 1);
      } catch (error) {
        console.error("Error polling for booking:", error);
        setAttempts((prev) => prev + 1);
      }
    };

    if (status === "polling" && attempts < maxAttempts) {
      const timer = setTimeout(pollForBooking, pollInterval);
      return () => clearTimeout(timer);
    } else if (attempts >= maxAttempts) {
      setStatus("timeout");
    }
  }, [attempts, status, searchParams.tx, router]);

  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="text-center space-y-6 max-w-md">
        {status === "polling" && (
          <>
            <div className="relative">
              <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Processing Your Payment</h1>
              <p className="text-muted-foreground">
                Your payment was successful! We&apos;re confirming your booking
                now. This usually takes just a few seconds.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>Payment verified</span>
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-green-700">
                Booking Confirmed!
              </h1>
              <p className="text-muted-foreground">
                Redirecting you to your booking details...
              </p>
            </div>
          </>
        )}

        {status === "timeout" && (
          <>
            <AlertCircle className="w-16 h-16 mx-auto text-amber-500" />
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Almost There!</h1>
              <p className="text-muted-foreground">
                Your payment was successful, but we&apos;re taking a bit longer
                to process your booking. Don&apos;t worry — you&apos;ll receive
                a confirmation email shortly.
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setAttempts(0);
                  setStatus("polling");
                }}
                className="px-6 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90"
              >
                Check Again
              </button>
              <p className="text-xs text-muted-foreground">
                Transaction ID: {searchParams.tx?.substring(0, 16)}...
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
