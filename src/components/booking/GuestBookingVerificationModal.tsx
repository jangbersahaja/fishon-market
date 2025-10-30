"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Mail } from "lucide-react";
import { useEffect, useState } from "react";

interface GuestBookingVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (token: string) => void;
  email: string;
  firstName: string;
}

export function GuestBookingVerificationModal({
  isOpen,
  onClose,
  onVerified,
  email,
  firstName,
}: GuestBookingVerificationModalProps) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep("email");
      setCode("");
      setError(null);
      setResendCooldown(0);
    }
  }, [isOpen]);

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  async function handleSendCode() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/bookings/verify-guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send verification code");
      }

      setStep("code");
      setResendCooldown(60); // 60 second cooldown
    } catch (err: any) {
      setError(err.message || "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    if (code.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/bookings/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Invalid verification code");
      }

      // Success! Pass token to parent
      onVerified(data.token);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to verify code");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (resendCooldown > 0) return;
    setCode("");
    setError(null);
    await handleSendCode();
  }

  function handleCodeChange(value: string) {
    // Only allow digits, max 6 characters
    const cleaned = value.replace(/\D/g, "").slice(0, 6);
    setCode(cleaned);
    setError(null);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {step === "email" ? "Verify Your Email" : "Enter Verification Code"}
          </DialogTitle>
          <DialogDescription>
            {step === "email"
              ? "We'll send a verification code to your email to complete your booking."
              : "Enter the 6-digit code sent to your email."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Error Display */}
          {error && (
            <div className="flex items-start gap-2 p-3 text-sm text-red-800 border border-red-200 rounded-lg bg-red-50">
              <AlertCircle className="flex-shrink-0 w-5 h-5 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Step 1: Send Code */}
          {step === "email" && (
            <div className="space-y-4">
              <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                <div className="flex items-start gap-3">
                  <Mail className="flex-shrink-0 w-5 h-5 mt-0.5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Email Address
                    </p>
                    <p className="mt-1 text-sm text-blue-700">{email}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-2 border rounded-lg bg-gray-50">
                <p className="text-sm font-medium text-gray-900">
                  What happens next?
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>We&apos;ll send a 6-digit code to your email</li>
                  <li>Enter the code to verify your email address</li>
                  <li>
                    You&apos;ll receive a booking confirmation once approved
                  </li>
                </ul>
              </div>

              <Button
                onClick={handleSendCode}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? "Sending Code..." : "Send Verification Code"}
              </Button>
            </div>
          )}

          {/* Step 2: Enter Code */}
          {step === "code" && (
            <div className="space-y-4">
              <div className="p-3 border border-green-200 rounded-lg bg-green-50">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="flex-shrink-0 w-5 h-5 mt-0.5 text-green-600" />
                  <div>
                    <p className="text-sm text-green-800">
                      A verification code has been sent to{" "}
                      <strong>{email}</strong>
                    </p>
                    <p className="mt-1 text-xs text-green-700">
                      Please check your inbox and spam folder
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="verification-code" className="text-sm">
                  Verification Code
                </Label>
                <Input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  className="font-mono text-2xl tracking-widest text-center"
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                />
                <p className="text-xs text-gray-500">
                  Enter the 6-digit code from your email
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleVerifyCode}
                  disabled={code.length !== 6 || loading}
                  className="flex-1"
                  size="lg"
                >
                  {loading ? "Verifying..." : "Verify & Continue"}
                </Button>
              </div>

              {/* Resend Code */}
              <div className="pt-2 text-center border-t">
                <p className="text-sm text-gray-600">
                  Didn&apos;t receive the code?{" "}
                  {resendCooldown > 0 ? (
                    <span className="text-gray-400">
                      Resend in {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      onClick={handleResendCode}
                      className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                      disabled={loading}
                    >
                      Resend Code
                    </button>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
