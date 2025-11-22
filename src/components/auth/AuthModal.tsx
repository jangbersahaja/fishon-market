"use client";
import PasswordInput from "@/components/ui/PasswordInput";
import { feedbackTokens } from "@/config/designTokens";
import { validatePassword } from "@/lib/auth/password";
import { signIn } from "next-auth/react";
import { useLocale } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useAuthModal } from "./AuthModalContext";

type OAuthProviderInfo = {
  id: string;
  name: string;
  configured: boolean;
};

const formatProviderList = (names: string[], fallback: string) => {
  if (names.length === 0) return fallback;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} or ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, or ${names[names.length - 1]}`;
};

const providerIcon = (id: string) => {
  switch (id) {
    case "google":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 488 512"
          className="h-4 w-4"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
          />
        </svg>
      );
    case "facebook":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 320 512"
          className="h-4 w-4"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.2 44.38-121.2 124.72v70.62H22.89V288h81.27v224h100.2V288z"
          />
        </svg>
      );
    case "apple":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 384 512"
          className="h-4 w-4"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M318.7 268c-.2-36 16.3-63.5 49.6-83.7-18.6-26.9-46.7-41.7-84.7-44.4-35.5-2.7-74.2 20.7-88.4 20.7-14.5 0-48.1-19.7-74.4-19.7-54.3.9-112 35.2-112 105.7 0 25.1 4.6 51 15.4 75.9 13.7 32.1 63.1 110.6 114.5 109 27-.6 46.1-19.2 81.2-19.2 34.6 0 52.9 19.2 74.4 19.2 51.4-.8 96.2-72 109.9-104.1-69.6-33.1-60.8-96.2-59.5-99.4zM256.4 79.6c26.3-31.4 23.9-60 23-70.6-22.3 1.3-48.1 15.1-62.7 32.3-13.7 15.8-25.9 40.9-22.6 65 24.6 1.9 49.6-12.3 62.3-26.7z"
          />
        </svg>
      );
    default:
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="h-4 w-4"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8z"
          />
        </svg>
      );
  }
};

const providerThemes: Record<string, { button: string; icon: string }> = {
  google: {
    button:
      "bg-white text-slate-800 border border-slate-200 hover:border-[#ec2227] hover:shadow-md",
    icon: "bg-[#4285F4]/10 text-[#4285F4]",
  },
  facebook: {
    button: "bg-[#1877F2] text-white hover:bg-[#0f5ad7]",
    icon: "bg-white/20 text-white",
  },
  apple: {
    button: "bg-black text-white hover:bg-neutral-900",
    icon: "bg-white/10 text-white",
  },
  default: {
    button: "bg-[#ec2227] text-white hover:bg-[#c81e23]",
    icon: "bg-white/15 text-white",
  },
};

const baseButtonClass =
  "group relative flex w-full items-center justify-start gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ec2227] disabled:cursor-not-allowed disabled:opacity-60";

export default function AuthModal() {
  const { isOpen, defaultTab, next, showHomeButton, closeModal } =
    useAuthModal();
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<"signin" | "register">("signin");

  // Google OAuth is always configured in fishon-market
  const oauthProviders: OAuthProviderInfo[] = [
    { id: "google", name: "Google", configured: true },
  ];

  // Sync activeTab with defaultTab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={showHomeButton ? undefined : closeModal}
    >
      <div
        className="relative w-full max-w-md rounded-3xl border border-[#ec2227]/20 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close/Home button */}
        {showHomeButton ? (
          <a
            href={`/${locale}/home`}
            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition"
            aria-label="Go to home"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </a>
        ) : (
          <button
            onClick={closeModal}
            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition"
            aria-label="Close"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        {/* Header with tabs */}
        <div className="border-b border-slate-100 px-6 pt-6 pb-4">
          <div className="flex gap-6">
            <button
              type="button"
              onClick={() => setActiveTab("signin")}
              className={`pb-2 text-sm font-semibold transition border-b-2 ${
                activeTab === "signin"
                  ? "border-[#ec2227] text-[#ec2227]"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("register")}
              className={`pb-2 text-sm font-semibold transition border-b-2 ${
                activeTab === "register"
                  ? "border-[#ec2227] text-[#ec2227]"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* Form content */}
        <div className="px-6 py-6">
          {activeTab === "signin" ? (
            <SignInForm
              next={next}
              oauthProviders={oauthProviders}
              onSwitchToSignUp={() => setActiveTab("register")}
              locale={locale}
            />
          ) : (
            <SignUpForm next={next} oauthProviders={oauthProviders} />
          )}
        </div>
      </div>
    </div>
  );
}

// ===== SIGN IN FORM =====
function SignInForm({
  next,
  oauthProviders,
  onSwitchToSignUp,
  locale,
}: {
  next: string | undefined;
  oauthProviders: OAuthProviderInfo[];
  onSwitchToSignUp: () => void;
  locale: string;
}) {
  const [step, setStep] = useState<"email" | "auth">("email");
  const [authMode, setAuthMode] = useState<"password" | "tac">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tacCode, setTacCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthOnly, setOauthOnly] = useState(false);
  const [tacSentTime, setTacSentTime] = useState<number | null>(null);
  const [tacTimer, setTacTimer] = useState(0);

  // TAC timer countdown
  useEffect(() => {
    if (!tacSentTime) {
      setTacTimer(0);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - tacSentTime) / 1000);
      const remaining = Math.max(0, 60 - elapsed);
      setTacTimer(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [tacSentTime]);

  const configuredProviderNames = oauthProviders
    .filter((provider) => provider.configured)
    .map((provider) => provider.name);

  const activeProviderNames = formatProviderList(
    configuredProviderNames,
    "social sign-in"
  );

  const handleOAuthClick = (provider: OAuthProviderInfo) => {
    if (!provider.configured) return;
    // Use current page if no explicit next URL provided
    const callbackUrl =
      next || window.location.pathname + window.location.search;
    void signIn(provider.id, { callbackUrl });
  };

  // Step 1: Check if email exists
  async function handleEmailContinue(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(
        `/api/auth/account-type?email=${encodeURIComponent(email)}`
      );

      if (!res.ok) {
        setError("Failed to verify email. Please try again.");
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (!data.exists) {
        // Account doesn't exist - switch to sign up
        setLoading(false);
        onSwitchToSignUp();
        return;
      }

      if (data.oauthOnly) {
        // OAuth-only account
        setOauthOnly(true);
        setError(
          `This email is registered via ${activeProviderNames}. Use the buttons above.`
        );
        setLoading(false);
        return;
      }

      // Account exists with password - proceed to auth step
      setStep("auth");
      setLoading(false);
    } catch {
      setError("Failed to verify email. Please try again.");
      setLoading(false);
    }
  }

  // Send TAC
  async function handleSendTAC() {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/send-tac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send code");
      }

      const data = await res.json();
      setTacSentTime(data.sentAt || Date.now());
      setAuthMode("tac");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  }

  // Step 2a: Sign in with password
  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Use current page if no explicit next URL provided
    const callbackUrl =
      next || window.location.pathname + window.location.search;

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl,
    });

    setLoading(false);

    if (res?.error) {
      setError("Incorrect password. Please try again.");
      return;
    }

    window.location.href = res?.url || callbackUrl;
  }

  // Step 2b: Sign in with TAC
  async function handleTACSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Verify TAC code first
      const verifyRes = await fetch("/api/auth/verify-tac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: tacCode }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        throw new Error(data.error || "Invalid code");
      }

      // TAC verified, now sign in using the TAC code as password
      // The credentials provider will validate it via validateTac
      // Use current page if no explicit next URL provided
      const callbackUrl =
        next || window.location.pathname + window.location.search;

      const signInRes = await signIn("credentials", {
        redirect: false,
        email,
        password: tacCode,
        callbackUrl,
      });

      if (signInRes?.error) {
        setError("Authentication failed. Please try again.");
        setLoading(false);
        return;
      }

      window.location.href = signInRes?.url || callbackUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify code");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* OAuth buttons */}
      <div className="space-y-2">
        {oauthProviders.map((provider) => {
          const theme = providerThemes[provider.id] ?? providerThemes.default;
          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => handleOAuthClick(provider)}
              disabled={!provider.configured}
              title={
                provider.configured
                  ? undefined
                  : `${provider.name} login is not configured yet.`
              }
              aria-disabled={!provider.configured}
              className={`${baseButtonClass} ${theme.button}`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full ${theme.icon}`}
              >
                {providerIcon(provider.id)}
              </span>
              <span className="flex-1 text-left">
                {provider.configured
                  ? `Continue with ${provider.name}`
                  : `${provider.name} (coming soon)`}
              </span>
            </button>
          );
        })}
      </div>

      {oauthOnly && (
        <div className="rounded-2xl border border-[#ec2227]/20 bg-[#ec2227]/5 px-4 py-3 text-xs font-medium text-[#b3171b]">
          This email was created with {activeProviderNames}. Use the buttons
          above to continue.
        </div>
      )}

      <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        <span>Or use email</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      {/* Step 1: Email input */}
      {step === "email" && (
        <form
          onSubmit={handleEmailContinue}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          {error && (
            <div
              className={`rounded-md px-3 py-2 text-xs ${feedbackTokens.error.subtle}`}
            >
              {error}
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Email</label>
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
            {loading ? "Checking…" : "Continue with Email"}
          </button>
        </form>
      )}

      {/* Step 2: Password or TAC input */}
      {step === "auth" && (
        <form
          onSubmit={
            authMode === "password" ? handlePasswordSignIn : handleTACSignIn
          }
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          {error && (
            <div
              className={`rounded-md px-3 py-2 text-xs ${feedbackTokens.error.subtle}`}
            >
              {error}
            </div>
          )}

          {/* Show email (read-only) */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Email</label>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={email}
                readOnly
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
              />
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setAuthMode("password");
                  setTacSentTime(null);
                }}
                className="text-xs text-slate-500 hover:text-[#ec2227] transition-colors"
              >
                Change
              </button>
            </div>
          </div>

          {authMode === "password" ? (
            <>
              {/* Password input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-600">
                    Password
                  </label>
                  <a
                    href={`/${locale}/forgot-password`}
                    className="text-[10px] text-slate-500 hover:text-[#ec2227] transition-colors"
                  >
                    Forgot password?
                  </a>
                </div>
                <PasswordInput
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPassword(e.target.value)
                  }
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || !password}
                className="w-full rounded-xl bg-[#ec2227] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#c81e23] disabled:opacity-60"
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>

              {/* Option to use TAC instead */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleSendTAC}
                  disabled={loading}
                  className="text-xs text-slate-500 hover:text-[#ec2227] transition-colors underline"
                >
                  Or sign in with a code sent to your email
                </button>
              </div>
            </>
          ) : (
            <>
              {/* TAC input */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={tacCode}
                  onChange={(e) =>
                    setTacCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="Enter 6-digit code"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-center tracking-widest shadow-inner focus:border-[#ec2227] focus:outline-none"
                  maxLength={6}
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Check your email for the verification code
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || tacCode.length !== 6}
                className="w-full rounded-xl bg-[#ec2227] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#c81e23] disabled:opacity-60"
              >
                {loading ? "Verifying…" : "Verify Code"}
              </button>

              {/* Resend code */}
              <div className="text-center space-y-1">
                <button
                  type="button"
                  onClick={handleSendTAC}
                  disabled={loading || tacTimer > 0}
                  className="text-xs text-slate-500 hover:text-[#ec2227] transition-colors underline disabled:opacity-50 disabled:no-underline"
                >
                  {tacTimer > 0 ? `Resend code in ${tacTimer}s` : "Resend code"}
                </button>
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("password");
                      setTacSentTime(null);
                      setTacCode("");
                    }}
                    className="text-xs text-slate-500 hover:text-[#ec2227] transition-colors underline"
                  >
                    Use password instead
                  </button>
                </div>
              </div>
            </>
          )}
        </form>
      )}
    </div>
  );
}

