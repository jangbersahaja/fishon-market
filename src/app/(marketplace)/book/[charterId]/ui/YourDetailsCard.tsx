"use client";

import { useAuthModal } from "@/components/auth/AuthModalContext";
import { useSession } from "next-auth/react";
import { FieldErrors, UseFormRegister } from "react-hook-form";
import type { BookingFormData } from "./types";

interface YourDetailsCardProps {
  register: UseFormRegister<BookingFormData>;
  errors: FieldErrors<BookingFormData>;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export default function YourDetailsCard({
  register,
  errors,
  firstName,
  lastName,
  email,
}: YourDetailsCardProps) {
  const { data: session } = useSession();
  const { openModal } = useAuthModal();
  const isLoggedIn = !!session?.user;

  // Check if details are prefilled from account
  const isPrefilled = isLoggedIn && (!!firstName || !!lastName || !!email);

  return (
    <section className="pb-5 border-b border-black/10">
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
        <div className="p-3 mb-4 border border-blue-200 rounded-lg bg-blue-50">
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
              {...register("firstName")}
              placeholder="Your first name"
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 bg-slate-50 focus:ring-[#ec2227] focus:border-transparent transition-shadow ${
                errors.firstName ? "border-red-500" : "border-black/10"
              }`}
            />
            {errors.firstName && (
              <span className="block mt-1 text-xs text-red-600">
                {errors.firstName.message}
              </span>
            )}
          </label>

          <label className="block text-sm">
            <span className="block mb-2 font-medium text-slate-800">
              Last name <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              {...register("lastName")}
              placeholder="Your last name"
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 bg-slate-50 focus:ring-[#ec2227] focus:border-transparent transition-shadow ${
                errors.lastName ? "border-red-500" : "border-black/10"
              }`}
            />
            {errors.lastName && (
              <span className="block mt-1 text-xs text-red-600">
                {errors.lastName.message}
              </span>
            )}
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="block mb-2 font-medium text-slate-800">
              Email <span className="text-red-500">*</span>
            </span>
            <input
              type="email"
              {...register("email")}
              placeholder="you@example.com"
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 bg-slate-50 focus:ring-[#ec2227] focus:border-transparent transition-shadow ${
                errors.email ? "border-red-500" : "border-black/10"
              }`}
            />
            {errors.email && (
              <span className="block mt-1 text-xs text-red-600">
                {errors.email.message}
              </span>
            )}
          </label>

          <label className="block text-sm">
            <span className="block mb-2 font-medium text-slate-800">
              Phone number <span className="text-red-500">*</span>
            </span>
            <input
              type="tel"
              {...register("phone")}
              placeholder="+60 12-345 6789"
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 bg-slate-50 focus:ring-[#ec2227] focus:border-transparent transition-shadow ${
                errors.phone ? "border-red-500" : "border-black/10"
              }`}
            />
            {errors.phone && (
              <span className="block mt-1 text-xs text-red-600">
                {errors.phone.message}
              </span>
            )}
          </label>
        </div>
      </div>
    </section>
  );
}
