"use client";

import {
  BookAgainButton,
  CancelBookingButton,
  PayNowButton,
} from "@/components/account/BookingActionButtons";
import { EmailVerificationModal } from "@/components/booking/EmailVerificationModal";
import { Button } from "@/components/ui/button";
import type { BookingStatus } from "@/lib/services/booking-service";
import { Download } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface BookingActionsProps {
  bookingId: string;
  charterId: string;
  status: BookingStatus;
  bookingEmail: string;
  isLoggedInOwner?: boolean;
}

export function BookingActions({
  bookingId,
  charterId,
  status,
  bookingEmail,
  isLoggedInOwner = false,
}: BookingActionsProps) {
  const router = useRouter();
  const [isDownloading, setIsDownloading] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [verificationAction, setVerificationAction] = useState<
    "cancel" | "download"
  >("cancel");
  const [verifiedEmail, setVerifiedEmail] = useState<string | undefined>(
    undefined
  );

  const requiresEmailVerification = !isLoggedInOwner;

  const commonReasons = [
    "Change of plans",
    "Found a better offer",
    "Weather concerns",
    "Unable to travel",
    "Captain unresponsive",
    "Booking mistake",
    "Other",
  ];

  const getFinalReason = () => {
    if (selectedReason === "Other") {
      return otherReason.trim();
    }
    return selectedReason;
  };

  const handleDownloadReceipt = async (verifiedEmail?: string) => {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: verifiedEmail,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to download receipt");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Fishon-Receipt-${bookingId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to download receipt:", error);
      alert(
        error instanceof Error ? error.message : "Failed to download receipt"
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCancelBooking = async (verifiedEmail?: string) => {
    const reason = getFinalReason();
    if (!reason) {
      setCancelError("Please select or enter a cancellation reason");
      return;
    }

    setIsCancelling(true);
    setCancelError(null);

    try {
      const payload: {
        id: string;
        cancellationReason: string;
        email?: string;
      } = {
        id: bookingId,
        cancellationReason: reason,
      };

      // Only include email if provided (for guest users)
      if (verifiedEmail) {
        payload.email = verifiedEmail;
      }

      const response = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to cancel booking");
      }

      // Close modals and refresh
      setShowCancelDialog(false);
      setShowEmailVerification(false);
      router.refresh();
      alert("Booking cancelled successfully");
    } catch (error) {
      console.error("Failed to cancel booking:", error);
      setCancelError(
        error instanceof Error ? error.message : "Failed to cancel booking"
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDownloadClick = () => {
    if (requiresEmailVerification) {
      setVerificationAction("download");
      setShowEmailVerification(true);
    } else {
      handleDownloadReceipt();
    }
  };

  const handleCancelClick = () => {
    if (requiresEmailVerification) {
      setVerificationAction("cancel");
      setShowEmailVerification(true);
    } else {
      // For logged-in owners, show cancellation reason dialog
      setShowCancelDialog(true);
    }
  };

  const handleEmailVerify = async (email: string) => {
    if (verificationAction === "download") {
      await handleDownloadReceipt(email);
    } else if (verificationAction === "cancel") {
      // Store verified email for later use in cancellation
      setVerifiedEmail(email);
      // After email verification, still need to get cancellation reason
      setShowEmailVerification(false);
      setShowCancelDialog(true);
    }
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Actions</h3>

        {/* PENDING: Cancel button */}
        {status === "PENDING" && (
          <CancelBookingButton
            bookingId={bookingId}
            fullWidth
            onCancel={handleCancelClick}
          />
        )}

        {/* APPROVED: Pay Now + Cancel */}
        {status === "APPROVED" && (
          <>
            <PayNowButton bookingId={bookingId} fullWidth />
            <CancelBookingButton
              bookingId={bookingId}
              fullWidth
              onCancel={handleCancelClick}
            />
          </>
        )}

        {/* PAID: Download Receipt + Book Again */}
        {status === "PAID" && (
          <>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleDownloadClick}
              disabled={isDownloading}
            >
              <Download className="w-4 h-4 mr-2" />
              {isDownloading ? "Downloading..." : "Download Receipt"}
            </Button>
            <BookAgainButton charterId={charterId} fullWidth />
          </>
        )}

        {/* CANCELLED: Try Book Again */}
        {status === "CANCELLED" && (
          <BookAgainButton charterId={charterId} fullWidth variant="default" />
        )}

        {/* REJECTED: Try Book Again */}
        {status === "REJECTED" && (
          <BookAgainButton charterId={charterId} fullWidth />
        )}

        {/* Divider */}
        <div className="border-t border-gray-200 my-4" />

        {/* Additional Actions */}
        <Button variant="outline" className="w-full" asChild>
          <Link href="/support/help">Contact Support</Link>
        </Button>

        <Button variant="outline" className="w-full" asChild>
          <Link href="/charters">Browse Similar Charters</Link>
        </Button>
      </div>

      {/* Email Verification Modal */}
      <EmailVerificationModal
        isOpen={showEmailVerification}
        onClose={() => setShowEmailVerification(false)}
        onVerify={handleEmailVerify}
        action={verificationAction}
        bookingEmail={bookingEmail}
      />

      {/* Cancellation Reason Dialog */}
      {showCancelDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center transition-colors duration-200 bg-black/50"
          aria-modal="true"
          role="dialog"
        >
          <div className="relative w-full max-w-md p-0 sm:p-0">
            <div className="p-6 bg-white shadow-2xl rounded-2xl sm:p-8 animate-fadeIn">
              {/* Close button */}
              <button
                className="absolute text-gray-400 top-3 right-3 hover:text-gray-600 focus:outline-none"
                aria-label="Close"
                onClick={() => setShowCancelDialog(false)}
                disabled={isCancelling}
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <path
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 6 6 18M6 6l12 12"
                  />
                </svg>
              </button>

              <h3 className="mb-2 text-xl font-bold text-gray-900">
                Cancel Booking?
              </h3>
              <p className="mb-4 text-sm text-gray-700">
                Are you sure you want to cancel this booking?{" "}
                <span className="font-medium text-[#ec2227]">
                  This action cannot be undone.
                </span>
              </p>

              <div className="mb-5">
                <label className="block mb-2 text-sm font-semibold text-gray-900">
                  Reason for cancellation
                </label>
                <fieldset>
                  <legend className="sr-only">Select a reason</legend>
                  <div className="flex flex-col gap-2">
                    {commonReasons.map((reason) => (
                      <label
                        key={reason}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                          selectedReason === reason
                            ? "border-[#ec2227] bg-[#fff0f1]"
                            : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="cancel-reason"
                          value={reason}
                          checked={selectedReason === reason}
                          onChange={() => setSelectedReason(reason)}
                          disabled={isCancelling}
                          className="accent-[#ec2227] focus:ring-2 focus:ring-[#ec2227]"
                        />
                        <span className="text-sm font-medium text-gray-900">
                          {reason}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {selectedReason === "Other" && (
                  <input
                    type="text"
                    className="mt-3 w-full border-2 border-[#ec2227] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec2227]"
                    placeholder="Please specify your reason..."
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    maxLength={120}
                    disabled={isCancelling}
                    autoFocus
                    aria-label="Other reason"
                  />
                )}
              </div>

              {cancelError && (
                <div className="mb-3 text-sm font-medium text-red-600">
                  {cancelError}
                </div>
              )}

              <div className="flex flex-row-reverse gap-2 mt-2">
                <button
                  className="px-4 py-2 text-sm rounded-lg bg-[#ec2227] text-white font-semibold hover:bg-[#d11f24] disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#ec2227]"
                  onClick={() => handleCancelBooking(verifiedEmail)}
                  disabled={isCancelling || !getFinalReason()}
                >
                  {isCancelling ? "Cancelling..." : "Yes, Cancel"}
                </button>
                <button
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 focus:outline-none"
                  onClick={() => setShowCancelDialog(false)}
                  disabled={isCancelling}
                >
                  Nevermind
                </button>
              </div>
            </div>

            {/* Simple fade-in animation */}
            <style jsx>{`
              .animate-fadeIn {
                animation: fadeIn 0.18s cubic-bezier(0.4, 0, 0.2, 1);
              }
              @keyframes fadeIn {
                from {
                  opacity: 0;
                  transform: translateY(16px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
            `}</style>
          </div>
        </div>
      )}
    </>
  );
}
