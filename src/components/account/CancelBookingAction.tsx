"use client";

import { CancelBookingButton } from "@/components/account/BookingActionButtons";
import { CancellationReasonDialog } from "@/components/booking/CancellationReasonDialog";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface CancelBookingActionProps {
  bookingId: string;
  fullWidth?: boolean;
}

/**
 * Client-side wrapper for cancel booking functionality
 * Used in authenticated context (account dashboard)
 * Shows confirmation dialog before cancelling
 */
export function CancelBookingAction({
  bookingId,
  fullWidth = false,
}: CancelBookingActionProps) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commonReasons = [
    "Change of plans",
    "Found a better offer",
    "Weather concerns",
    "Unable to travel",
    "Captain unresponsive",
    "Booking mistake",
    "Personal reasons",
    "Other",
  ];

  const getFinalReason = () => {
    if (selectedReason === "Other") {
      return otherReason.trim();
    }
    return selectedReason;
  };

  const handleCancel = async () => {
    const reason = getFinalReason();
    if (!reason) {
      setError("Please select or enter a cancellation reason");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: bookingId,
          cancellationReason: reason,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to cancel booking");
      }

      setShowDialog(false);
      router.refresh();
      alert("Booking cancelled successfully");
    } catch (error) {
      console.error("Failed to cancel booking:", error);
      setError(
        error instanceof Error ? error.message : "Failed to cancel booking"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <CancelBookingButton
        bookingId={bookingId}
        fullWidth={fullWidth}
        onCancel={() => {
          setShowDialog(true);
          setError(null);
          setSelectedReason("");
          setOtherReason("");
        }}
      />

      <CancellationReasonDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        onConfirm={handleCancel}
        selectedReason={selectedReason}
        setSelectedReason={setSelectedReason}
        otherReason={otherReason}
        setOtherReason={setOtherReason}
        commonReasons={commonReasons}
        isSubmitting={isSubmitting}
        error={error}
        getFinalReason={getFinalReason}
      />
    </>
  );
}
