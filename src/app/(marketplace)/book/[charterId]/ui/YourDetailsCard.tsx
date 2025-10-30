"use client";

import { useAuthModal } from "@/components/auth/AuthModalContext";
import { useSession } from "next-auth/react";

interface YourDetailsCardProps {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
}

export default function YourDetailsCard({
  firstName,
  lastName,
  email,
  phone,
  onFirstNameChange,
  onLastNameChange,
  onEmailChange,
  onPhoneChange,
}: YourDetailsCardProps) {
  const { data: session } = useSession();
  const { openModal } = useAuthModal();
  const isLoggedIn = !!session?.user;

  // Check if details are prefilled from account
  const isPrefilled = isLoggedIn && (!!firstName || !!lastName || !!email);

  return (
    <section className="p-5 bg-white border rounded-2xl border-black/10 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold sm:text-lg">Your Details</h2>
        {isPrefilled && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>Account details filled</span>
          </div>
        )}
      </div>

      {!isLoggedIn && (
        <div className="p-3 mb-4 border rounded-lg bg-blue-50 border-blue-200">
          <div className="text-sm text-blue-800">
            <button
              type="button"
              onClick={() => openModal("signin")}
              className="font-semibold cursor-pointer hover:underline text-[#ec2227]"
            >
              Sign in
            </button>{" "}
            to autofill your details and track your bookings, or continue as a
            guest.
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Removed opacity-60 for disabled state */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="block mb-2 font-medium text-slate-800">
              First name <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              value={firstName}
              onChange={(e) => onFirstNameChange(e.target.value)}
              placeholder="Your first name"
              required
              className="w-full px-4 py-2.5 border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent transition-shadow"
            />
          </label>

          <label className="block text-sm">
            <span className="block mb-2 font-medium text-slate-800">
              Last name <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              value={lastName}
              onChange={(e) => onLastNameChange(e.target.value)}
              placeholder="Your last name"
              required
              className="w-full px-4 py-2.5 border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent transition-shadow"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="block mb-2 font-medium text-slate-800">
              Email <span className="text-red-500">*</span>
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-2.5 border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent transition-shadow"
            />
          </label>

          <label className="block text-sm">
            <span className="block mb-2 font-medium text-slate-800">
              Phone number
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder="+60 12-345 6789"
              className="w-full px-4 py-2.5 border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent transition-shadow"
            />
          </label>
        </div>
      </div>
    </section>
  );
}
