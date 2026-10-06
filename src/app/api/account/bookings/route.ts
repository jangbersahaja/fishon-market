import { auth } from "@/lib/auth/auth";
import {
  getUserBookings,
  getUserBookingsPaginated,
} from "@/lib/services/booking-service";
import { connection, NextResponse } from "next/server";

export async function GET(req: Request) {
  await connection();
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters for filters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const pageParam = searchParams.get("page");
    const pageSizeParam = searchParams.get("pageSize");

    const filters: any = {};

    if (status && status !== "all") {
      filters.status = status;
    }

    if (search) {
      filters.searchTerm = search;
    }

    // Pagination is opt-in: only when page or pageSize is supplied. Otherwise
    // return the full list in the legacy { bookings } shape (unchanged for
    // existing web consumers).
    if (pageParam !== null || pageSizeParam !== null) {
      const page = Number.parseInt(pageParam ?? "1", 10);
      const pageSize = Number.parseInt(pageSizeParam ?? "20", 10);
      const result = await getUserBookingsPaginated(
        session.user.id,
        page,
        pageSize,
        filters
      );
      return NextResponse.json(result, { status: 200 });
    }

    // Fetch bookings (legacy, unpaginated)
    const bookings = await getUserBookings(session.user.id, filters);

    return NextResponse.json({ bookings }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
