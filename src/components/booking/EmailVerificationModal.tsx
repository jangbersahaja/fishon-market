"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle, Mail, ShieldCheck, X } from "lucide-react";
import { ChangeEvent, useEffect, useState } from "react";

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (email: string) => Promise<void>;
  action: "cancel" | "download" | "modify";
  bookingEmail: string;
}

export function EmailVerificationModal({
  isOpen,
  onClose,
  onVerify,
  action,
  bookingEmail,
}: EmailVerificationModalProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    setAttemptsRemaining(null);

    try {
      await onVerify(email);
      handleClose();
    } catch (err: any) {
      const errorData = err.response?.data || err;
      setError(errorData.error || "Verification failed");

      if (errorData.attemptsRemaining !== undefined) {
        setAttemptsRemaining(errorData.attemptsRemaining);
      }

      if (errorData.retryAfter) {
        setError(
          `Too many attempts. Please try again in ${errorData.retryAfter} minute(s).`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setError("");
    setAttemptsRemaining(null);
    onClose();
  };

  if (!isOpen) return null;

  const actionText = {
    cancel: "cancel this booking",
    download: "download the receipt",
    modify: "modify this booking",
  }[action];

  const maskedEmail =
    bookingEmail.length > 5
      ? `${bookingEmail.substring(0, 3)}***@${bookingEmail.split("@")[1]}`
      : "***";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md p-6 mx-4 bg-white rounded-lg shadow-xl">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute text-gray-400 top-4 right-4 hover:text-gray-600"
          disabled={loading}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Verify Your Email
            </h2>
          </div>
          <p className="text-sm text-gray-600">
            To {actionText}, please verify that you have access to the email
            address used for this booking.
          </p>
        </div>

        {/* Content */}
        <div className="mb-6 space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
              <input
                id="email"
                type="email"
                placeholder={`Enter email (e.g., ${maskedEmail})`}
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setEmail(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && email) {
                    handleVerify();
                  }
                }}
                className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-500">
              This must match the email used when creating the booking.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 border border-red-200 rounded-lg bg-red-50">
              <AlertCircle className="flex-shrink-0 w-4 h-4 text-red-600" />
              <div className="flex-1">
                <p className="text-sm text-red-800">{error}</p>
                {attemptsRemaining !== null && attemptsRemaining > 0 && (
                  <p className="mt-1 text-xs text-red-600">
                    {attemptsRemaining} attempt(s) remaining
                  </p>
                )}
              </div>
            </div>
          )}

          {attemptsRemaining === 0 && (
            <div className="p-3 border border-yellow-200 rounded-lg bg-yellow-50">
              <p className="text-sm text-yellow-800">
                <strong>Too many failed attempts.</strong> Please wait before
                trying again or contact support if you need help.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleVerify}
            disabled={!email || loading || attemptsRemaining === 0}
            className="flex-1 bg-[#ec2227] hover:bg-[#d11e22] text-white"
          >
            {loading ? "Verifying..." : "Verify & Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
