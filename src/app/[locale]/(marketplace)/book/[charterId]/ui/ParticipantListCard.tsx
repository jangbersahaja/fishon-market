"use client";

import { Plus, Trash2, User } from "lucide-react";
import {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import type { BookingFormData } from "./types";

interface Participant {
  name: string;
  phone: string;
  isBooker?: boolean;
}

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
  const participants = watch("participants") || [];
  const firstName = watch("firstName");
  const lastName = watch("lastName");
  const phone = watch("phone");
  const canAddMore = participants.length < guests;

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
    <section className="">
      <div className="mb-4">
        <h2 className="text-base font-semibold sm:text-lg">Participant List</h2>
        <p className="mt-1 text-sm text-gray-600">
          Add all participants for this trip (maximum {guests} based on your
          guest selection). At least one participant is required.
        </p>
      </div>

      <div className="space-y-4">
        {participants.map((participant, index) => (
          <div
            key={index}
            className="p-3 border border-gray-200 rounded-lg bg-slate-50"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  Participant {index + 1}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {index === 0 && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      checked={participant.isBooker || false}
                      onChange={() => toggleIsBooker(index)}
                      className="w-4 h-4 text-[#ec2227] border-gray-300 rounded focus:ring-[#ec2227]"
                    />
                    <span className="text-gray-700">This is me</span>
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
                  Name <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  {...register(`participants.${index}.name`)}
                  placeholder="Participant name"
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
                  Phone <span className="text-red-500">*</span>
                </span>
                <input
                  type="tel"
                  {...register(`participants.${index}.phone`)}
                  placeholder="+60 12-345 6789"
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

        {canAddMore && (
          <button
            type="button"
            onClick={addParticipant}
            disabled={!canAddMore}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#ec2227] border-2 border-[#ec2227] rounded-lg hover:bg-[#ec2227] hover:text-white transition-colors disabled:opacity-50 bg-slate-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#ec2227]"
          >
            <Plus className="w-4 h-4" />
            Add Participant
            {!canAddMore && (
              <span className="text-xs text-gray-500">
                ({participants.length}/{guests} max)
              </span>
            )}
          </button>
        )}
      </div>
    </section>
  );
}
