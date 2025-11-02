import { auth } from "@/lib/auth/auth";
import { getUserBookings } from "@/lib/services/booking-service";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters for filters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const filters: any = {};

    if (status && status !== "all") {
      filters.status = status;
    }

    if (search) {
      filters.searchTerm = search;
    }

    // Fetch bookings
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
