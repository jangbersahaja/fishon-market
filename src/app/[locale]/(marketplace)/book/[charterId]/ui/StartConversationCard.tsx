"use client";

import { MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { FieldErrors, UseFormRegister } from "react-hook-form";
import type { BookingFormData } from "./types";

interface Captain {
  name: string;
  avatarUrl?: string;
  yearsExperience: number;
  crewCount: number;
  intro?: string;
}

interface NoteToCaptainCardProps {
  captain?: Captain | null;
  charterName?: string;
  register: UseFormRegister<BookingFormData>;
  errors: FieldErrors<BookingFormData>;
}

export default function NoteToCaptainCard({
  captain,
  charterName,
  register,
  errors,
}: NoteToCaptainCardProps) {
  const t = useTranslations("booking.checkout.noteToCaptain");
  const displayName = captain?.name || charterName || "Your Captain";

  return (
    <section className="pb-5 border-b border-black/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-gray-600" />
          <h2 className="text-base font-semibold sm:text-lg">{t("title")}</h2>
        </div>
        <span className="text-xs text-gray-500">{t("optional")}</span>
      </div>

      {/* Captain Profile - Compact */}
      <div className="flex items-center gap-3 p-3 mb-4 border rounded-lg bg-slate-50 border-black/10">
        <div className="relative flex-shrink-0 w-10 h-10 overflow-hidden rounded-full shadow-sm ring-2 ring-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={captain?.avatarUrl || "/images/captain.svg"}
            alt={displayName}
            className="object-cover w-full h-full"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">{displayName}</h3>
          {captain && (
            <p className="text-xs text-gray-600">
              {t("yearsExperience", { years: captain.yearsExperience })} •{" "}
              {t("crew", { count: captain.crewCount })}
            </p>
          )}
        </div>
      </div>

      {/* Message Input */}
      <div>
        <label className="block text-slate-800">
          <textarea
            {...register("note")}
            placeholder={t("placeholder")}
            rows={3}
            className={`w-full bg-slate-50 px-4 py-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent transition-shadow ${
              errors.note ? "border-red-500" : "border-black/10"
            }`}
          />
        </label>
        {errors.note && (
          <p className="mt-1 text-xs text-red-500">{errors.note.message}</p>
        )}
        <p className="mt-2 text-xs text-gray-500">{t("note")}</p>
      </div>
    </section>
  );
}
