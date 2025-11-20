"use client";

import { useBookingStorage } from "@/hooks/useBookingStorage";
import { Calendar, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * CheckYourBookings - Navbar component for guest users
 *
 * Shows number of recent bookings stored in localStorage
 * Opens modal with list of bookings and links to details
 */
export function CheckYourBookings() {
  const { bookings } = useBookingStorage();
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const t = useTranslations("nav");

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || bookings.length === 0) {
    return null;
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 text-sm font-medium underline-offset-4 decoration-white/40 hover:underline hover:decoration-white"
        aria-label={t("myBookings")}
      >
        <Calendar className="w-4 h-4" />
        <span>{t("myBookings")}</span>
        {bookings.length > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-[#ec2227] bg-white rounded-full">
            {bookings.length}
          </span>
        )}
      </button>

      {/* Modal */}
      {showModal && (
        <CheckYourBookingsModal
          bookings={bookings}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

interface CheckYourBookingsModalProps {
  bookings: Array<{
    id: string;
    charterName: string;
    date: string;
    status: string;
    createdAt: number;
  }>;
  onClose: () => void;
}

function CheckYourBookingsModal({
  bookings,
  onClose,
}: CheckYourBookingsModalProps) {
  const [mounted, setMounted] = useState(false);
  const t = useTranslations("booking");

  // Ensure we're only rendering on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Sort by most recent first
  const sortedBookings = [...bookings].sort(
    (a, b) => b.createdAt - a.createdAt
  );

  if (!mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-lg overflow-hidden shadow-xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t("yourBookings")}</h2>
            <p className="mt-1 text-sm text-gray-600">
              {bookings.length} {bookings.length === 1 ? t("bookingsSingular") : t("bookingsPlural")}{" "}
              {t("storedLocally")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Bookings List */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-3">
            {sortedBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">
              📌 {t("createAccount")}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/register"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-center text-white bg-[#ec2227] rounded-lg hover:bg-[#d01f24] transition-colors"
              >
                {t("createFreeAccount")}
              </Link>
              <Link
                href="/find-booking"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t("searchByEmail")}
              </Link>
            </div>
            <p className="text-xs text-center text-gray-500">
              {t("bookingsStoredDays")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

function BookingCard({
  booking,
}: {
  booking: {
    id: string;
    charterName: string;
    date: string;
    status: string;
    createdAt: number;
  };
}) {
  const statusColors = {
    PENDING: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-blue-100 text-blue-800",
    PAID: "bg-green-100 text-green-800",
    COMPLETED: "bg-gray-100 text-gray-800",
    CANCELLED: "bg-red-100 text-red-800",
    REJECTED: "bg-red-100 text-red-800",
    EXPIRED: "bg-gray-100 text-gray-800",
  };

  const statusColor =
    statusColors[booking.status as keyof typeof statusColors] ||
    "bg-gray-100 text-gray-800";

  const formattedDate = new Date(booking.date).toLocaleDateString("en-MY", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Link
      href={`/book/confirm?id=${booking.id}`}
      className="block p-4 transition-shadow bg-white border border-gray-200 rounded-lg hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            {booking.charterName}
          </h3>
          <div className="flex flex-col gap-1 mt-1 sm:flex-row sm:items-center sm:gap-3">
            <p className="text-sm text-gray-600">
              <Calendar className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
              {formattedDate}
            </p>
            <span
              className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${statusColor}`}
            >
              {booking.status}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </Link>
  );
}
