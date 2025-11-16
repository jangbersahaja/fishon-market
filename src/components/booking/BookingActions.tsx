"use client";

import {
  BookAgainButton,
  CancelBookingButton,
} from "@/components/account/BookingActionButtons";
import { useAuthModal } from "@/components/auth/AuthModalContext";
import { EmailVerificationModal } from "@/components/booking/EmailVerificationModal";
import { Button } from "@/components/ui/button";
import type { BookingStatus } from "@/lib/services/booking-service";
import { Download, Mail, MessageCircle, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface BookingActionsProps {
  bookingId: string;
  charterId: string;
  status: BookingStatus;
  bookingEmail: string;
  isLoggedInOwner?: boolean;
  userRole?: string;
  captainName?: string;
  captainPhone?: string;
  captainEmail?: string;
  conversationId?: string;
  conversationStatus?: string;
  tripDate?: Date;
  finalPrice?: number;
}

export function BookingActions({
  bookingId,
  charterId,
  status,
  bookingEmail,
  isLoggedInOwner = false,
  userRole,
  captainName,
  captainPhone,
  captainEmail,
  conversationId,
  conversationStatus,
  tripDate,
  finalPrice,
}: BookingActionsProps) {
  const router = useRouter();
  const { openModal } = useAuthModal();
  const [isDownloading, setIsDownloading] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRefundPreview, setShowRefundPreview] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [estimatedRefund, setEstimatedRefund] = useState<number>(0);
  const [verificationAction, setVerificationAction] = useState<
    "cancel" | "download"
  >("cancel");
  const [verifiedEmail, setVerifiedEmail] = useState<string | undefined>(
    undefined
  );

  const requiresEmailVerification = !isLoggedInOwner;

  // Check user role - GUEST users need to register to chat
  const isGuestUser = userRole === "GUEST";
  const isRegisteredUser = userRole === "ANGLER" || userRole === "ADMIN";

  // Check if chat is available (conversation exists and is unlocked)
  const isChatAvailable =
    conversationId && conversationStatus === "ACTIVE" && isRegisteredUser;

  // Debug chat availability
  console.log("💬 Chat Availability Debug:", {
    userRole,
    isGuestUser,
    isRegisteredUser,
    conversationId,
    conversationStatus,
    isChatAvailable,
    hasConversationId: !!conversationId,
    statusCheck: conversationStatus === "ACTIVE",
  });

  const commonReasons = [
    "Change of plans",
    "Found a better offer",
    "Weather concerns",
    "Unable to travel",
    "Captain unresponsive",
    "Booking mistake",
    "Other",
  ];

  // Calculate estimated refund based on cancellation policy
  const calculateRefund = () => {
    if (!tripDate || !finalPrice) return 0;

    const now = new Date();
    const trip = new Date(tripDate);
    const daysUntilTrip = Math.ceil(
      (trip.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Cancellation policy:
    // >30 days: 80% refund
    // 15-30 days: 50% refund
    // <15 days: 0% refund
    if (daysUntilTrip > 30) {
      return finalPrice * 0.8;
    } else if (daysUntilTrip >= 15) {
      return finalPrice * 0.5;
    } else {
      return 0;
    }
  };

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
        throw new Error(data.error || "Failed to download confirmation");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Fishon-Booking-Confirmation-${bookingId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to download confirmation:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to download confirmation"
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
    // Calculate refund first
    const refund = calculateRefund();
    setEstimatedRefund(refund);

    if (requiresEmailVerification) {
      setVerificationAction("cancel");
      setShowEmailVerification(true);
    } else {
      // For logged-in owners, show refund preview first
      setShowRefundPreview(true);
    }
  };

  const handleEmailVerify = async (email: string) => {
    if (verificationAction === "download") {
      await handleDownloadReceipt(email);
    } else if (verificationAction === "cancel") {
      // Store verified email for later use in cancellation
      setVerifiedEmail(email);
      // After email verification, show refund preview
      setShowEmailVerification(false);
      setShowRefundPreview(true);
    }
  };

  const handleRefundPreviewContinue = () => {
    setShowRefundPreview(false);
    setShowCancelDialog(true);
  };

  return (
    <>
      <div className="p-3 space-y-3 bg-white border border-gray-200 rounded-lg sm:p-5">
        <h3 className="text-lg font-semibold text-gray-900">Actions</h3>

        {/* PAYMENT_AUTHORIZED or PAID: Contact Captain + Cancel */}
        {(status === "PAYMENT_AUTHORIZED" || status === "PAID") && (
          <>
            <div className="pb-3 mb-3 border-b border-gray-200">
              <p className="mb-3 text-sm font-medium text-gray-700">
                Contact {captainName || "Captain"}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {/* Call Button */}
                {captainPhone && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`tel:${captainPhone}`)}
                    className="flex-col h-auto py-3"
                  >
                    <Phone className="w-4 h-4 mb-1" />
                    <span className="text-xs">Call</span>
                  </Button>
                )}
                {/* Email Button */}
                {captainEmail && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`mailto:${captainEmail}`)}
                    className="flex-col h-auto py-3"
                  >
                    <Mail className="w-4 h-4 mb-1" />
                    <span className="text-xs">Email</span>
                  </Button>
                )}
                {/* Chat Button - Different for Guest vs Registered Users */}
                {isGuestUser ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      openModal("register", `/book/confirm?id=${bookingId}`);
                    }}
                    className="flex-col h-auto py-3"
                    title="Register to enable chat with captain"
                  >
                    <MessageCircle className="w-4 h-4 mb-1" />
                    <span className="text-xs">Register to Chat</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (conversationId) {
                        router.push(`/account/messages/${conversationId}`);
                      }
                    }}
                    disabled={!isChatAvailable}
                    className="flex-col h-auto py-3"
                    title={
                      !isChatAvailable
                        ? "Chat will be enabled after captain approval"
                        : "Chat with captain"
                    }
                  >
                    <MessageCircle className="w-4 h-4 mb-1" />
                    <span className="text-xs">Chat</span>
                  </Button>
                )}
              </div>
            </div>
          </>
        )}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {/* Pay Now button for AWAITING_PAYMENT - Manual Flow */}
          {status === "AWAITING_PAYMENT" && (
            <Button
              onClick={() => router.push(`/book/payment/${bookingId}`)}
              className="w-full col-span-3 text-white bg-green-600 hover:bg-green-700"
              size="lg"
            >
              Pay Now
            </Button>
          )}

          {/* Cancel button for PENDING, AWAITING_PAYMENT, PAYMENT_AUTHORIZED and PAID */}
          {(status === "PENDING" ||
            status === "AWAITING_PAYMENT" ||
            status === "PAYMENT_AUTHORIZED" ||
            status === "PAID") && (
            <CancelBookingButton
              bookingId={bookingId}
              fullWidth
              onCancel={handleCancelClick}
            />
          )}

          {/* CANCELLED: Book Again */}
          {status === "CANCELLED" && (
            <BookAgainButton charterId={charterId} fullWidth />
          )}

          {/* REJECTED: Book Again */}
          {status === "REJECTED" && (
            <BookAgainButton charterId={charterId} fullWidth />
          )}

          {/* COMPLETED: Download Confirmation + Book Again */}
          {status === "COMPLETED" && (
            <>
              <button
                onClick={handleDownloadClick}
                disabled={isDownloading}
                className="flex items-center justify-center w-full gap-2 px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {isDownloading ? "Downloading..." : "Download Confirmation"}
              </button>
              <BookAgainButton charterId={charterId} fullWidth />
            </>
          )}

          {/* PAID: Download Confirmation + Book Again */}
          {status === "PAID" && (
            <>
              <button
                onClick={handleDownloadClick}
                disabled={isDownloading}
                className="flex items-center justify-center w-full gap-2 px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {isDownloading ? "Downloading..." : "Download Confirmation"}
              </button>
              <BookAgainButton charterId={charterId} fullWidth />
            </>
          )}
        </div>
      </div>

      {/* Email Verification Modal */}
      <EmailVerificationModal
        isOpen={showEmailVerification}
        onClose={() => setShowEmailVerification(false)}
        onVerify={handleEmailVerify}
        action={verificationAction}
        bookingEmail={bookingEmail}
      />

      {/* Refund Preview Modal */}
      {showRefundPreview && (
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
                onClick={() => setShowRefundPreview(false)}
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
                Cancellation Refund
              </h3>

              {estimatedRefund > 0 ? (
                <>
                  <div className="p-4 mb-4 rounded-lg bg-green-50">
                    <p className="text-sm text-gray-700">
                      Estimated refund amount:
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      RM {estimatedRefund.toFixed(2)}
                    </p>
                  </div>

                  <div className="p-4 mb-4 border border-gray-200 rounded-lg">
                    <p className="mb-2 text-sm font-semibold text-gray-900">
                      Cancellation Policy:
                    </p>
                    <ul className="space-y-1 text-xs text-gray-600">
                      <li>• More than 30 days before trip: 80% refund</li>
                      <li>• 15-30 days before trip: 50% refund</li>
                      <li>• Less than 15 days before trip: No refund</li>
                    </ul>
                  </div>

                  <p className="mb-5 text-sm text-gray-700">
                    Refunds are typically processed within 5-7 business days.
                  </p>
                </>
              ) : (
                <>
                  <div className="p-4 mb-4 rounded-lg bg-amber-50">
                    <p className="text-sm font-semibold text-amber-800">
                      No refund available
                    </p>
                    <p className="mt-1 text-xs text-amber-700">
                      Your trip is less than 15 days away. According to our
                      cancellation policy, no refund is available for
                      cancellations within this period.
                    </p>
                  </div>

                  <div className="p-4 mb-4 border border-gray-200 rounded-lg">
                    <p className="mb-2 text-sm font-semibold text-gray-900">
                      Cancellation Policy:
                    </p>
                    <ul className="space-y-1 text-xs text-gray-600">
                      <li>• More than 30 days before trip: 80% refund</li>
                      <li>• 15-30 days before trip: 50% refund</li>
                      <li>• Less than 15 days before trip: No refund</li>
                    </ul>
                  </div>

                  <p className="mb-5 text-sm text-gray-700">
                    You can still cancel your booking, but no refund will be
                    issued.
                  </p>
                </>
              )}

              <div className="flex flex-row-reverse gap-2 mt-2">
                <button
                  className="px-4 py-2 text-sm rounded-lg bg-[#ec2227] text-white font-semibold hover:bg-[#d11f24] focus:outline-none focus:ring-2 focus:ring-[#ec2227]"
                  onClick={handleRefundPreviewContinue}
                >
                  Continue to Cancel
                </button>
                <button
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 focus:outline-none"
                  onClick={() => setShowRefundPreview(false)}
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
