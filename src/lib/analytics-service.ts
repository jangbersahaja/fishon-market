/**
 * Analytics Service
 *
 * Tracks user engagement events in fishon-market for captain analytics.
 * Events are stored in AnalyticsEvent table and displayed in fishon-captain dashboard.
 */

import { prisma } from "@/lib/database/prisma";
import type { AnalyticsEventType } from "@prisma/client";

interface TrackEventParams {
  eventType: AnalyticsEventType;
  charterId?: string;
  ownerId?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  referrer?: string;
  source?: string;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Track an analytics event
 *
 * @param params - Event parameters
 * @returns Promise<void>
 *
 * @example
 * ```typescript
 * await trackEvent({
 *   eventType: 'CHARTER_VIEW',
 *   charterId: 'charter_123',
 *   sessionId: getSessionId(),
 *   source: 'search',
 *   referrer: document.referrer,
 * });
 * ```
 */
export async function trackEvent(params: TrackEventParams): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        eventType: params.eventType,
        charterId: params.charterId,
        ownerId: params.ownerId,
        userId: params.userId,
        sessionId: params.sessionId,
        metadata: params.metadata as any, // Type assertion for Prisma JsonValue
        referrer: params.referrer,
        source: params.source,
        userAgent: params.userAgent,
        ipAddress: params.ipAddress,
      },
    });
  } catch (error) {
    // Log error but don't throw - analytics shouldn't break main flow
    console.error("[Analytics] Failed to track event:", error);
  }
}

/**
 * Get charter-specific analytics
 *
 * @param charterId - Charter ID from fishon-captain
 * @param period - Time period (7d, 30d, 90d, 1y)
 * @returns Charter analytics with views and engagement metrics
 */
export async function getCharterAnalytics(
  charterId: string,
  period: string = "30d"
) {
  const daysMap: Record<string, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "1y": 365,
  };
  const days = daysMap[period] || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const events = await prisma.analyticsEvent.findMany({
    where: {
      charterId,
      createdAt: { gte: startDate },
    },
    select: {
      eventType: true,
      sessionId: true,
      userId: true,
      createdAt: true,
      source: true,
    },
  });

  const charterViews = events.filter(
    (e) => e.eventType === "CHARTER_VIEW"
  ).length;
  const photoViews = events.filter((e) => e.eventType === "PHOTO_VIEW").length;
  const videoViews = events.filter((e) => e.eventType === "VIDEO_VIEW").length;
  const contactClicks = events.filter(
    (e) => e.eventType === "CONTACT_CLICK"
  ).length;
  const bookingStarts = events.filter(
    (e) => e.eventType === "BOOKING_STARTED"
  ).length;
  const bookingSubmits = events.filter(
    (e) => e.eventType === "BOOKING_SUBMITTED"
  ).length;

  const uniqueVisitors = new Set(
    events.map((e) => e.userId || e.sessionId).filter(Boolean)
  ).size;

  const conversionRate = charterViews > 0 ? bookingSubmits / charterViews : 0;

  // Group by date
  const dateGroups = events.reduce(
    (acc, event) => {
      const date = event.createdAt.toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = { views: 0, bookings: 0 };
      }
      if (event.eventType === "CHARTER_VIEW") {
        acc[date].views++;
      }
      if (event.eventType === "BOOKING_SUBMITTED") {
        acc[date].bookings++;
      }
      return acc;
    },
    {} as Record<string, { views: number; bookings: number }>
  );

  const timeSeries = Object.entries(dateGroups)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Traffic sources
  const sources = events.reduce(
    (acc, event) => {
      const source = event.source || "direct";
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    views: {
      total: charterViews,
      last30Days: charterViews, // Already filtered by period
      uniqueVisitors,
    },
    engagement: {
      photoViews,
      videoViews,
      contactClicks,
      bookingStarts,
    },
    bookings: {
      total: bookingSubmits,
      conversionRate,
    },
    timeSeries,
    sources,
  };
}

/**
 * Hash IP address for privacy
 * Uses simple hash function - replace with crypto hash in production
 */
export function hashIpAddress(ip: string): string {
  // Simple hash - in production, use crypto.createHash
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * Generate or retrieve session ID for anonymous tracking
 * Should be called client-side and stored in localStorage
 */
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";

  const STORAGE_KEY = "fishon_session_id";
  let sessionId = localStorage.getItem(STORAGE_KEY);

  if (!sessionId) {
    // Generate random session ID
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    localStorage.setItem(STORAGE_KEY, sessionId);
  }

  return sessionId;
}

/**
 * Detect traffic source from referrer
 */
export function detectTrafficSource(referrer: string): string {
  if (!referrer) return "direct";

  const url = new URL(referrer);
  const hostname = url.hostname.toLowerCase();

  // Search engines
  if (hostname.includes("google")) return "search";
  if (hostname.includes("bing")) return "search";
  if (hostname.includes("yahoo")) return "search";
  if (hostname.includes("duckduckgo")) return "search";

  // Social media
  if (hostname.includes("facebook")) return "social";
  if (hostname.includes("instagram")) return "social";
  if (hostname.includes("twitter")) return "social";
  if (hostname.includes("tiktok")) return "social";
  if (hostname.includes("linkedin")) return "social";

  // If it's from fishon domains, it's internal
  if (hostname.includes("fishon")) return "internal";

  // Everything else is referral
  return "referral";
}