// ===== SIGN UP FORM =====
function SignUpForm({
  next,
  oauthProviders,
}: {
  next: string | undefined;
  oauthProviders: OAuthProviderInfo[];
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+60");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Real-time password validation
  const passwordValidation = useMemo(() => {
    if (!password) return null;
    return validatePassword(password);
  }, [password]);

  const handleOAuthClick = (provider: OAuthProviderInfo) => {
    if (!provider.configured) return;
    // Use current page if no explicit next URL provided
    const callbackUrl =
      next || window.location.pathname + window.location.search;
    void signIn(provider.id, { callbackUrl });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validation
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const validation = validatePassword(password);
    if (!validation.valid) {
      setError(validation.errors[0] || "Password does not meet requirements");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${firstName} ${lastName}`.trim(),
          email,
          phone: phone ? `${countryCode}${phone}` : undefined,
          password,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Registration failed");
      }

      // Auto sign in after successful registration
      // Use current page if no explicit next URL provided
      const callbackUrl =
        next || window.location.pathname + window.location.search;

      const signInRes = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl,
      });

      if (signInRes?.error) {
        setError(
          "Registration successful, but auto-login failed. Please sign in manually."
        );
        return;
      }

      window.location.href = signInRes?.url || callbackUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* OAuth buttons */}
      <div className="space-y-2">
        {oauthProviders.map((provider) => {
          const theme = providerThemes[provider.id] ?? providerThemes.default;
          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => handleOAuthClick(provider)}
              disabled={!provider.configured}
              title={
                provider.configured
                  ? undefined
                  : `${provider.name} login is not configured yet.`
              }
              aria-disabled={!provider.configured}
              className={`${baseButtonClass} ${theme.button}`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full ${theme.icon}`}
              >
                {providerIcon(provider.id)}
              </span>
              <span className="flex-1 text-left">
                {provider.configured
                  ? `Continue with ${provider.name}`
                  : `${provider.name} (coming soon)`}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        <span>Or use email</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      {/* Form fields */}
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {error && (
          <div
            className={`rounded-md px-3 py-2 text-xs ${feedbackTokens.error.subtle}`}
          >
            {error}
          </div>
        )}

        {/* Name fields - grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-[#ec2227] focus:outline-none"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-[#ec2227] focus:outline-none"
              required
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-[#ec2227] focus:outline-none"
            required
          />
        </div>

        {/* Phone (optional) */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">
            Phone Number <span className="text-slate-400">(optional)</span>
          </label>
          <div className="flex gap-2">
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="w-24 rounded-lg border border-slate-200 px-2 py-2 text-sm shadow-inner focus:border-[#ec2227] focus:outline-none"
            >
              <option value="+60">🇲🇾 +60</option>
              <option value="+65">🇸🇬 +65</option>
              <option value="+62">🇮🇩 +62</option>
              <option value="+66">🇹🇭 +66</option>
              <option value="+1">🇺🇸 +1</option>
              <option value="+44">🇬🇧 +44</option>
            </select>
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setPhone(val);
              }}
              placeholder="123456789"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-[#ec2227] focus:outline-none"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Password</label>
          <PasswordInput
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPassword(e.target.value)
            }
            required
          />
          {password && passwordValidation && (
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
                          : passwordValidation.strength === "medium" && idx <= 1
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
            Confirm Password
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
          disabled={loading || !email || !password || !firstName || !lastName}
          className="w-full rounded-xl bg-[#ec2227] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#c81e23] disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Sign Up"}
        </button>
      </div>
    </form>
  );
}
