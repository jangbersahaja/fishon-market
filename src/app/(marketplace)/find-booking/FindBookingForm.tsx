"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle, Calendar, Loader2, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface Booking {
  id: string;
  charterName: string;
  date: string;
  status: string;
  guestFirstName?: string;
  guestLastName?: string;
}

export function FindBookingForm() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Booking[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResults([]);

    if (!email) {
      setError("Email is required");
      return;
    }

    setLoading(true);

    try {
      const params = new URLSearchParams({ email });
      if (phone) params.append("phone", phone);

      const res = await fetch(`/api/bookings/search?${params.toString()}`);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to search bookings");
      }

      const data = await res.json();
      setResults(data.bookings || []);

      if (!data.bookings || data.bookings.length === 0) {
        setError("No bookings found with this email/phone combination");
      }
    } catch (err: any) {
      setError(err.message || "Failed to search bookings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Input */}
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email Address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
            <input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full py-3 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        {/* Phone Input */}
        <div className="space-y-2">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone Number <span className="text-gray-400">(Optional)</span>
          </label>
          <div className="relative">
            <Phone className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
            <input
              id="phone"
              type="tel"
              placeholder="+60123456789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full py-3 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <p className="text-xs text-gray-500">
            Adding your phone number helps narrow down results
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 border border-red-200 rounded-lg bg-red-50">
            <AlertCircle className="flex-shrink-0 w-4 h-4 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={loading || !email}
          className="w-full py-3 text-base font-semibold"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            "Search Bookings"
          )}
        </Button>
      </form>

      {/* Results */}
      {results.length > 0 && (
        <div className="pt-6 mt-6 space-y-3 border-t">
          <h3 className="font-semibold text-gray-900">
            Found {results.length} {results.length === 1 ? "booking" : "bookings"}
          </h3>
          <div className="space-y-2">
            {results.map((booking) => (
              <BookingResultCard key={booking.id} booking={booking} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BookingResultCard({ booking }: { booking: Booking }) {
  const statusColors = {
    PENDING: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-blue-100 text-blue-800",
    PAID: "bg-green-100 text-green-800",
    COMPLETED: "bg-gray-100 text-gray-800",
    CANCELLED: "bg-red-100 text-red-800",
    REJECTED: "bg-red-100 text-red-800",
    EXPIRED: "bg-gray-100 text-gray-800",
  };

  const statusColor = statusColors[booking.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800";

  const formattedDate = new Date(booking.date).toLocaleDateString("en-MY", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Link
      href={`/book/confirm?id=${booking.id}`}
      className="block p-4 transition-shadow bg-white border border-gray-200 rounded-lg hover:shadow-md hover:border-gray-300"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 truncate">
            {booking.charterName}
          </h4>
          <div className="flex flex-col gap-1 mt-1 sm:flex-row sm:items-center sm:gap-3">
            <p className="text-sm text-gray-600">
              <Calendar className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
              {formattedDate}
            </p>
            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${statusColor}`}>
              {booking.status}
            </span>
          </div>
          {booking.guestFirstName && (
            <p className="mt-1 text-xs text-gray-500">
              Booked by: {booking.guestFirstName} {booking.guestLastName}
            </p>
          )}
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
