"use client";

import { ReviewModal } from "@/components/ratings";
import { Button } from "@/components/ui/button";
import { Loader2, Star } from "lucide-react";
import { useEffect, useState } from "react";

interface ReviewButtonProps {
  bookingId: string;
  charterName: string;
  tripDate: Date;
  location: string;
}

interface ReviewEligibility {
  canReview: boolean;
  reason?: string;
  existingReview?: {
    id: string;
  };
}

export default function ReviewButton({
  bookingId,
  charterName,
  tripDate,
  location,
}: ReviewButtonProps) {
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const checkEligibility = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/account/reviews/check/${bookingId}`);
      if (response.ok) {
        const data = await response.json();
        setEligibility(data);
      }
    } catch (error) {
      console.error("Failed to check review eligibility:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkEligibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  if (isLoading) {
    return (
      <Button variant="outline" className="w-full" disabled>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Checking...
      </Button>
    );
  }

  if (!eligibility) {
    return null;
  }

  // If already reviewed, show "View Review" button
  if (eligibility.existingReview) {
    return (
      <Button variant="outline" className="w-full" asChild>
        <a href={`/account/reviews#review-${eligibility.existingReview.id}`}>
          <Star className="w-4 h-4 mr-2 fill-amber-400 stroke-amber-400" />
          View Your Review
        </a>
      </Button>
    );
  }

  // If cannot review, show disabled button with tooltip
  if (!eligibility.canReview) {
    return (
      <div className="relative group">
        <Button variant="outline" className="w-full" disabled>
          <Star className="w-4 h-4 mr-2" />
          Write Review
        </Button>
        {eligibility.reason && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            {eligibility.reason}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
          </div>
        )}
      </div>
    );
  }

  // Can review - show active button
  return (
    <>
      <Button
        variant="default"
        className="w-full bg-amber-500 hover:bg-amber-600"
        onClick={() => setIsModalOpen(true)}
      >
        <Star className="w-4 h-4 mr-2" />
        Write Review
      </Button>

      <ReviewModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          // Refresh eligibility after modal closes
          checkEligibility();
        }}
        bookingId={bookingId}
        charterName={charterName}
        tripDate={tripDate}
        location={location}
      />
    </>
  );
}
