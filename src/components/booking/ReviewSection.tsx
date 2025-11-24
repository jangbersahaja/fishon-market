"use client";

import ReviewButton from "@/components/account/ReviewButton";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface ReviewSectionProps {
  bookingId: string;
  userId?: string | null;
  charterName: string;
  tripDate: Date;
  location: string;
}

export function ReviewSection({
  bookingId,
  userId,
  charterName,
  tripDate,
  location,
}: ReviewSectionProps) {
  const t = useTranslations("booking.review");

  // Show guest message if user is not logged in
  if (!userId) {
    return (
      <div className="p-3 bg-white border border-gray-200 rounded-lg sm:p-5">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          {t("leaveReview")}
        </h3>
        <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
          <p className="mb-3 text-sm text-blue-900">{t("guestMessage")}</p>
          <div className="flex gap-2">
            <Button variant="default" asChild className="flex-1">
              <Link href={`/register?next=/book/confirm?id=${bookingId}`}>
                {t("createAccount")}
              </Link>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link href={`/login?next=/book/confirm?id=${bookingId}`}>
                {t("signIn")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // For logged-in users, show the ReviewButton component
  // It handles checking eligibility, existing reviews, and opening the modal
  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        {t("yourReview")}
      </h3>
      <p className="mb-4 text-sm text-gray-600">{t("description")}</p>
      <ReviewButton
        bookingId={bookingId}
        charterName={charterName}
        tripDate={tripDate}
        location={location}
      />
    </div>
  );
}
