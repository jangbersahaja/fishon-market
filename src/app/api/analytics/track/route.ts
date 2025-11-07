/**
 * Public Analytics Tracking Endpoint
 *
 * POST /api/analytics/track
 *
 * Records analytics events from client-side.
 * No authentication required - this is for public tracking.
 */

import {
  detectTrafficSource,
  hashIpAddress,
  trackEvent,
} from "@/lib/analytics-service";
import type { AnalyticsEventType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

// Rate limiting map (in-memory - use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

// Cleanup old rate limit records every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      if (now > record.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  },
  5 * 60 * 1000
);

const VALID_EVENT_TYPES: AnalyticsEventType[] = [
  "PROFILE_VIEW",
  "CHARTER_VIEW",
  "CHARTER_SEARCH",
  "PHOTO_VIEW",
  "VIDEO_VIEW",
  "CONTACT_CLICK",
  "BOOKING_STARTED",
  "BOOKING_SUBMITTED",
  "REVIEW_VIEW",
  "SHARE_CLICKED",
];

export async function POST(req: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // Rate limit: 100 requests per minute per IP
    if (!checkRateLimit(ip, 100, 60000)) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const body = await req.json();

    // Validate event type
    if (!body.eventType || !VALID_EVENT_TYPES.includes(body.eventType)) {
      return NextResponse.json(
        { error: "Invalid event type" },
        { status: 400 }
      );
    }

    // Get referrer and user agent
    const referrer = req.headers.get("referer") || body.referrer || "";
    const userAgent = req.headers.get("user-agent") || "";

    // Detect traffic source if not provided
    const source = body.source || detectTrafficSource(referrer);

    // Hash IP for privacy
    const hashedIp = hashIpAddress(ip);

    // Track the event
    await trackEvent({
      eventType: body.eventType,
      charterId: body.charterId,
      ownerId: body.ownerId,
      userId: body.userId,
      sessionId: body.sessionId,
      metadata: body.metadata,
      referrer: referrer.substring(0, 500), // Limit length
      source,
      userAgent: userAgent.substring(0, 500), // Limit length
      ipAddress: hashedIp,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Analytics API] Track error:", error);

    // Don't expose internal errors
    return NextResponse.json(
      { error: "Failed to track event" },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
