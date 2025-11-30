import {
  BookingCard,
  EmptyState,
  PromoCodesCard,
  QuickStats,
} from "@/components/account";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth/auth";
import {
  getBookingStats,
  getUserBookings,
} from "@/lib/services/booking-service";
import { getLocale } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function OverviewPage() {
  const locale = await getLocale();
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/${locale}/login?next=/${locale}/account/overview`);
  }

  // Fetch booking statistics
  const stats = await getBookingStats(session.user.id);

  // Fetch recent bookings (last 5)
  const allBookings = await getUserBookings(session.user.id);
  const recentBookings = allBookings.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 bg-white border border-gray-200 rounded-lg">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Welcome back, {session.user.name || "Angler"}!
        </h1>
        <p className="text-gray-600">
          Here&apos;s what&apos;s happening with your fishing charters.
        </p>
      </div>

      {/* Promo Codes */}
      <PromoCodesCard />

      {/* Quick Stats */}
      <QuickStats
        stats={{
          total: stats.total,
          pending: stats.pending,
          awaitingPayment: stats.awaitingPayment,
          paymentAuthorized: stats.paymentAuthorized,
          paid: stats.paid,
        }}
      />

      {/* Recent Activity */}
      <div className="p-6 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Bookings
          </h2>
          {recentBookings.length > 0 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${locale}/account/bookings`}>View All</Link>
            </Button>
          )}
        </div>

        {recentBookings.length === 0 ? (
          <EmptyState
            icon="inbox"
            title="No bookings yet"
            description="Start exploring and book your first fishing charter!"
            action={{
              label: "Browse Charters",
              href: `/${locale}/search`,
            }}
          />
        ) : (
          <div className="space-y-4">
            {recentBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} locale={locale} />
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="p-6 bg-white border border-gray-200 rounded-lg">
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            Need Help?
          </h3>
          <p className="mb-4 text-sm text-gray-600">
            Have questions about your bookings or need assistance?
          </p>
          <Button variant="outline" asChild>
            <Link href={`/${locale}/support/help`}>Contact Support</Link>
          </Button>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-lg">
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            Explore More
          </h3>
          <p className="mb-4 text-sm text-gray-600">
            Discover new fishing charters and experiences.
          </p>
          <Button asChild>
            <Link href={`/${locale}/search`}>Browse Charters</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
