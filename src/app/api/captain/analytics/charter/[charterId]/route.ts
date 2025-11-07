/**
 * Charter Analytics Endpoint
 *
 * GET /api/captain/analytics/charter/[charterId]?period=30d
 *
 * Returns detailed analytics for a specific charter.
 * Authentication required via API key or session.
 */

import { getCharterAnalytics } from "@/lib/analytics-service";
import { NextRequest, NextResponse } from "next/server";

// TODO: Replace with actual authentication when fishon-market has auth
function authenticateRequest(req: NextRequest): boolean {
  const apiKey = req.headers.get("x-api-key");
  const validApiKey = process.env.CAPTAIN_API_KEY;

  if (!validApiKey) {
    console.warn("[Charter Analytics API] CAPTAIN_API_KEY not configured");
    // Allow in development if no API key is set
    return process.env.NODE_ENV === "development";
  }

  return apiKey === validApiKey;
}

type TimePeriod = "7d" | "30d" | "90d" | "1y";

function isValidPeriod(period: string): period is TimePeriod {
  return ["7d", "30d", "90d", "1y"].includes(period);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ charterId: string }> }
) {
  try {
    // Authenticate request
    if (!authenticateRequest(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get charterId from params (await because Next.js 15 uses async params)
    const { charterId } = await params;

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "30d";

    // Validate charterId
    if (!charterId) {
      return NextResponse.json(
        { error: "charterId is required" },
        { status: 400 }
      );
    }

    // Validate period
    if (!isValidPeriod(period)) {
      return NextResponse.json(
        { error: "Invalid period. Must be: 7d, 30d, 90d, or 1y" },
        { status: 400 }
      );
    }

    // Fetch analytics
    const analytics = await getCharterAnalytics(charterId, period);

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("[Charter Analytics API] Error:", error);

    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS preflight (for fishon-captain to call this API)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": process.env.FISHON_CAPTAIN_URL || "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key",
    },
  });
}
