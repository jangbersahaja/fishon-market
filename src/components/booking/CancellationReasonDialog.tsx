"use client";

import { useTranslations } from "next-intl";

interface CancellationReasonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedReason: string;
  setSelectedReason: (reason: string) => void;
  otherReason: string;
  setOtherReason: (reason: string) => void;
  commonReasons: string[];
  isSubmitting: boolean;
  error: string | null;
  getFinalReason: () => string;
}

/**
 * Shared cancellation reason dialog component
 * Used for both guest and authenticated booking cancellation flows
 */
export function CancellationReasonDialog({
  isOpen,
  onClose,
  onConfirm,
  selectedReason,
  setSelectedReason,
  otherReason,
  setOtherReason,
  commonReasons,
  isSubmitting,
  error,
  getFinalReason,
}: CancellationReasonDialogProps) {
  const t = useTranslations("booking.actions.cancellationDialog");
  const tReasons = useTranslations(
    "booking.actions.cancellationDialog.commonReasons"
  );

  if (!isOpen) return null;

  return (
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
            onClick={onClose}
            disabled={isSubmitting}
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

          <h3 className="mb-2 text-xl font-bold text-gray-900">{t("title")}</h3>
          <p className="mb-4 text-sm text-gray-700">
            {t("description")}{" "}
            <span className="font-medium text-[#ec2227]">
              {t("warningMessage")}
            </span>
          </p>

          <div className="mb-5">
            <label className="block mb-2 text-sm font-semibold text-gray-900">
              {t("reasonLabel")}
            </label>
            <fieldset>
              <legend className="sr-only">{t("reasonSelectPrompt")}</legend>
              <div className="flex flex-col gap-2">
                {commonReasons.map((reason) => {
                  // Map English reasons to translation keys
                  const reasonKeyMap: Record<string, string> = {
                    "Change of plans": "changeOfPlans",
                    "Found a better offer": "foundBetterOffer",
                    "Weather concerns": "weatherConcerns",
                    "Unable to travel": "unableToTravel",
                    "Captain unresponsive": "captainUnresponsive",
                    "Booking mistake": "bookingMistake",
                    "Personal reasons": "personalReasons",
                    Other: "other",
                  };

                  const translationKey = reasonKeyMap[reason] || "other";
                  const displayText =
                    translationKey === "other" && reason !== "Other"
                      ? reason // Show original text if not mapped
                      : tReasons(translationKey);

                  return (
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
                        disabled={isSubmitting}
                        className="accent-[#ec2227] focus:ring-2 focus:ring-[#ec2227]"
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {displayText}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {selectedReason === "Other" && (
              <input
                type="text"
                className="mt-3 w-full border-2 border-[#ec2227] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ec2227]"
                placeholder={t("otherPlaceholder")}
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                maxLength={120}
                disabled={isSubmitting}
                autoFocus
                aria-label={t("reasonLabel")}
              />
            )}
          </div>

          {error && (
            <div className="mb-3 text-sm font-medium text-red-600">{error}</div>
          )}

          <div className="flex flex-row-reverse gap-2 mt-2">
            <button
              className="px-4 py-2 text-sm rounded-lg bg-[#ec2227] text-white font-semibold hover:bg-[#d11f24] disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#ec2227]"
              onClick={onConfirm}
              disabled={isSubmitting || !getFinalReason()}
            >
              {isSubmitting ? t("cancelling") : t("confirmButton")}
            </button>
            <button
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 focus:outline-none"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t("cancelButton")}
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
  );
}
