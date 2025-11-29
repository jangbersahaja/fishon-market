"use client";

import { PhoneInput } from "@/components/shared/PhoneInput";
import { RelationshipSelect } from "@/components/shared/RelationshipSelect";
import { Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Control,
  Controller,
  FieldErrors,
  UseFormRegister,
} from "react-hook-form";
import type { BookingFormData } from "./types";

interface EmergencyContactCardProps {
  register: UseFormRegister<BookingFormData>;
  errors: FieldErrors<BookingFormData>;
  control: Control<BookingFormData>;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
}

export default function EmergencyContactCard({
  register,
  errors,
  control,
}: EmergencyContactCardProps) {
  const t = useTranslations("booking.checkout.emergencyContact");

  return (
    <section className="pb-5 border-b border-black/10">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-gray-600" />
          <h2 className="text-base font-semibold sm:text-lg">{t("title")}</h2>
        </div>
        <p className="mt-1 text-sm text-gray-600">{t("description")}</p>
      </div>

      <div className="space-y-4">
        <label className="block text-sm">
          <span className="block mb-2 font-medium text-slate-800">
            {t("contactName")}
          </span>
          <input
            type="text"
            {...register("emergencyName")}
            placeholder={t("namePlaceholder")}
            className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none bg-slate-50 focus:ring-2 focus:ring-[#ec2227] focus:border-transparent transition-shadow ${
              errors.emergencyName ? "border-red-500" : "border-black/10"
            }`}
          />
          {errors.emergencyName && (
            <span className="block mt-1 text-xs text-red-600">
              {errors.emergencyName.message}
            </span>
          )}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="block mb-2 font-medium text-slate-800">
              {t("contactPhone")}
            </span>
            <Controller
              name="emergencyPhone"
              control={control}
              render={({ field }) => (
                <PhoneInput
                  value={field.value || ""}
                  onChange={field.onChange}
                  placeholder={t("phonePlaceholder")}
                  hasError={!!errors.emergencyPhone}
                />
              )}
            />
            {errors.emergencyPhone && (
              <span className="block mt-1 text-xs text-red-600">
                {errors.emergencyPhone.message}
              </span>
            )}
          </label>

          <div className="block text-sm">
            <span className="block mb-2 font-medium text-slate-800">
              {t("relationship")}
            </span>
            <Controller
              name="emergencyRelation"
              control={control}
              render={({ field }) => (
                <RelationshipSelect
                  value={field.value || ""}
                  onChange={field.onChange}
                  placeholder={t("relationshipPlaceholder")}
                  hasError={!!errors.emergencyRelation}
                />
              )}
            />
            {errors.emergencyRelation && (
              <span className="block mt-1 text-xs text-red-600">
                {errors.emergencyRelation.message}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
