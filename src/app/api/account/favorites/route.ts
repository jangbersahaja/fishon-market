import { auth } from "@/lib/auth/auth";
import {
  addFavorite,
  getUserFavorites,
  removeFavoriteByCharterId,
} from "@/lib/services/favorite-service";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/account/favorites
 * List all user favorites
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const favorites = await getUserFavorites(session.user.id);

    return NextResponse.json({ favorites });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json(
      { error: "Failed to fetch favorites" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/account/favorites
 * Add a charter to favorites
 *
 * Body: {
 *   captainCharterId: string;
 *   charterName: string;
 *   location: string;
 *   charterData?: any;
 *   notes?: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { captainCharterId, charterName, location, charterData, notes } =
      body;

    if (!captainCharterId || !charterName || !location) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const favorite = await addFavorite(
      session.user.id,
      captainCharterId,
      charterName,
      location,
      charterData,
      notes
    );

    return NextResponse.json({ favorite }, { status: 201 });
  } catch (error: any) {
    console.error("Error adding favorite:", error);

    // Check for unique constraint violation (duplicate favorite)
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Charter already in favorites" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to add favorite" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/account/favorites?charterId=xxx
 * Remove a charter from favorites by charter ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const charterId = searchParams.get("charterId");

    if (!charterId) {
      return NextResponse.json(
        { error: "charterId query parameter required" },
        { status: 400 }
      );
    }

    await removeFavoriteByCharterId(session.user.id, charterId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing favorite:", error);
    return NextResponse.json(
      { error: "Failed to remove favorite" },
      { status: 500 }
    );
  }
}
