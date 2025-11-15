"use client";

import { FieldErrors, UseFormRegister } from "react-hook-form";

interface Captain {
  name: string;
  avatarUrl?: string;
  yearsExperience: number;
  crewCount: number;
  intro?: string;
}

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
  paymentMethod: "CARD" | "FPX" | "EWALLET" | "MOCK";
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
  participants: Array<{
    name: string;
    phone: string;
    isBooker?: boolean;
  }>;
  // Payment fields
  cardNumber?: string;
  cardExpiry?: string;
  cardCvv?: string;
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
  const displayName = captain?.name || charterName || "Your Captain";

  return (
    <section className="">
      <h2 className="mb-4 text-base font-semibold sm:text-lg">
        Say hello to captain
      </h2>
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
                {captain.yearsExperience} years experience • {captain.crewCount}{" "}
                crew
              </p>
            )}
          </div>
          <p className="p-4 mb-4 text-sm border rounded-b-xl rounded-tr-xl bg-gradient-to-br from-blue-50/50 to-cyan-50/50 border-black/10">
            Hello, welcome to {charterName}. Thanks for your interest! Let me
            know who’ll be joining the trip, what fish you’re aiming to catch,
            and any special requests — I’ll make sure everything’s ready for
            you.
          </p>
        </div>
      </div>

      {/* Message Input */}
      <div>
        <label className="block text-slate-800">
          <textarea
            {...register("note")}
            placeholder={`Introduce yourself to ${
              displayName.split(" ")[0]
            }. Share your fishing experience, what you hope to catch, or any special requests...`}
            rows={4}
            className={`w-full px-4 py-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent transition-shadow ${
              errors.note ? "border-red-500" : "border-black/10"
            }`}
          />
        </label>
        {errors.note && (
          <p className="mt-1 text-xs text-red-500">{errors.note.message}</p>
        )}
        <p className="mt-2 text-xs text-gray-500">
          This message will be sent to the captain with your booking request.
        </p>
      </div>
    </section>
  );
}
