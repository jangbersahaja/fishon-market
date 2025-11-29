"use client";

import { useAuthModal } from "@/components/auth/AuthModalContext";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import {
  Control,
  Controller,
  FieldErrors,
  UseFormRegister,
} from "react-hook-form";
import type { BookingFormData } from "./types";

interface YourDetailsCardProps {
  register: UseFormRegister<BookingFormData>;
  errors: FieldErrors<BookingFormData>;
  control: Control<BookingFormData>;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export default function YourDetailsCard({
  register,
  errors,
  control,
  firstName,
  lastName,
  email,
}: YourDetailsCardProps) {
  const t = useTranslations("booking.checkout.yourDetails");
  const { data: session } = useSession();
  const { openModal } = useAuthModal();
  const isLoggedIn = !!session?.user;

  // Check if details are prefilled from account
  const isPrefilled = isLoggedIn && (!!firstName || !!lastName || !!email);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold sm:text-lg">{t("title")}</h2>
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
            <span>{t("accountFilled")}</span>
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
              {t("signIn")}
            </button>{" "}
            {t("signInPrompt")}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Removed opacity-60 for disabled state */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="block mb-2 font-medium text-slate-800">
              {t("firstName")} <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              {...register("firstName")}
              placeholder={t("firstNamePlaceholder")}
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
              {t("lastName")} <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              {...register("lastName")}
              placeholder={t("lastNamePlaceholder")}
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
              {t("email")} <span className="text-red-500">*</span>
            </span>
            <input
              type="email"
              {...register("email")}
              placeholder={t("emailPlaceholder")}
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
              {t("phone")} <span className="text-red-500">*</span>
            </span>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <PhoneInput
                  value={field.value || ""}
                  onChange={field.onChange}
                  placeholder={t("phonePlaceholder")}
                  hasError={!!errors.phone}
                />
              )}
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
