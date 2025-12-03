"use client";

import { CancelBookingButton } from "@/components/account/BookingActionButtons";
import { useAuthModal } from "@/components/auth/AuthModalContext";
import { CancellationReasonDialog } from "@/components/booking/CancellationReasonDialog";
import { EmailVerificationModal } from "@/components/booking/EmailVerificationModal";
import { Button } from "@/components/ui/button";
import type { BookingStatus } from "@/lib/services/booking-service";
import { Download, Mail, MessageCircle, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
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
  locale: string;
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
  locale,
}: BookingActionsProps) {
  const router = useRouter();
  const { openModal } = useAuthModal();
  const t = useTranslations("booking.actions");
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
  // NEW POLICY: Customer cancellations are non-refundable by default
  // <7 days: Strictly non-refundable
  // 7+ days: Non-refundable (contact support for discretionary review - up to 50% at company's discretion)
  const calculateRefund = () => {
    // Customer cancellations are non-refundable by policy
    // Refunds may only be issued at company's discretion (handled via manual process)
    return 0;
  };

  // Calculate days until trip for policy display
  const getDaysUntilTrip = () => {
    if (!tripDate) return 0;
    const now = new Date();
    const trip = new Date(tripDate);
    return Math.ceil((trip.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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
          locale, // Pass current locale for translations
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
        <h3 className="text-lg font-semibold text-gray-900">{t("title")}</h3>

        {/* PAYMENT_AUTHORIZED or PAID: Contact Captain + Cancel */}
        {(status === "PAYMENT_AUTHORIZED" || status === "PAID") && (
          <>
            <div className="pb-3 mb-3 border-b border-gray-200">
              <p className="mb-3 text-sm font-medium text-gray-700">
                {t("contactCaptain", { captainName: captainName || "Captain" })}
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
                    <span className="text-xs">{t("call")}</span>
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
                    <span className="text-xs">{t("email")}</span>
                  </Button>
                )}
                {/* Chat Button - Different for Guest vs Registered Users */}
                {isGuestUser ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      openModal(
                        "register",
                        `/${locale}/book/confirm?id=${bookingId}`
                      );
                    }}
                    className="flex-col h-auto py-3"
                    title={t("chatDisabledTooltip")}
                  >
                    <MessageCircle className="w-4 h-4 mb-1" />
                    <span className="text-xs">{t("registerToChat")}</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (conversationId) {
                        router.push(
                          `/${locale}/account/messages/${conversationId}`
                        );
                      }
                    }}
                    disabled={!isChatAvailable}
                    className="flex-col h-auto py-3"
                    title={
                      !isChatAvailable
                        ? t("chatDisabledTooltip")
                        : t("chatEnabledTooltip")
                    }
                  >
                    <MessageCircle className="w-4 h-4 mb-1" />
                    <span className="text-xs">{t("chat")}</span>
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
              onClick={() =>
                router.push(`/${locale}/book/payment/${bookingId}`)
              }
              className="w-full col-span-3 text-white bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {t("payNow")}
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
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push(`/${locale}/charters/${charterId}`)}
            >
              {t("bookAgain")}
            </Button>
          )}

          {/* REJECTED: Book Again */}
          {status === "REJECTED" && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push(`/${locale}/charters/${charterId}`)}
            >
              {t("bookAgain")}
            </Button>
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
                {isDownloading ? t("downloading") : t("downloadConfirmation")}
              </button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/${locale}/charters/${charterId}`)}
              >
                {t("bookAgain")}
              </Button>
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
                {isDownloading ? t("downloading") : t("downloadConfirmation")}
              </button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/${locale}/charters/${charterId}`)}
              >
                {t("bookAgain")}
              </Button>
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
                {t("cancellationRefund.title")}
              </h3>

              {/* Customer cancellations are non-refundable by policy */}
              <div className="p-4 mb-4 rounded-lg bg-amber-50">
                <p className="text-sm font-semibold text-amber-800">
                  {t("cancellationRefund.noRefundTitle")}
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  {t("cancellationRefund.noRefundMessage")}
                </p>
              </div>

              <div className="p-4 mb-4 border border-gray-200 rounded-lg">
                <p className="mb-2 text-sm font-semibold text-gray-900">
                  {t("cancellationRefund.policyTitle")}
                </p>
                <ul className="space-y-1 text-xs text-gray-600">
                  <li>• {t("cancellationRefund.policyNonRefundable")}</li>
                  <li>• {t("cancellationRefund.policyDiscretionary")}</li>
                  <li>• {t("cancellationRefund.policyUnder7Days")}</li>
                </ul>
              </div>

              <p className="mb-5 text-sm text-gray-700">
                {t("cancellationRefund.stillCancelMessage")}
              </p>

              <div className="flex flex-row-reverse gap-2 mt-2">
                <button
                  className="px-4 py-2 text-sm rounded-lg bg-[#ec2227] text-white font-semibold hover:bg-[#d11f24] focus:outline-none focus:ring-2 focus:ring-[#ec2227]"
                  onClick={handleRefundPreviewContinue}
                >
                  {t("cancellationRefund.continueCancel")}
                </button>
                <button
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 focus:outline-none"
                  onClick={() => setShowRefundPreview(false)}
                >
                  {t("cancellationRefund.nevermind")}
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
      <CancellationReasonDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={() => handleCancelBooking(verifiedEmail)}
        selectedReason={selectedReason}
        setSelectedReason={setSelectedReason}
        otherReason={otherReason}
        setOtherReason={setOtherReason}
        commonReasons={commonReasons}
        isSubmitting={isCancelling}
        error={cancelError}
        getFinalReason={getFinalReason}
      />
    </>
  );
}
