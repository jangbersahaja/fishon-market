import { closeExpiredConversations } from "@/lib/jobs/close-conversations-job";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const maxDuration = 60;

/**
 * POST /api/cron/close-conversations
 *
 * Closes conversations 24 hours after trip completion.
 * Requires CRON_SECRET in Authorization header (production only).
 *
 * Protected by CRON_SECRET environment variable.
 * Call via: curl -X POST http://localhost:3000/api/cron/close-conversations \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET"
 *
 * Scheduled via Vercel Cron or external service (e.g., QStash, n8n)
 */
export async function POST(request: NextRequest) {
  return handleCronRequest(request);
}

/**
 * GET /api/cron/close-conversations
 * Also supports GET for testing/manual triggers
 */
export async function GET(request: NextRequest) {
  return handleCronRequest(request);
}

async function handleCronRequest(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authorization check
    if (process.env.NODE_ENV === "production") {
      const authHeader = request.headers.get("Authorization");
      const expectedSecret = process.env.CRON_SECRET;

      if (!expectedSecret) {
        console.error("cron_close_conversations_missing_secret");
        return NextResponse.json(
          { error: "CRON_SECRET not configured" },
          { status: 500 }
        );
      }

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.warn("cron_close_conversations_missing_auth");
        return NextResponse.json(
          { error: "Missing or invalid Authorization header" },
          { status: 401 }
        );
      }

      const providedSecret = authHeader.slice(7); // Remove "Bearer " prefix

      if (providedSecret !== expectedSecret) {
        console.warn("cron_close_conversations_invalid_secret");
        return NextResponse.json(
          { error: "Invalid CRON_SECRET" },
          { status: 401 }
        );
      }
    }

    console.log("cron_close_conversations_start");

    // Run the job (non-blocking)
    const results = await closeExpiredConversations();

    const duration = Date.now() - startTime;

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      duration,
      results,
    };

    console.log("cron_close_conversations_success", response);

    return NextResponse.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;

    console.error("cron_close_conversations_error", {
      error: error instanceof Error ? error.message : "Unknown error",
      duration,
    });

    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        duration,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
