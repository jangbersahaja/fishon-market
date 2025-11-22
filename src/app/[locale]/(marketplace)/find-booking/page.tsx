"use client";

import { useLocale } from "next-intl";
import { FindBookingForm } from "./FindBookingForm";

export default function FindBookingPage() {
  const locale = useLocale();
  return (
    <div className="min-h-screen py-12 bg-gray-50">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Find Your Booking
            </h1>
            <p className="mt-3 text-lg text-gray-600">
              Enter the email and phone number you used when booking to view
              your trip details
            </p>
          </div>

          {/* Form Card */}
          <div className="overflow-hidden bg-white shadow-sm rounded-2xl">
            <div className="p-6 sm:p-8">
              <FindBookingForm />
            </div>
          </div>

          {/* Help Text */}
          <div className="p-6 mt-6 border border-blue-200 rounded-lg bg-blue-50">
            <h2 className="mb-2 text-sm font-semibold text-blue-900">
              💡 Tips for finding your booking
            </h2>
            <ul className="space-y-1 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>
                  Use the same email address you provided during checkout
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>Phone number is optional but helps narrow results</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>
                  Check your email for a confirmation link if you can&apos;t
                  find your booking
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>
                  <a
                    href={`/${locale}/register`}
                    className="font-medium underline hover:text-blue-600"
                  >
                    Create an account
                  </a>{" "}
                  to easily track all your bookings
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
