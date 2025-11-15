"use client";

import { Shield } from "lucide-react";
import { FieldErrors, UseFormRegister } from "react-hook-form";

interface BookingFormData {
  charterId: string;
  tripId: string;
  date: string;
  days: number;
  adults: number;
  children: number;
  startTime?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  note?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
  participants: Array<{
    name: string;
    phone: string;
    isBooker?: boolean;
  }>;
  paymentMethod: "CARD" | "FPX" | "EWALLET";
}

interface EmergencyContactCardProps {
  register: UseFormRegister<BookingFormData>;
  errors: FieldErrors<BookingFormData>;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
}

export default function EmergencyContactCard({
  register,
  errors,
}: EmergencyContactCardProps) {
  return (
    <section className="pb-5 border-b border-black/10">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-gray-600" />
          <h2 className="text-base font-semibold sm:text-lg">
            Emergency Contact
          </h2>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          Provide an emergency contact for safety purposes (optional but
          recommended).
        </p>
      </div>

      <div className="space-y-4">
        <label className="block text-sm">
          <span className="block mb-2 font-medium text-slate-800">
            Contact Name
          </span>
          <input
            type="text"
            {...register("emergencyName")}
            placeholder="Full name"
            className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent transition-shadow ${
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
              Contact Phone
            </span>
            <input
              type="tel"
              {...register("emergencyPhone")}
              placeholder="+60 12-345 6789"
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent transition-shadow ${
                errors.emergencyPhone ? "border-red-500" : "border-black/10"
              }`}
            />
            {errors.emergencyPhone && (
              <span className="block mt-1 text-xs text-red-600">
                {errors.emergencyPhone.message}
              </span>
            )}
          </label>

          <label className="block text-sm">
            <span className="block mb-2 font-medium text-slate-800">
              Relationship
            </span>
            <input
              type="text"
              {...register("emergencyRelation")}
              placeholder="e.g., Spouse, Parent, Sibling"
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent transition-shadow ${
                errors.emergencyRelation ? "border-red-500" : "border-black/10"
              }`}
            />
            {errors.emergencyRelation && (
              <span className="block mt-1 text-xs text-red-600">
                {errors.emergencyRelation.message}
              </span>
            )}
          </label>
        </div>
      </div>
    </section>
  );
}
