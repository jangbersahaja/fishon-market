import { getCharters } from "@/lib/services/charter-service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 300; // Cache for 5 minutes

/**
 * GET /api/charters
 * Returns all active charters for client-side use (e.g., search suggestions)
 */
export async function GET() {
  try {
    const charters = await getCharters();

    // Return only essential fields for suggestions to reduce payload
    const lightweightCharters = charters.map((c) => ({
      id: c.id,
      name: c.name,
      location: c.location,
      address: c.address,
    }));

    return NextResponse.json(lightweightCharters, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Error fetching charters for API:", error);
    return NextResponse.json(
      { error: "Failed to fetch charters" },
      { status: 500 }
    );
  }
}
