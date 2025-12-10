"use client";

import { ReviewModal } from "@/components/ratings";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Star } from "lucide-react";
import { useState } from "react";

interface ReviewableCharterCardProps {
  booking: {
    id: string;
    charterId: string;
    charterName: string;
    tripName: string;
    location: string;
    date: Date;
  };
}

export function ReviewableCharterCard({ booking }: ReviewableCharterCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="p-6 transition-shadow bg-white border border-gray-200 rounded-lg hover:shadow-md">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              {booking.charterName}
            </h3>
            <p className="text-sm text-gray-600">{booking.tripName}</p>
          </div>
          <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-amber-800 bg-amber-100 border border-amber-200 rounded-full">
            Ready to Review
          </span>
        </div>

        {/* Trip Details */}
        <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>
              Trip: {new Date(booking.date).toLocaleDateString()}
            </span>
          </div>
          <span className="text-gray-400">•</span>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{booking.location}</span>
          </div>
        </div>

        {/* Review CTA */}
        <div className="pt-4 border-t border-gray-200">
          <p className="mb-3 text-sm text-gray-600">
            Share your experience to help other anglers make informed decisions
          </p>
          <Button
            className="w-full bg-amber-500 hover:bg-amber-600"
            onClick={() => setIsModalOpen(true)}
          >
            <Star className="w-4 h-4 mr-2" />
            Write Review
          </Button>
        </div>
      </div>

      {/* Review Modal */}
      <ReviewModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          // Refresh the page to show updated state
          window.location.reload();
        }}
        bookingId={booking.id}
        charterName={booking.charterName}
        tripDate={booking.date}
        location={booking.location}
      />
    </>
  );
}
