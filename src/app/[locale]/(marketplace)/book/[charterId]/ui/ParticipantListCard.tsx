"use client";

import { Plus, Trash2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import type { BookingFormData } from "./types";

interface ParticipantListCardProps {
  register: UseFormRegister<BookingFormData>;
  errors: FieldErrors<BookingFormData>;
  watch: UseFormWatch<BookingFormData>;
  setValue: UseFormSetValue<BookingFormData>;
  guests: number;
}

export default function ParticipantListCard({
  register,
  errors,
  watch,
  setValue,
  guests,
}: ParticipantListCardProps) {
  const t = useTranslations("booking.checkout.participants");
  const participants = watch("participants") || [];
  const firstName = watch("firstName");
  const lastName = watch("lastName");
  const phone = watch("phone");
  const canAddMore = participants.length < guests;
  const participantCount = participants.length;

  // Auto-fill first participant with booker details when they change
  useEffect(() => {
    if (participants.length > 0 && participants[0].isBooker) {
      const bookerName = `${firstName} ${lastName}`.trim();
      if (
        participants[0].name !== bookerName ||
        participants[0].phone !== (phone || "")
      ) {
        const updated = [...participants];
        updated[0] = {
          ...updated[0],
          name: bookerName,
          phone: phone || "",
        };
        setValue("participants", updated);
      }
    }
  }, [firstName, lastName, phone, participants, setValue]);

  const addParticipant = () => {
    setValue("participants", [
      ...participants,
      { name: "", phone: "", isBooker: false },
    ]);
  };

  const removeParticipant = (index: number) => {
    const updated = participants.filter((_, i) => i !== index);
    setValue("participants", updated);
  };

  const toggleIsBooker = (index: number) => {
    const updated = participants.map((p, i) =>
      i === index
        ? {
            name: p.isBooker ? "" : `${firstName} ${lastName}`.trim(),
            phone: p.isBooker ? "" : phone || "",
            isBooker: !p.isBooker,
          }
        : p
    );
    setValue("participants", updated);
  };

  return (
    <section className="pt-5 border-t border-black/10">
      {/* Header with progress indicator */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-600" />
            <h2 className="text-base font-semibold sm:text-lg">{t("title")}</h2>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            {t("description", { guests })}
          </p>
        </div>
        {/* Progress pill */}
        <div
          className={`px-3 py-1 text-xs font-medium rounded-full ${
            participantCount >= guests
              ? "bg-green-100 text-green-700 border border-green-200"
              : participantCount > 0
                ? "bg-amber-100 text-amber-700 border border-amber-200"
                : "bg-gray-100 text-gray-600 border border-gray-200"
          }`}
        >
          {participantCount}/{guests}
        </div>
      </div>

      <div className="space-y-3">
        {participants.map((participant, index) => (
          <div
            key={index}
            className="p-3 border border-gray-200 rounded-lg bg-slate-50"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 text-xs font-medium text-white bg-gray-500 rounded-full">
                  {index + 1}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {index === 0
                    ? t("leadAngler")
                    : t("participantN", { number: index + 1 })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {index === 0 && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={participant.isBooker || false}
                      onChange={() => toggleIsBooker(index)}
                      className="w-4 h-4 text-[#ec2227] border-gray-300 rounded focus:ring-[#ec2227]"
                    />
                    <span className="text-gray-700">{t("thisIsMe")}</span>
                  </label>
                )}
                {participants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeParticipant(index)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove participant"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="block mb-2 font-medium text-slate-800">
                  {t("name")} <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  {...register(`participants.${index}.name`)}
                  placeholder={t("namePlaceholder")}
                  disabled={participant.isBooker}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent transition-shadow disabled:bg-gray-100 disabled:cursor-not-allowed ${
                    errors.participants?.[index]?.name
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                />
                {errors.participants?.[index]?.name && (
                  <span className="block mt-1 text-xs text-red-600">
                    {errors.participants[index]?.name?.message}
                  </span>
                )}
              </label>

              <label className="block text-sm">
                <span className="block mb-2 font-medium text-slate-800">
                  {t("phone")} <span className="text-red-500">*</span>
                </span>
                <input
                  type="tel"
                  {...register(`participants.${index}.phone`)}
                  placeholder={t("phonePlaceholder")}
                  disabled={participant.isBooker}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent transition-shadow disabled:bg-gray-100 disabled:cursor-not-allowed ${
                    errors.participants?.[index]?.phone
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                />
                {errors.participants?.[index]?.phone && (
                  <span className="block mt-1 text-xs text-red-600">
                    {errors.participants[index]?.phone?.message}
                  </span>
                )}
              </label>
            </div>
          </div>
        ))}

        {/* Array-level error */}
        {errors.participants?.message && (
          <div className="p-3 text-sm text-red-800 border border-red-200 rounded-lg bg-red-50">
            {errors.participants.message}
          </div>
        )}

        {/* Add participant button with remaining count */}
        {canAddMore && (
          <button
            type="button"
            onClick={addParticipant}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#ec2227] border-2 border-dashed border-[#ec2227]/40 rounded-lg hover:bg-[#ec2227]/5 hover:border-[#ec2227] transition-colors w-full justify-center"
          >
            <Plus className="w-4 h-4" />
            {t("addButton")}
            <span className="text-xs text-gray-500">
              ({guests - participantCount} {t("remaining")})
            </span>
          </button>
        )}

        {/* All participants added message */}
        {!canAddMore && participantCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg">
            <svg
              className="w-4 h-4"
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
            {t("allAdded")}
          </div>
        )}
      </div>
    </section>
  );
}
