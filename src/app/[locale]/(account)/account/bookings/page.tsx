import { BookingsClient } from "@/components/account/BookingsClient";
import { BookingStatusGuide } from "@/components/account/BookingStatusGuide";
import { auth } from "@/lib/auth/auth";
import { getUserBookings } from "@/lib/services/booking-service";
import { canReviewBooking } from "@/lib/services/review-service";
import { getLocale, setRequestLocale } from "next-intl/server";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { Suspense } from "react";

// Note: With cacheComponents, dynamic rendering is automatic when using auth()

type RouteParams = Promise<{ locale: string }>;

async function BookingsContent({
  paramLocale,
  userId,
}: {
  paramLocale: string;
  userId: string;
}) {
  // Fetch all user bookings
  const bookings = await getUserBookings(userId);

  // Check review eligibility for all bookings on the server
  const reviewEligibility = await Promise.all(
    bookings.map(async (booking) => {
      const result = await canReviewBooking(booking.id, userId);
      return {
        bookingId: booking.id,
        canReview: result.canReview,
      };
    })
  );

  const eligibilityRecord = Object.fromEntries(
    reviewEligibility.map((item) => [item.bookingId, item.canReview])
  );

  return (
    <>
      <BookingStatusGuide />
      <BookingsClient
        bookings={bookings}
        reviewEligibility={eligibilityRecord}
      />
    </>
  );
}

function BookingsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="w-full h-40 bg-gray-200 rounded animate-pulse" />
      <div className="w-full h-64 bg-gray-200 rounded animate-pulse" />
    </div>
  );
}

export default async function BookingsPage({
  params,
}: {
  params: RouteParams;
}) {
  noStore();

  const { locale: paramLocale } = await params;
  setRequestLocale(paramLocale);

  const session = await auth();

  if (!session?.user?.id) {
    const locale = await getLocale();
    redirect(`/${locale}/login?next=/${locale}/account/bookings`);
  }

  const userId = session.user.id;

  return (
    <div className="space-y-6">
      <Suspense fallback={<BookingsSkeleton />}>
        <BookingsContent paramLocale={paramLocale} userId={userId} />
      </Suspense>
    </div>
  );
}
