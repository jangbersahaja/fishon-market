import { BookingsClient } from "@/components/account/BookingsClient";
import { BookingStatusGuide } from "@/components/account/BookingStatusGuide";
import { auth } from "@/lib/auth/auth";
import { getUserBookings } from "@/lib/services/booking-service";
import { canReviewBooking } from "@/lib/services/review-service";
import { getLocale, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

// Note: With cacheComponents, dynamic rendering is automatic when using auth()

type RouteParams = Promise<{ locale: string }>;

export default async function BookingsPage({
  params,
}: {
  params: RouteParams;
}) {
  const { locale: paramLocale } = await params;
  setRequestLocale(paramLocale);
  
  const session = await auth();

  if (!session?.user?.id) {
    const locale = await getLocale();
    redirect(`/${locale}/login?next=/${locale}/account/bookings`);
  }

  const userId = session.user.id;

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

  // Create a plain object for serialization (Map can't be serialized)
  const reviewEligibilityRecord = Object.fromEntries(
    reviewEligibility.map((r) => [r.bookingId, r.canReview])
  );

  return (
    <div className="space-y-8">
      <BookingsClient
        bookings={bookings}
        reviewEligibility={reviewEligibilityRecord}
      />

      {/* Status Guide at bottom */}
      <BookingStatusGuide />
    </div>
  );
}
