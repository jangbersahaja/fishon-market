"use client";

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

interface StartConversationCardProps {
  captain?: Captain | null;
  charterName?: string;
  location?: string;
  species?: string[];
  techniques?: string[];
  register: UseFormRegister<BookingFormData>;
  errors: FieldErrors<BookingFormData>;
}

export default function StartConversationCard({
  captain,
  charterName,
  register,
  errors,
}: StartConversationCardProps) {
  const t = useTranslations("booking.checkout.startConversation");
  const displayName = captain?.name || charterName || "Your Captain";
  const captainFirstName = displayName.split(" ")[0];

  return (
    <section className="">
      <h2 className="mb-4 text-base font-semibold sm:text-lg">{t("title")}</h2>
      {/* Captain Profile */}
      <div className="flex items-start gap-4 ">
        <div className="relative flex-shrink-0 w-16 h-16 overflow-hidden rounded-full shadow-sm ring-2 ring-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={captain?.avatarUrl || "/images/captain.svg"}
            alt={displayName}
            className="object-cover w-full h-full"
          />
        </div>

        <div className="flex-1 min-w-0 ">
          <div className="mb-2">
            <h3 className="font-semibold text-gray-900">{displayName}</h3>

            {captain && (
              <p className="text-xs text-gray-600">
                {t("yearsExperience", { years: captain.yearsExperience })} •{" "}
                {t("crew", { count: captain.crewCount })}
              </p>
            )}
          </div>
          <p className="p-4 mb-4 text-sm border rounded-b-lg rounded-tr-lg bg-gradient-to-br from-blue-50/50 to-cyan-50/50 border-black/10">
            {t("greeting", { charterName: charterName || "this charter" })}
          </p>
        </div>
      </div>

      {/* Message Input */}
      <div>
        <label className="block text-slate-800">
          <textarea
            {...register("note")}
            placeholder={t("placeholder", { captainFirstName })}
            rows={4}
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
