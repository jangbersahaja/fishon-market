import { BookingsClient } from "@/components/account/BookingsClient";
import { BookingStatusGuide } from "@/components/account/BookingStatusGuide";
import { auth } from "@/lib/auth/auth";
import { getUserBookings } from "@/lib/services/booking-service";
import { canReviewBooking } from "@/lib/services/review-service";
import { redirect } from "next/navigation";

// Force dynamic rendering to ensure revalidation works
export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?next=/account/bookings");
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
