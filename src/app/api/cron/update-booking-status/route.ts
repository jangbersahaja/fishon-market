/**
 * Booking Status Update Cron Job
 *
 * API route to automatically update booking statuses.
 * Should be called periodically (e.g., every 5-15 minutes) by:
 * - Vercel Cron (recommended for production)
 * - External cron service (e.g., cron-job.org)
 * - Manual trigger for testing
 *
 * Security: Protected by CRON_SECRET environment variable
 *
 * Example Vercel Cron configuration in vercel.json:
 * Schedule runs every 15 minutes to update booking statuses
 */

import { updateAllBookingStatuses } from "@/lib/jobs/booking-status-updater";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60; // Allow up to 60 seconds for the job

export async function GET(request: NextRequest) {
  try {
    // Security: Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // In production, require CRON_SECRET
    if (process.env.NODE_ENV === "production") {
      if (!cronSecret) {
        console.error("❌ CRON_SECRET not configured");
        return NextResponse.json(
          { error: "Server configuration error" },
          { status: 500 }
        );
      }

      if (authHeader !== `Bearer ${cronSecret}`) {
        console.warn("⚠️ Unauthorized cron attempt");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Run the status update job
    const results = await updateAllBookingStatuses();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error("❌ Error in booking status update cron:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
