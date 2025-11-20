"use client";

import PasswordInput from "@/components/ui/PasswordInput";
import { feedbackTokens } from "@/config/designTokens";
import { validatePassword } from "@/lib/auth/password";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "verify" | "reset">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [codeSentTime, setCodeSentTime] = useState<number | null>(null);
  const [timer, setTimer] = useState(0);

  // Password validation
  const passwordValidation = useMemo(() => {
    if (!newPassword) return null;
    return validatePassword(newPassword);
  }, [newPassword]);

  // Timer countdown for resend
  useEffect(() => {
    if (!codeSentTime) {
      setTimer(0);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - codeSentTime) / 1000);
      const remaining = Math.max(0, 60 - elapsed);
      setTimer(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [codeSentTime]);

  // Step 1: Send reset code
  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send code");
      }

      const data = await res.json();
      setCodeSentTime(data.sentAt || Date.now());
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Verify code and show password reset form
  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (code.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    setStep("reset");
  }

  // Step 3: Reset password
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validation
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      setError(validation.errors[0] || "Password does not meet requirements");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password: newPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reset password");
      }

      setSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/home?signin=true");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-green-200 bg-white p-8 shadow-lg text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-16 w-16 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Password Reset Successfully!
          </h1>
          <p className="text-slate-600 mb-4">
            Your password has been updated. You can now sign in with your new
            password.
          </p>
          <p className="text-sm text-slate-500">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Reset Password
          </h1>
          <p className="text-sm text-slate-600">
            {step === "email" && "Enter your email to receive a reset code"}
            {step === "verify" && "Enter the code sent to your email"}
            {step === "reset" && "Create a new password"}
          </p>
        </div>

        {/* Step 1: Email Input */}
        {step === "email" && (
          <form onSubmit={handleSendCode} className="space-y-4">
            {error && (
              <div
                className={`rounded-md px-3 py-2 text-xs ${feedbackTokens.error.subtle}`}
              >
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-[#ec2227] focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full rounded-xl bg-[#ec2227] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#c81e23] disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send Reset Code"}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push("/home")}
                className="text-xs text-slate-500 hover:text-[#ec2227] transition-colors underline"
              >
                Back to sign in
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Verify Code */}
        {step === "verify" && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            {error && (
              <div
                className={`rounded-md px-3 py-2 text-xs ${feedbackTokens.error.subtle}`}
              >
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                Verification Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="Enter 6-digit code"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-center tracking-widest shadow-inner focus:border-[#ec2227] focus:outline-none"
                maxLength={6}
                required
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Check your email ({email}) for the code
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full rounded-xl bg-[#ec2227] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#c81e23] disabled:opacity-60"
            >
              Verify Code
            </button>

            {/* Resend code */}
            <div className="text-center space-y-1">
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                }}
                className="text-xs text-slate-500 hover:text-[#ec2227] transition-colors underline"
              >
                Use different email
              </button>
              <div>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={loading || timer > 0}
                  className="text-xs text-slate-500 hover:text-[#ec2227] transition-colors underline disabled:opacity-50 disabled:no-underline"
                >
                  {timer > 0 ? `Resend code in ${timer}s` : "Resend code"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Step 3: New Password */}
        {step === "reset" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {error && (
              <div
                className={`rounded-md px-3 py-2 text-xs ${feedbackTokens.error.subtle}`}
              >
                {error}
              </div>
            )}

            {/* New Password */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                New Password
              </label>
              <PasswordInput
                value={newPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewPassword(e.target.value)
                }
                required
              />
              {newPassword && passwordValidation && (
                <div className="mt-2 space-y-1">
                  {passwordValidation.errors.length > 0 ? (
                    <div className="space-y-0.5">
                      {passwordValidation.errors.map((err, idx) => (
                        <p
                          key={idx}
                          className="text-[10px] text-red-600 flex items-center gap-1"
                        >
                          <span>✗</span> {err}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-green-600 flex items-center gap-1">
                      <span>✓</span> Strong password
                    </p>
                  )}
                  <div className="flex gap-1 mt-1">
                    {["weak", "medium", "strong", "very-strong"].map(
                      (level, idx) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition ${
                            passwordValidation.strength === "weak" && idx === 0
                              ? "bg-red-500"
                              : passwordValidation.strength === "medium" &&
                                idx <= 1
                              ? "bg-amber-500"
                              : passwordValidation.strength === "strong" &&
                                idx <= 2
                              ? "bg-blue-500"
                              : passwordValidation.strength === "very-strong"
                              ? "bg-green-500"
                              : "bg-slate-200"
                          }`}
                        />
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                Confirm New Password
              </label>
              <PasswordInput
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setConfirmPassword(e.target.value)
                }
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
              className="w-full rounded-xl bg-[#ec2227] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#c81e23] disabled:opacity-60"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
