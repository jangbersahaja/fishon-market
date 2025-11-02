import { prisma } from "@/lib/database/prisma";
import { AlertCircle, Calendar, Clock } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BookingStatusSelect } from "./BookingStatusSelect";

export default async function BookingTestsPage() {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    redirect("/");
  }

  // Fetch all test bookings (guest bookings with email containing "test" or "dev")
  const testBookings = await prisma.booking.findMany({
    where: {
      OR: [
        { guestEmail: { contains: "test", mode: "insensitive" } },
        { guestEmail: { contains: "dev", mode: "insensitive" } },
        { guestEmail: { contains: "angler", mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  async function createTestBooking(formData: FormData) {
    "use server";

    const status = formData.get("status") as string;
    const hoursToExpire = parseInt(formData.get("hoursToExpire") as string);

    // Use specific charter and trip IDs for testing
    const TEST_CHARTER_ID = "cmgbtc2cz0009uyrk10sbsuko";
    const TEST_TRIP_ID = "cmgzckllf000buy42r1my55nl";

    const expiresAt = new Date(Date.now() + hoursToExpire * 60 * 60 * 1000);

    // Normalize date to UTC midnight (required for conflict detection)
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const normalizedDate = new Date(
      Date.UTC(
        futureDate.getUTCFullYear(),
        futureDate.getUTCMonth(),
        futureDate.getUTCDate()
      )
    );

    await prisma.booking.create({
      data: {
        charterId: TEST_CHARTER_ID,
        tripId: TEST_TRIP_ID,
        userId: null,
        guestEmail: `test-${Date.now()}@example.com`,
        guestFirstName: "Test",
        guestLastName: "User",
        emailVerified: true,
        date: normalizedDate, // 7 days from now, normalized to UTC midnight
        startTime: "08:00",
        days: 1,
        guests: { adults: 2, children: 0 },
        tripPrice: 450.0,
        finalPrice: 450.0,
        status: status as any,
        expiresAt,
        captainDecisionAt: status === "APPROVED" ? new Date() : null,
      },
    });

    revalidatePath("/dev/booking-tests");
  }

  async function updateBookingExpiry(formData: FormData) {
    "use server";

    const bookingId = formData.get("bookingId") as string;
    const hoursToExpire = parseInt(formData.get("hoursToExpire") as string);

    const expiresAt = new Date(Date.now() + hoursToExpire * 60 * 60 * 1000);

    await prisma.booking.update({
      where: { id: bookingId },
      data: { expiresAt },
    });

    revalidatePath("/dev/booking-tests");
  }

  async function updateBookingStatus(formData: FormData) {
    "use server";

    const bookingId = formData.get("bookingId") as string;
    const status = formData.get("status") as string;

    const updates: any = { status };

    // If changing to APPROVED, set captainDecisionAt
    if (status === "APPROVED") {
      updates.captainDecisionAt = new Date();
      // Set 48h expiration for APPROVED bookings
      updates.expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    }

    // If changing to PAID, set paidAt
    if (status === "PAID") {
      updates.paidAt = new Date();
      updates.expiresAt = null; // PAID bookings don't expire
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: updates,
    });

    revalidatePath("/dev/booking-tests");
  }

  async function deleteTestBooking(formData: FormData) {
    "use server";

    const bookingId = formData.get("bookingId") as string;

    await prisma.booking.delete({
      where: { id: bookingId },
    });

    revalidatePath("/dev/booking-tests");
  }

  async function expireBookingsNow() {
    "use server";

    // This simulates the cron job that runs in production
    // Expire PENDING bookings past expiresAt
    // Expire APPROVED bookings past expiresAt
    const now = new Date();

    const result = await prisma.booking.updateMany({
      where: {
        OR: [
          { status: "PENDING", expiresAt: { lte: now } },
          { status: "APPROVED", expiresAt: { lte: now } },
        ],
      },
      data: {
        status: "EXPIRED",
      },
    });

    console.log(`✅ Manually expired ${result.count} bookings`);
    revalidatePath("/dev/booking-tests");
  }

  async function deleteAllTestBookings() {
    "use server";

    await prisma.booking.deleteMany({
      where: {
        OR: [
          { guestEmail: { contains: "test", mode: "insensitive" } },
          { guestEmail: { contains: "dev", mode: "insensitive" } },
          { guestEmail: { contains: "angler", mode: "insensitive" } },
        ],
      },
    });

    revalidatePath("/dev/booking-tests");
  }

  const getTimeUntilExpiry = (expiresAt: Date | null) => {
    if (!expiresAt) return null;
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (diff < 0) {
      return { text: "Expired", color: "text-red-600", expired: true };
    } else if (hours < 1) {
      return { text: `${minutes}m`, color: "text-red-600", expired: false };
    } else if (hours < 6) {
      return {
        text: `${hours}h ${minutes}m`,
        color: "text-orange-600",
        expired: false,
      };
    } else if (hours < 24) {
      return { text: `${hours}h`, color: "text-yellow-600", expired: false };
    } else {
      const days = Math.floor(hours / 24);
      return {
        text: `${days}d ${hours % 24}h`,
        color: "text-green-600",
        expired: false,
      };
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="px-4 py-8 mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Booking Testing Dashboard
              </h1>
              <p className="mt-2 text-gray-600">
                Test booking expiration flows and status changes without waiting
              </p>
            </div>
            <div className="px-4 py-2 text-sm font-medium text-orange-700 bg-orange-100 border border-orange-200 rounded-lg">
              🚧 Development Only
            </div>
          </div>
        </div>

        {/* Charter Info Banner */}
        <div className="p-4 mb-8 border border-blue-200 rounded-lg bg-blue-50">
          <div className="flex items-start gap-3">
            <div className="text-sm text-blue-800">
              <p className="font-medium">📋 Test Bookings Configuration</p>
              <p className="mt-1">
                All test bookings use Charter ID:{" "}
                <code className="px-1 py-0.5 bg-blue-100 rounded">
                  cmgbtc2cz0009uyrk10sbsuko
                </code>{" "}
                and Trip ID:{" "}
                <code className="px-1 py-0.5 bg-blue-100 rounded">
                  cmgzckllf000buy42r1my55nl
                </code>
              </p>
              <p className="mt-1">
                Bookings are created as guest bookings with test email
                addresses.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Create PENDING Booking (Near Expiry) */}
          <form
            action={createTestBooking}
            className="p-6 bg-white border rounded-lg shadow-sm"
          >
            <input type="hidden" name="status" value="PENDING" />
            <input type="hidden" name="hoursToExpire" value="0.5" />
            <h3 className="mb-2 text-sm font-semibold text-gray-900">
              Create PENDING (30m)
            </h3>
            <p className="mb-4 text-xs text-gray-600">
              Test PENDING expiration at 12h threshold
            </p>
            <button
              type="submit"
              className="w-full px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700"
            >
              Create Booking
            </button>
          </form>

          {/* Create APPROVED Booking (Near Expiry) */}
          <form
            action={createTestBooking}
            className="p-6 bg-white border rounded-lg shadow-sm"
          >
            <input type="hidden" name="status" value="APPROVED" />
            <input type="hidden" name="hoursToExpire" value="1" />
            <h3 className="mb-2 text-sm font-semibold text-gray-900">
              Create APPROVED (1h)
            </h3>
            <p className="mb-4 text-xs text-gray-600">
              Test APPROVED expiration at 48h threshold
            </p>
            <button
              type="submit"
              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Create Booking
            </button>
          </form>

          {/* Create APPROVED Booking (Urgent) */}
          <form
            action={createTestBooking}
            className="p-6 bg-white border rounded-lg shadow-sm"
          >
            <input type="hidden" name="status" value="APPROVED" />
            <input type="hidden" name="hoursToExpire" value="5" />
            <h3 className="mb-2 text-sm font-semibold text-gray-900">
              Create APPROVED (5h)
            </h3>
            <p className="mb-4 text-xs text-gray-600">
              Test urgent reminder threshold (&lt;6h)
            </p>
            <button
              type="submit"
              className="w-full px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700"
            >
              Create Booking
            </button>
          </form>

          {/* Expire Bookings Now */}
          <form
            action={expireBookingsNow}
            className="p-6 bg-white border border-purple-200 rounded-lg shadow-sm"
          >
            <h3 className="mb-2 text-sm font-semibold text-gray-900">
              Expire Bookings Now
            </h3>
            <p className="mb-4 text-xs text-gray-600">
              Manually run expiration check (simulates cron job)
            </p>
            <button
              type="submit"
              className="w-full px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
            >
              Run Expiration
            </button>
          </form>

          {/* Delete All Test Bookings */}
          <form
            action={deleteAllTestBookings}
            className="p-6 bg-white border border-red-200 rounded-lg shadow-sm"
          >
            <h3 className="mb-2 text-sm font-semibold text-gray-900">
              Clear All Tests
            </h3>
            <p className="mb-4 text-xs text-gray-600">
              Delete all test bookings to start fresh
            </p>
            <button
              type="submit"
              className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
            >
              Delete All
            </button>
          </form>
        </div>

        {/* Test Scenarios Guide */}
        <div className="p-6 mb-8 border border-blue-200 rounded-lg bg-blue-50">
          <h2 className="mb-4 text-lg font-semibold text-blue-900">
            📋 Testing Scenarios
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-blue-800">
                1. PENDING → EXPIRED Flow
              </h3>
              <ul className="space-y-1 text-sm text-blue-700">
                <li>• Create PENDING booking with short expiry</li>
                <li>• Visit booking detail page</li>
                <li>• Should show BookingExpiredScreen (PENDING type)</li>
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-blue-800">
                2. APPROVED → EXPIRED Flow
              </h3>
              <ul className="space-y-1 text-sm text-blue-700">
                <li>• Create APPROVED booking with short expiry</li>
                <li>• Visit payment page</li>
                <li>• Should show BookingExpiredScreen (APPROVED type)</li>
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-blue-800">
                3. Date Conflict Detection
              </h3>
              <ul className="space-y-1 text-sm text-blue-700">
                <li>• Create APPROVED booking</li>
                <li>• Change another booking to PAID (same date/time)</li>
                <li>• Visit payment page for APPROVED booking</li>
                <li>• Should show DateNoLongerAvailableScreen</li>
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-blue-800">
                4. Countdown Timer Testing
              </h3>
              <ul className="space-y-1 text-sm text-blue-700">
                <li>• Create bookings with various expiry times</li>
                <li>
                  • Check urgency levels: low (green), medium (yellow), high
                  (red)
                </li>
                <li>• Verify countdown updates every second</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Test Bookings Table */}
        <div className="overflow-hidden bg-white border rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">
              Test Bookings ({testBookings.length})
            </h2>
          </div>

          {testBookings.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-gray-400" />
              <p className="mt-4 text-gray-600">No test bookings found</p>
              <p className="mt-2 text-sm text-gray-500">
                Create a test booking using the quick actions above
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">Booking</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Time to Expiry</th>
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-6 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {testBookings.map((booking) => {
                    const timeInfo = getTimeUntilExpiry(booking.expiresAt);
                    return (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900">
                              Test Booking
                            </div>
                            <div className="text-xs text-gray-500">
                              {booking.id.slice(0, 8)}...
                            </div>
                            <div className="text-xs text-gray-500">
                              {booking.guestEmail}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <BookingStatusSelect
                            bookingId={booking.id}
                            currentStatus={booking.status}
                            updateBookingStatus={updateBookingStatus}
                          />
                        </td>
                        <td className="px-6 py-4">
                          {timeInfo ? (
                            <div className="flex items-center gap-2">
                              <Clock className={`h-4 w-4 ${timeInfo.color}`} />
                              <span className={`font-medium ${timeInfo.color}`}>
                                {timeInfo.text}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">No expiry</span>
                          )}
                          {booking.expiresAt && (
                            <div className="mt-1 text-xs text-gray-500">
                              {new Date(booking.expiresAt).toLocaleString(
                                "en-MY",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  day: "numeric",
                                  month: "short",
                                }
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            {new Date(booking.date).toLocaleDateString(
                              "en-MY",
                              {
                                day: "numeric",
                                month: "short",
                              }
                            )}
                            {booking.startTime && (
                              <span className="text-xs">
                                @ {booking.startTime}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {/* Set Expiry Time */}
                            <form
                              action={updateBookingExpiry}
                              className="flex items-center gap-1"
                            >
                              <input
                                type="hidden"
                                name="bookingId"
                                value={booking.id}
                              />
                              <select
                                name="hoursToExpire"
                                className="px-2 py-1 text-xs border rounded"
                                defaultValue="1"
                              >
                                <option value="-1">Expired</option>
                                <option value="0.25">15m</option>
                                <option value="0.5">30m</option>
                                <option value="1">1h</option>
                                <option value="5">5h</option>
                                <option value="12">12h</option>
                                <option value="24">24h</option>
                                <option value="48">48h</option>
                              </select>
                              <button
                                type="submit"
                                className="px-2 py-1 text-xs text-white bg-indigo-600 rounded hover:bg-indigo-700"
                              >
                                Set
                              </button>
                            </form>

                            {/* View Links */}
                            <a
                              href={`/book/confirm?id=${booking.id}`}
                              target="_blank"
                              className="px-2 py-1 text-xs text-blue-600 hover:underline"
                            >
                              Detail
                            </a>
                            {booking.status === "APPROVED" && (
                              <a
                                href={`/book/payment/${booking.id}`}
                                target="_blank"
                                className="px-2 py-1 text-xs text-green-600 hover:underline"
                              >
                                Payment
                              </a>
                            )}

                            {/* Delete */}
                            <form action={deleteTestBooking}>
                              <input
                                type="hidden"
                                name="bookingId"
                                value={booking.id}
                              />
                              <button
                                type="submit"
                                className="px-2 py-1 text-xs text-red-600 hover:underline"
                              >
                                Delete
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Testing Tips */}
        <div className="p-6 mt-8 border border-green-200 rounded-lg bg-green-50">
          <h2 className="mb-4 text-lg font-semibold text-green-900">
            💡 Testing Tips
          </h2>
          <ul className="space-y-2 text-sm text-green-800">
            <li>
              <strong>Use multiple browser tabs:</strong> Open the
              detail/payment page in one tab and this dashboard in another to
              see real-time updates
            </li>
            <li>
              <strong>Test different time thresholds:</strong> Create bookings
              with various expiry times to test all urgency levels
            </li>
            <li>
              <strong>Simulate conflicts:</strong> Create multiple bookings for
              the same date/time to test conflict detection
            </li>
            <li>
              <strong>Check countdown accuracy:</strong> Watch the countdown
              timer on booking cards to verify it updates correctly
            </li>
            <li>
              <strong>Test expired bookings:</strong> Set expiry to negative
              time (-1h) to immediately test expired state
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
